"""ML-based risk scoring engine using scikit-learn."""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from typing import Dict, List
import os
from datetime import datetime

try:
    from prometheus_client import Gauge, Counter
    _prom_available = True
except Exception:
    # Fallback no-op classes when prometheus_client isn't installed
    _prom_available = False
    class _NoopMetric:
        def __init__(self, *a, **k):
            pass
        def set(self, *a, **k):
            pass
        def inc(self, *a, **k):
            pass
    Gauge = _NoopMetric
    Counter = _NoopMetric

from .model_evaluation import (
    generate_synthetic_fraud,
    holdout_split,
    precision_recall_per_label,
    compute_roc_auc,
    compute_confusion_matrix,
    false_positive_cost,
    check_retrain_trigger,
    k_fold_cross_validation,
    drift_detection_permutation,
    save_metrics,
    plot_roc_curve,
    send_alert_webhook,
    roc_curve_points,
)
from .evaluation_suite import evaluation_suite

# Prometheus metrics
_g_roc_auc = Gauge("ml_engine_roc_auc", "Latest ROC AUC for model")
_g_fp_cost = Gauge("ml_engine_fp_cost", "Latest false positive cost")
_c_retrain = Counter("ml_engine_retrain_total", "Number of times retraining was triggered")


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

    def evaluate(self, n_samples: int = 1000, holdout_frac: float = 0.2, cost_fp: float = 1.0, thresholds: Dict[str, float] | None = None, alert_webhook: str | None = None) -> Dict:
        """Generate synthetic data, evaluate model on holdout, compute metrics and decide retrain."""
        if thresholds is None:
            thresholds = {"roc_auc": 0.8}
        X, y = generate_synthetic_fraud(n_samples=n_samples, n_features=5, fraud_rate=0.02, random_state=42)
        (X_train, y_train), (X_test, y_test) = holdout_split(X, y, holdout_frac=holdout_frac, random_state=42)

        # Cross-validation on train
        try:
            cv_scores = k_fold_cross_validation(self._model, X_train, y_train, k=3, scoring="roc_auc")
            cv_mean = float(cv_scores.mean())
        except Exception:
            cv_scores = []
            cv_mean = 0.0

        # Ensure model is trained on train set for evaluation
        self._model.fit(X_train, y_train)

        y_pred = self._model.predict(X_test)
        y_scores = self._model.predict_proba(X_test)[:, 1]

        pr = precision_recall_per_label(y_test, y_pred)
        roc = compute_roc_auc(y_test, y_scores)
        cm_arr = compute_confusion_matrix(y_test, y_pred)
        cm = cm_arr.tolist()
        fp_cost = false_positive_cost(y_test, y_pred, cost_fp=cost_fp)

        # Simple drift check comparing CV scores and test scores
        drift = drift_detection_permutation(np.asarray(cv_scores), np.asarray(y_scores), n_permutations=200, alpha=0.01)

        metrics_summary = {
            "precision_recall": pr,
            "roc_auc": roc,
            "confusion_matrix": cm,
            "roc_curve": roc_curve_points(y_test, y_scores),
            "false_positive_cost": fp_cost,
            "cv_mean_roc_auc": cv_mean,
            "drift_test": drift,
            "suite": evaluation_suite.latest()["summary"] if evaluation_suite._latest else None,
        }

        retrain_needed = check_retrain_trigger({"roc_auc": roc, "cv_mean_roc_auc": cv_mean}, thresholds, drift_flag=drift.get("drift", False))
        if retrain_needed:
            # retrain on full synthetic dataset
            self._model.fit(X, y)
            _c_retrain.inc()

        # Persist metrics and generate ROC plot
        metrics_dir = os.environ.get("AI_METRICS_DIR", "./metrics")
        saved_path = save_metrics(metrics_summary, out_dir=metrics_dir)
        try:
            roc_path = os.path.join(metrics_dir, f"roc_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.png")
            plot_roc_curve(y_test, y_scores, roc_path)
        except Exception:
            roc_path = None

        # Update Prometheus gauges
        try:
            _g_roc_auc.set(float(roc))
            _g_fp_cost.set(float(fp_cost))
        except Exception:
            pass

        # Send alert if configured
        alert_response = None
        if alert_webhook and retrain_needed:
            payload = {"event": "model_retrain_triggered", "metrics": metrics_summary}
            alert_response = send_alert_webhook(alert_webhook, payload)

        return {"metrics": metrics_summary, "retrained": bool(retrain_needed), "metrics_path": saved_path, "roc_path": roc_path, "alert_response": alert_response}

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
