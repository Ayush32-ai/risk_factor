"""ML-based risk scoring engine using scikit-learn."""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from typing import Dict, List


class RiskEngine:
    def __init__(self):
        self._model = GradientBoostingClassifier(n_estimators=50, random_state=42)
        self._trained = False
        self._train_synthetic()

    def _train_synthetic(self):
        np.random.seed(42)
        n = 5000
        X = np.column_stack([
            np.random.exponential(2, n),
            np.random.randint(1, 20, n),
            np.random.uniform(0, 1, n),
            np.random.poisson(3, n),
            np.random.uniform(0, 100, n),
        ])
        y = (
            (X[:, 0] > 3) |
            (X[:, 1] > 12) |
            (X[:, 2] > 0.7) |
            (X[:, 3] > 6) |
            (X[:, 4] > 75)
        ).astype(int)
        self._model.fit(X, y)
        self._trained = True

    def score_transaction(self, features: Dict[str, float]) -> Dict:
        X = np.array([[
            features.get("velocity", 1.0),
            features.get("linked_accounts", 1),
            features.get("device_risk", 0.0),
            features.get("merchant_connections", 1),
            features.get("amount_risk", 0.0),
        ]])
        prob = self._model.predict_proba(X)[0]
        risk_score = float(prob[1] * 100)
        return {
            "risk_score": round(risk_score, 1),
            "is_flagged": risk_score > 70,
            "factors": self._explain(features, risk_score),
        }

    def _explain(self, features: Dict, score: float) -> List[str]:
        factors = []
        if features.get("linked_accounts", 0) > 5:
            factors.append("High number of linked accounts")
        if features.get("device_risk", 0) > 0.6:
            factors.append("Suspicious device fingerprint pattern")
        if features.get("velocity", 0) > 3:
            factors.append("Abnormal transaction velocity")
        if features.get("merchant_connections", 0) > 4:
            factors.append("Multiple merchant connections in cluster")
        if not factors:
            factors.append("Within normal risk parameters" if score < 50 else "Elevated composite risk score")
        return factors


risk_engine = RiskEngine()
