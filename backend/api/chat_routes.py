from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from backend.db.database import get_db
from backend.retrieval.hybrid_retriever import HybridRetriever
from backend.retrieval.vector_retriever import VectorStore
from backend.llm.gemini_client import GeminiClient
from backend.agents import prompt_templates

router = APIRouter()
gemini_client = GeminiClient()

class ChatMessage(BaseModel):
    role: str  # user or model
    content: str

class ChatRequestSchema(BaseModel):
    message: str
    equipment_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

@router.post("")
def chat_wizard(data: ChatRequestSchema, db: Session = Depends(get_db), x_gemini_key: Optional[str] = Header(None)):
    """
    RAG-powered conversational assistant for multi-turn troubleshooting.
    Retrieves relevant manuals/SOPs/logs and invokes Gemini to answer queries with citations.
    """
    try:
        evidence_text = ""
        citations = []

        # 1. RAG Retrieval Step
        if data.equipment_id:
            # Context-bound to a specific asset
            retriever = HybridRetriever(db, api_key=x_gemini_key)
            evidence_pack = retriever.retrieve_evidence(
                equipment_id=data.equipment_id,
                query=data.message
            )
            evidence_text = retriever.format_evidence_for_prompt(evidence_pack)
            
            # Extract citation filenames and a short snippet of the retrieved chunk
            for doc in evidence_pack.get("documentation_chunks", []):
                citations.append({
                    "name": doc["document_name"],
                    "type": doc["document_type"],
                    "title": doc["title"],
                    "snippet": doc["text"][:220]  # First 220 chars of retrieved chunk text
                })
        else:
            # Generic/cross-plant query: Search vector store globally
            store = VectorStore(api_key=x_gemini_key)
            store.load()
            vector_results = store.search(data.message, top_k=4)
            
            prompt_lines = ["=== RETRIEVED GENERIC DOCUMENTATION ==="]
            for doc in vector_results:
                prompt_lines.append(f"Source: {doc['document_name']}")
                prompt_lines.append(doc["text"])
                prompt_lines.append("-" * 30)
                citations.append({
                    "name": doc["document_name"],
                    "type": doc["document_type"],
                    "title": doc["title"],
                    "snippet": doc["text"][:220]  # First 220 chars of retrieved chunk text
                })
            prompt_lines.append("=======================================")
            evidence_text = "\n".join(prompt_lines)

        # 2. Formulate the conversation history context for Gemini
        history_context = []
        for h in data.history:
            history_context.append(f"{'User' if h.role == 'user' else 'Assistant'}: {h.content}")
        
        history_str = "\n".join(history_context)

        # 3. Build system instruction and user prompt
        system_instruction = prompt_templates.CHAT_SYSTEM_PROMPT
        
        user_prompt = f"""
{evidence_text}

Conversation History:
{history_str}

User: {data.message}
Assistant:"""

        # 4. Generate response using request-scoped client if provided
        req_gemini_client = GeminiClient(api_key=x_gemini_key) if x_gemini_key else gemini_client
        response_text = req_gemini_client.generate_text(
            system_instruction=system_instruction,
            prompt=user_prompt
        )

        return {
            "response": response_text,
            "citations": citations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {e}")
