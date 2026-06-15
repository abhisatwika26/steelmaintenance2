import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
MODELS_DIR = DATA_DIR / "models"
PROCESSED_DIR = DATA_DIR / "processed"

# Database
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR}/maintenance.db")

# Load .env file manually if it exists in the root workspace
env_path = BASE_DIR / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    # Strip quotes if present
                    val = val.strip().strip("'\"")
                    os.environ[key.strip()] = val
        print("Config: Loaded environment variables from .env file.")
    except Exception as e:
        print(f"Config: Warning - Failed to parse .env file: {e}")

# Gemini API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# App Configuration
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
