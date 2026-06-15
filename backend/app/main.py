from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app import config

# Import routers
from backend.api.equipment_routes import router as equipment_router
from backend.api.alert_routes import router as alert_router
from backend.api.prediction_routes import router as prediction_router
from backend.api.chat_routes import router as chat_router
from backend.api.spares_routes import router as spares_router
from backend.api.report_routes import router as report_router
from backend.api.feedback_routes import router as feedback_router

app = FastAPI(
    title="Steel Plant Maintenance Cockpit API",
    description="Intelligent maintenance decision-support platform for steel manufacturing assets.",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(equipment_router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(alert_router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(prediction_router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(chat_router, prefix="/api/chat", tags=["Conversational Chat"])
app.include_router(spares_router, prefix="/api/spares", tags=["Spare Parts"])
app.include_router(report_router, prefix="/api/reports", tags=["Reports & Logbook"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["Feedback Loop"])

@app.on_event("startup")
def check_prerequisites():
    """
    Startup health check: warns if the RAG vector store index is missing.
    Without this file, the chat wizard and RCA flows return no document chunks,
    silently degrading quality. Run: python -m scripts.ingest_documents to fix.
    """
    vector_store_path = config.DATA_DIR / "processed" / "vector_store.pkl"
    if not vector_store_path.exists():
        print("\n" + "=" * 65)
        print("  ⚠️  WARNING: RAG Vector Store index NOT FOUND.")
        print(f"  Expected at: {vector_store_path}")
        print("  The chat wizard and RCA flows will return no document chunks.")
        print("  Fix by running:  python -m scripts.ingest_documents")
        print("=" * 65 + "\n")

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "Steel Plant Maintenance Cockpit Backend",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )
