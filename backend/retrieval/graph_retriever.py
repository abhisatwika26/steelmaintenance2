class GraphRetriever:
    def __init__(self):
        # In-memory graph nodes and edges representing:
        # FailureMode -> requires -> SparePart
        # FailureMode -> resolved_by -> SOP
        self.graph = {
            "FM-001": {
                "name": "Bearing Wear",
                "sop_slug": "SOP_bearing_replacement",
                "sop_title": "Bearing Replacement and Vibration Response",
                "required_parts": ["SP-BEAR-001", "SP-GREASE-001"],
                "symptoms": "rising vibration and abnormal bearing noise",
                "root_cause": "progressive bearing wear caused by lubrication degradation"
            },
            "FM-002": {
                "name": "Hydraulic Leakage",
                "sop_slug": "SOP_hydraulic_pump_overheating",
                "sop_title": "Hydraulic Pump Overheating and Pressure Loss",
                "required_parts": ["SP-SEAL-001", "SP-FILTER-001"],
                "symptoms": "pressure drop with increasing pump temperature",
                "root_cause": "seal wear or suction-side leakage reducing hydraulic pressure"
            },
            "FM-003": {
                "name": "Motor Overload",
                "sop_slug": "SOP_motor_overload_trip",
                "sop_title": "Motor Overload Trip Response",
                "required_parts": ["SP-CONTACTOR-001", "SP-FUSE-001"],
                "symptoms": "current spike and repeated overload trip",
                "root_cause": "mechanical load increase or phase imbalance causing motor overload"
            },
            "FM-004": {
                "name": "Cooling Flow Restriction",
                "sop_slug": "SOP_cooling_flow_drop",
                "sop_title": "Cooling Water Flow Drop Response",
                "required_parts": ["SP-FILTER-002", "SP-GASKET-001"],
                "symptoms": "temperature rise with reduced coolant flow",
                "root_cause": "cooling line blockage or pump strainer fouling"
            },
            "FM-005": {
                "name": "Gearbox Misalignment",
                "sop_slug": "SOP_gearbox_vibration_inspection",
                "sop_title": "Gearbox Vibration Inspection",
                "required_parts": ["SP-COUPLING-001", "SP-BOLT-001"],
                "symptoms": "high vibration during load changes",
                "root_cause": "coupling misalignment transferring shock load into gearbox bearings"
            },
            "FM-006": {
                "name": "Lubrication Failure",
                "sop_slug": "SOP_lubrication_failure_response",
                "sop_title": "Lubrication Failure Response",
                "required_parts": ["SP-OIL-001", "SP-FILTER-003"],
                "symptoms": "oil level drop with heat buildup",
                "root_cause": "low oil level or blocked lubrication line reducing film strength"
            }
        }

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
