from sqlalchemy.orm import Session
from backend.retrieval.sql_retriever import SQLRetriever
from backend.retrieval.graph_retriever import GraphRetriever
from backend.retrieval.vector_retriever import VectorStore

class HybridRetriever:
    def __init__(self, db: Session, api_key: str = None):
        self.sql_retriever = SQLRetriever(db)
        self.graph_retriever = GraphRetriever()
        self.vector_store = VectorStore(api_key=api_key)
        # Initialize VectorStore load (if index exists)
        self.vector_store.load()

    def retrieve_evidence(self, equipment_id: str, query: str = "", failure_code: str = "") -> dict:
        """
        Gathers structured history, inventory, graph relations, and unstructured text chunks.
        Returns:
            evidence_pack (dict)
        """
        # 1. Fetch structured history and specs from SQL
        history = self.sql_retriever.get_equipment_history(equipment_id)
        spares = self.sql_retriever.get_spares_status(equipment_id)

        # 2. Fetch graph relationships if a failure mode is suspected/identified
        graph_relations = {}
        if failure_code:
            graph_relations = self.graph_retriever.get_failure_mode_relations(failure_code)
        elif query:
            # Try to infer failure code from query terms
            inferred_code = self.graph_retriever.find_failure_code_by_name(query)
            if inferred_code:
                graph_relations = self.graph_retriever.get_failure_mode_relations(inferred_code)

        # 3. Fetch semantically relevant documentation chunks
        vector_results = []
        search_query = f"{equipment_id} {query}" if query else equipment_id
        if failure_code and failure_code in self.graph_retriever.graph:
            search_query += f" {self.graph_retriever.graph[failure_code]['name']}"
            
        vector_results = self.vector_store.search(search_query, top_k=4)

        return {
            "equipment_history": history,
            "spares_inventory": spares,
            "graph_relations": graph_relations,
            "documentation_chunks": vector_results
        }

    def format_evidence_for_prompt(self, evidence: dict) -> str:
        """
        Converts the retrieved evidence pack into a clean, markdown-formatted
        context string to be injected directly into LLM prompts.
        """
        hist = evidence["equipment_history"]
        spares = evidence["spares_inventory"]
        graph = evidence["graph_relations"]
        docs = evidence["documentation_chunks"]

        prompt_lines = []
        prompt_lines.append("=== RETRIEVED MAINTENANCE CONTEXT & EVIDENCE ===")
        
        # Equipment Metadata
        if "error" not in hist:
            prompt_lines.append(f"Asset: {hist['name']} ({hist['equipment_id']})")
            prompt_lines.append(f"Type: {hist['type']} | Area: {hist['area']} | Criticality: {hist['criticality']}")
            prompt_lines.append(f"Historical Failure Log Stats:")
            prompt_lines.append(f" - Corrective Maintenance Incidents: {hist['corrective_failures_count']}")
            prompt_lines.append(f" - Total Failures Downtime: {hist['total_maintenance_downtime_minutes']} minutes")
            prompt_lines.append("")
            
            # Latest Maintenance Logs
            if hist["maintenance_logs"]:
                prompt_lines.append("Latest Maintenance Logs:")
                for log in hist["maintenance_logs"][:3]:
                    prompt_lines.append(f" - Date: {log['date']} | Type: {log['type']} | Symptom: {log['symptom']}")
                    prompt_lines.append(f"   Action Taken: {log['action']}")
                    if log['notes']:
                        prompt_lines.append(f"   Tech Notes: {log['notes']}")
                prompt_lines.append("")
        
        # Graph Relations
        if graph:
            prompt_lines.append(f"Known Failure Mode Linkages ({graph['name']}):")
            prompt_lines.append(f" - Typical Symptoms: {graph['symptoms']}")
            prompt_lines.append(f" - Standard Root Cause: {graph['root_cause']}")
            prompt_lines.append(f" - Target SOP Document: {graph['sop_slug']}")
            prompt_lines.append(f" - Standard Required Spares: {', '.join(graph['required_parts'])}")
            prompt_lines.append("")

        # Spares Status
        if spares:
            prompt_lines.append("Compatible Spare Parts Inventory:")
            for sp in spares:
                prompt_lines.append(f" - {sp['part_name']} ({sp['part_id']}): Stock: {sp['stock']} (Min Req: {sp['min_stock_required']}) | Lead Time: {sp['lead_days']} days | Status: {sp['status']}")
            prompt_lines.append("")

        # Unstructured chunks
        if docs:
            prompt_lines.append("Relevant SOP and Manual Documentation Chunks:")
            for i, doc in enumerate(docs, 1):
                prompt_lines.append(f"Chunk {i} (Source: {doc['document_name']}, Similarity: {doc['similarity_score']:.2f}):")
                prompt_lines.append(doc["text"])
                prompt_lines.append("-" * 40)
            prompt_lines.append("")
            
        prompt_lines.append("=================================================")
        return "\n".join(prompt_lines)
