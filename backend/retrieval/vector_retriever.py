import os
import pickle
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from backend.app import config

class VectorStore:
    def __init__(self, api_key: str = None):
        self.vector_store_path = config.PROCESSED_DIR / "vector_store.pkl"
        self.chunks = []
        self.embeddings = None
        self.vectorizer = None
        self.use_gemini = False
        
        # Determine the API key to use
        self.api_key = api_key or config.GEMINI_API_KEY
        
        # Check if Gemini key is available
        if self.api_key:
            try:
                from google import genai
                self.genai_client = genai.Client(api_key=self.api_key)
                self.use_gemini = True
                print("VectorStore: Gemini API key detected. Using Gemini Embeddings.")
            except Exception as e:
                print(f"VectorStore: Failed to initialize Gemini client ({e}). Falling back to TF-IDF.")
                self.use_gemini = False
        else:
            print("VectorStore: No Gemini API key detected. Using local TF-IDF Vectorizer.")

    def save(self):
        config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        data = {
            "chunks": self.chunks,
            "embeddings": self.embeddings,
            "vectorizer": self.vectorizer,
            "use_gemini": self.use_gemini
        }
        with open(self.vector_store_path, "wb") as f:
            pickle.dump(data, f)
        print(f"VectorStore: Index saved successfully to {self.vector_store_path}")

    def load(self):
        if not self.vector_store_path.exists():
            print(f"VectorStore: No index found at {self.vector_store_path}. Please run ingestion script first.")
            return False
            
        try:
            with open(self.vector_store_path, "rb") as f:
                data = pickle.load(f)
            self.chunks = data["chunks"]
            self.embeddings = data["embeddings"]
            self.vectorizer = data.get("vectorizer")
            
            # Respect the saved embedding type in the pickle data
            self.use_gemini = data.get("use_gemini", False)
            if self.use_gemini and self.api_key:
                try:
                    from google import genai
                    self.genai_client = genai.Client(api_key=self.api_key)
                except Exception:
                    self.use_gemini = False
            else:
                self.use_gemini = False

                
            print(f"VectorStore: Index loaded successfully with {len(self.chunks)} chunks.")
            return True
        except Exception as e:
            print(f"VectorStore: Error loading index ({e})")
            return False

    def get_embedding(self, text: str) -> np.ndarray:
        """Computes embedding for a single text string."""
        if self.use_gemini:
            try:
                response = self.genai_client.models.embed_content(
                    model="gemini-embedding-2",
                    contents=text
                )
                # Handle response structure
                if response.embeddings:
                    return np.array(response.embeddings[0].values)
                elif hasattr(response, 'embedding') and response.embedding:
                    return np.array(response.embedding.values)
                else:
                    raise ValueError("Empty embedding response")
            except Exception as e:
                print(f"VectorStore: Gemini embedding call failed ({e}). Falling back to TF-IDF method.")
                # Fallback to local tf-idf mapping if remote call fails
                if self.vectorizer:
                    return self.vectorizer.transform([text]).toarray()[0]
                return np.zeros(128)
        else:
            if self.vectorizer:
                return self.vectorizer.transform([text]).toarray()[0]
            return np.zeros(128)

    def fit_and_save(self, chunks: list[dict]):
        """Fits TF-IDF vectorizer (if local) or retrieves Gemini embeddings and saves index."""
        self.chunks = chunks
        texts = [chunk["text"] for chunk in chunks]
        
        if self.use_gemini:
            try:
                from google.genai import types
                print(f"VectorStore: Requesting batch embeddings from Gemini for {len(texts)} chunks...")
                
                batch_size = 80
                all_embeddings = []
                for i in range(0, len(texts), batch_size):
                    batch_texts = texts[i : i + batch_size]
                    contents = [
                        types.Content(parts=[types.Part.from_text(text=t)]) for t in batch_texts
                    ]
                    response = self.genai_client.models.embed_content(
                        model="gemini-embedding-2",
                        contents=contents
                    )
                    
                    if hasattr(response, 'embeddings') and response.embeddings:
                        for emb in response.embeddings:
                            all_embeddings.append(np.array(emb.values))
                    else:
                        raise ValueError("No embeddings returned for batch.")
                        
                self.embeddings = np.array(all_embeddings)
                print("VectorStore: Gemini batch embeddings computed successfully.")
                self.save()
                return
            except Exception as e:
                print(f"VectorStore: Gemini batch embedding failed ({e}). Falling back to local TF-IDF.")
                self.use_gemini = False

                
        # TF-IDF Fallback (Run for all chunks if Gemini fails or is disabled)
        print("VectorStore: Fitting TF-IDF Vectorizer...")
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.embeddings = self.vectorizer.fit_transform(texts).toarray()
        self.save()

    def search(self, query: str, top_k: int = 4) -> list[dict]:
        """Performs cosine similarity search between query and indexed chunks."""
        if not self.chunks or self.embeddings is None:
            if not self.load():
                return []
                
        query_val = self.get_embedding(query)
        
        # Calculate cosine similarity
        similarities = []
        for i, emb in enumerate(self.embeddings):
            norm_a = np.linalg.norm(query_val)
            norm_b = np.linalg.norm(emb)
            if norm_a == 0 or norm_b == 0:
                sim = 0.0
            else:
                sim = float(np.dot(query_val, emb) / (norm_a * norm_b))
            similarities.append((sim, i))
            
        # Sort by similarity descending
        similarities.sort(key=lambda x: x[0], reverse=True)
        
        results = []
        for sim, idx in similarities[:top_k]:
            chunk = self.chunks[idx].copy()
            chunk["similarity_score"] = sim
            results.append(chunk)
            
        return results
