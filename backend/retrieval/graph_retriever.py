import json
from pathlib import Path

# Locate the failure modes JSON relative to this file's position in the package
_FAILURE_MODES_FILE = Path(__file__).resolve().parents[2] / "data" / "raw" / "failure_modes.json"

class GraphRetriever:
    def __init__(self):
        # Load failure mode graph from JSON file instead of hardcoding inline.
        # This makes the knowledge base extensible without code changes — add new
        # failure modes by editing data/raw/failure_modes.json directly.
        self.graph = {}
        try:
            if _FAILURE_MODES_FILE.exists():
                with open(_FAILURE_MODES_FILE, "r", encoding="utf-8") as f:
                    self.graph = json.load(f)
                print(f"GraphRetriever: Loaded {len(self.graph)} failure modes from {_FAILURE_MODES_FILE.name}")
            else:
                print(f"GraphRetriever: WARNING — failure_modes.json not found at {_FAILURE_MODES_FILE}. Graph retrieval will return empty results.")
        except Exception as e:
            print(f"GraphRetriever: ERROR loading failure_modes.json ({e}). Falling back to empty graph.")

    def get_failure_mode_relations(self, failure_code: str) -> dict:
        """
        Retrieves relational nodes for a given failure mode code (e.g. FM-001).
        """
        return self.graph.get(failure_code, {})

    def find_failure_code_by_name(self, name: str) -> str | None:
        """
        Helper to resolve a failure name (e.g. "Bearing Wear") to its graph code.
        """
        for code, details in self.graph.items():
            if name.lower() in details["name"].lower():
                return code
        return None

