"""Graph analysis for transaction networks."""

from typing import Dict, List, Optional


GRAPH_DATA = {
    "nodes": [
        {"id": "device-1", "type": "device", "label": "Device FP-7A3B", "riskScore": 78,
         "data": {"fingerprint": "FP-7A3B2C1D", "accountsLinked": 7}},
        {"id": "user-a", "type": "user", "label": "User A", "riskScore": 65,
         "data": {"email": "user.a@example.com", "createdAt": "2024-01-15"}},
        {"id": "user-b", "type": "user", "label": "User B", "riskScore": 72,
         "data": {"email": "user.b@example.com", "createdAt": "2024-02-20"}},
        {"id": "account-a", "type": "account", "label": "Account A", "riskScore": 81,
         "data": {"balance": 45000, "txCount": 234}},
        {"id": "account-b", "type": "account", "label": "Account B", "riskScore": 76,
         "data": {"balance": 32000, "txCount": 189}},
        {"id": "account-c", "type": "account", "label": "Account C", "riskScore": 88,
         "data": {"balance": 78000, "txCount": 412}},
        {"id": "merchant-1", "type": "merchant", "label": "Merchant XYZ", "riskScore": 45,
         "data": {"category": "E-commerce", "mrr": 2500000}},
        {"id": "refund-1", "type": "refund", "label": "Refund #R-4421", "riskScore": 93,
         "data": {"amount": 12500, "reason": "Product return"}},
    ],
    "edges": [
        {"id": "e1", "source": "device-1", "target": "user-a", "label": "uses"},
        {"id": "e2", "source": "device-1", "target": "user-b", "label": "uses"},
        {"id": "e3", "source": "user-a", "target": "account-a", "label": "owns"},
        {"id": "e4", "source": "user-b", "target": "account-b", "label": "owns"},
        {"id": "e5", "source": "account-a", "target": "merchant-1", "label": "paid"},
        {"id": "e6", "source": "account-b", "target": "merchant-1", "label": "paid"},
        {"id": "e7", "source": "merchant-1", "target": "refund-1", "label": "refunded"},
        {"id": "e8", "source": "refund-1", "target": "account-c", "label": "credited"},
    ],
}


class GraphAnalyzer:
    def get_network(self, network_id: str = "default") -> Dict:
        return GRAPH_DATA

    def investigate(self, network_id: str = "cluster-7a3b") -> Dict:
        return {
            "riskScore": 93,
            "networkId": network_id,
            "evidence": [
                {"type": "device", "description": "7 accounts share device fingerprint FP-7A3B2C1D", "severity": "critical"},
                {"type": "merchant", "description": "3 merchants connected to cluster", "severity": "high"},
                {"type": "timing", "description": "Transaction timing is abnormal (σ = 4.7× baseline)", "severity": "high"},
                {"type": "refund", "description": "Refund destination overlaps cluster (Account C)", "severity": "critical"},
                {"type": "density", "description": "Network density is 4.7× baseline", "severity": "high"},
            ],
            "aiAssessment": (
                "This pattern indicates a coordinated transaction network rather than "
                "independent customer activity. The shared device fingerprint across 7 accounts, "
                "combined with abnormal transaction timing and refund destination overlap, "
                "strongly suggests an organized fraud ring exploiting individual-transaction "
                "evaluation blind spots."
            ),
        }

    def compute_density(self, node_count: int, edge_count: int) -> float:
        if node_count <= 1:
            return 0.0
        max_edges = node_count * (node_count - 1) / 2
        return round(edge_count / max_edges, 3) if max_edges > 0 else 0.0


graph_analyzer = GraphAnalyzer()
