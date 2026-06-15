import os
import sys
from pathlib import Path

# Add project root to path so we can import from backend
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.app import config
from backend.retrieval.vector_retriever import VectorStore

def clean_block(text: str) -> str:
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())

def ingest_documents() -> None:
    print("Initializing document ingestion...")
    
    chunks = []
    
    # 1. Ingest Equipment Manuals
    manuals_dir = config.RAW_DIR / "manuals"
    if manuals_dir.exists():
        print("Processing Equipment Manuals...")
        for file in manuals_dir.glob("*.txt"):
            content = file.read_text(encoding="utf-8")
            blocks = content.split("\n\n")
            
            # The first block contains the header information
            header = clean_block(blocks[0])
            eq_name = "Unknown Equipment"
            for line in header.splitlines():
                if line.startswith("Equipment Manual:"):
                    eq_name = line.split(":", 1)[1].strip()
                    break
                    
            for idx, block in enumerate(blocks):
                cleaned = clean_block(block)
                if len(cleaned) < 30:
                    continue
                chunks.append({
                    "chunk_id": f"manual_{file.stem}_{idx}",
                    "document_name": file.name,
                    "document_type": "manual",
                    "title": f"Manual: {eq_name}",
                    "text": f"{header}\n\nSection:\n{cleaned}" if idx > 0 else cleaned
                })

    # 2. Ingest SOPs
    sops_dir = config.RAW_DIR / "sops"
    if sops_dir.exists():
        print("Processing Maintenance SOPs...")
        for file in sops_dir.glob("*.txt"):
            content = file.read_text(encoding="utf-8")
            blocks = content.split("\n\n")
            
            # First block is the title of the SOP
            title = clean_block(blocks[0])
            
            for idx, block in enumerate(blocks):
                cleaned = clean_block(block)
                if len(cleaned) < 30:
                    continue
                chunks.append({
                    "chunk_id": f"sop_{file.stem}_{idx}",
                    "document_name": file.name,
                    "document_type": "sop",
                    "title": f"SOP: {title}",
                    "text": f"SOP Title: {title}\n\n{cleaned}" if idx > 0 else cleaned
                })

    # 3. Ingest Failure Reports
    reports_dir = config.RAW_DIR / "failure_reports"
    if reports_dir.exists():
        print("Processing Historical Failure Reports...")
        for file in reports_dir.glob("*.txt"):
            content = file.read_text(encoding="utf-8")
            
            # For failure reports, the entire document is clean and cohesive,
            # so we keep it as a single chunk to preserve full case-history context.
            cleaned = clean_block(content)
            if len(cleaned) > 50:
                report_id = file.name.split("_", 1)[0]
                chunks.append({
                    "chunk_id": f"report_{file.stem}",
                    "document_name": file.name,
                    "document_type": "failure_report",
                    "title": f"Failure Report: {report_id}",
                    "text": cleaned
                })

    print(f"Total chunks prepared: {len(chunks)}")
    
    # Fit and save to vector store
    store = VectorStore()
    store.fit_and_save(chunks)
    print("Ingestion complete!")

if __name__ == "__main__":
    ingest_documents()
