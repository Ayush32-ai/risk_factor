"""ML-based risk scoring engine with comprehensive evaluation metrics."""

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from typing import Dict, List
import os
from datetime import datetime

from .model_evaluation import (
    generate_synthetic_fraud,
    holdout_split,
    precision_recall_per_label,
    compute_roc_auc,
    false_positive_cost,
    check_retrain_trigger,
    k_fold_cross_validation,
    drift_detection_permutation,
    save_metrics,
    plot_roc_curve,
    send_alert_webhook,
    roc_curve_points,
    generate_performance_report,
)
from .evaluation_suite import evaluation_suite, evaluate_model_comprehensive
from .chargeback_ml_enhanced import chargeback_ml_engine

# Prometheus metrics (optional)
try:
    from prometheus_client import Gauge, Counter
    _g_roc_auc = Gauge("ml_engine_roc_auc", "Latest ROC AUC")
    _g_precision = Gauge("ml_engine_precision", "Latest precision")
    _g_recall = Gauge("ml_engine_recall", "Latest recall")
    _c_predictions = Counter("ml_engine_predictions_total", "Total predictions")
except ImportError:
    class _DummyMetric:
        def set(self, *args): pass
        def inc(self, *args): pass
    _g_roc_auc = _g_precision = _g_recall = _c_predictions = _DummyMetric()


class RiskEngine:
    def __init__(self):
        self._model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self._trained = False
        self.model_name = "fraud_risk_scorer"
        self.prediction_history = []
        self._train_and_evaluate()

    def _train_and_evaluate(self):
        """Train model and perform comprehensive evaluation."""
        # Generate training data
        X, y = generate_synthetic_fraud(n_samples=5000, fraud_rate=0.03, random_state=42)
        (X_train, y_train), (X_test, y_test) = holdout_split(X, y, random_state=42)
        
        # Train model
        self._model.fit(X_train, y_train)
        self._trained = True
        
        # Evaluate performance
        y_pred = self._model.predict(X_test)
        y_scores = self._model.predict_proba(X_test)[:, 1]
        
        # Calculate comprehensive metrics
        pr_metrics = precision_recall_per_label(y_test, y_pred)
        roc_auc = compute_roc_auc(y_test, y_scores)
        fp_cost = false_positive_cost(y_test, y_pred, cost_fp=10.0, cost_fn=100.0)
        
        # Cross validation
        cv_scores = k_fold_cross_validation(self._model, X_train, y_train, k=5, scoring="roc_auc")
        
        metrics = {
            "precision_recall": pr_metrics,
            "roc_auc": roc_auc,
            "false_positive_cost": fp_cost,
            "cv_scores": cv_scores.tolist(),
            "cv_mean": float(cv_scores.mean()),
            "cv_std": float(cv_scores.std()),
            "roc_curve": roc_curve_points(y_test, y_scores),
            "model_type": "fraud_risk_classifier"
        }
        
        # Record evaluation
        eval_result = evaluate_model_comprehensive(
            self.model_name, metrics, len(y_test), 0.03
        )
        
        # Update Prometheus metrics
        _g_roc_auc.set(roc_auc)
        _g_precision.set(pr_metrics["fraud"]["precision"])
        _g_recall.set(pr_metrics["fraud"]["recall"])
        
        print(f"✅ {self.model_name} trained - ROC AUC: {roc_auc:.3f}, Precision: {pr_metrics['fraud']['precision']:.3f}")

    def score_transaction(self, features: Dict[str, float]) -> Dict:
        """Score transaction with detailed risk analysis."""
        if not self._trained:
            return {"error": "Model not trained"}
        
        X = np.array([[
            features.get("velocity", 1.0),
            features.get("linked_accounts", 1),
            features.get("device_risk", 0.0),
            features.get("merchant_connections", 1),
            features.get("amount_risk", 0.0),
        ]])
        
        prob = self._model.predict_proba(X)[0]
        risk_score = float(prob[1] * 100)
        
        # Track prediction
        _c_predictions.inc()
        prediction = {
            "risk_score": round(risk_score, 1),
            "is_flagged": risk_score > 70,
            "confidence": float(max(prob)),
            "factors": self._explain(features, risk_score),
            "timestamp": datetime.now().isoformat()
        }
        
        self.prediction_history.append(prediction)
        return prediction

    def _explain(self, features: Dict, score: float) -> List[str]:
        """Generate risk factor explanations."""
        factors = []
        if features.get("linked_accounts", 0) > 5:
            factors.append(f"High account linkage: {features['linked_accounts']} accounts")
        if features.get("device_risk", 0) > 0.6:
            factors.append(f"Suspicious device pattern: {features['device_risk']:.1%} risk")
        if features.get("velocity", 0) > 3:
            factors.append(f"Abnormal velocity: {features['velocity']:.1f}x baseline")
        if features.get("merchant_connections", 0) > 4:
            factors.append(f"Multiple merchant connections: {features['merchant_connections']}")
        if not factors:
            factors.append("Low risk - normal transaction patterns")
        return factors

    def evaluate_comprehensive(self, n_samples: int = 1000) -> Dict:
        """Run comprehensive model evaluation."""
        # Generate fresh test data
        X, y = generate_synthetic_fraud(n_samples=n_samples, fraud_rate=0.02, random_state=None)
        (X_train, y_train), (X_test, y_test) = holdout_split(X, y, random_state=None)
        
        # Retrain on new data
        self._model.fit(X_train, y_train)
        
        # Predict
        y_pred = self._model.predict(X_test)
        y_scores = self._model.predict_proba(X_test)[:, 1]
        
        # Comprehensive metrics
        pr_metrics = precision_recall_per_label(y_test, y_pred)
        roc_auc = compute_roc_auc(y_test, y_scores)
        fp_cost = false_positive_cost(y_test, y_pred, cost_fp=25.0, cost_fn=500.0)
        
        # Drift detection (compare with recent predictions)
        if len(self.prediction_history) > 50:
            recent_scores = [p["risk_score"]/100 for p in self.prediction_history[-50:]]
            drift_result = drift_detection_permutation(
                np.array(recent_scores), y_scores, n_permutations=100
            )
        else:
            drift_result = {"drift": False, "p_value": 1.0}
        
        metrics = {
            "precision_recall": pr_metrics,
            "roc_auc": roc_auc,
            "false_positive_cost": fp_cost,
            "roc_curve": roc_curve_points(y_test, y_scores),
            "drift_test": drift_result,
            "model_type": "fraud_risk_evaluation"
        }
        
        # Check if retraining needed
        thresholds = {"roc_auc": 0.85}
        retrain_needed = check_retrain_trigger(
            {"roc_auc": roc_auc}, thresholds, drift_result.get("drift", False)
        )
        
        # Save metrics
        metrics_dir = os.environ.get("AI_METRICS_DIR", "./metrics")
        saved_path = save_metrics(metrics, out_dir=metrics_dir)
        
        # Generate report
        report = generate_performance_report(metrics)
        
        # Record in evaluation suite
        eval_result = evaluate_model_comprehensive(
            f"{self.model_name}_comprehensive", metrics, len(y_test), 0.02
        )
        
        return {
            "metrics": metrics,
            "evaluation": eval_result,
            "retrain_needed": retrain_needed,
            "report": report,
            "metrics_saved": saved_path,
            "prediction_count": len(self.prediction_history)
        }

    def get_model_stats(self) -> Dict:
        """Get current model statistics."""
        latest_eval = evaluation_suite.get_latest()
        return {
            "model_name": self.model_name,
            "trained": self._trained,
            "predictions_made": len(self.prediction_history),
            "latest_evaluation": latest_eval,
            "recent_performance": {
                "avg_risk_score": np.mean([p["risk_score"] for p in self.prediction_history[-100:]]) if self.prediction_history else 0,
                "flagged_rate": np.mean([p["is_flagged"] for p in self.prediction_history[-100:]]) if self.prediction_history else 0,
                "avg_confidence": np.mean([p["confidence"] for p in self.prediction_history[-100:]]) if self.prediction_history else 0,
            }
        }


# Enhanced ML system with multiple engines
class MLRiskManager:
    """Comprehensive ML risk management system."""
    
    def __init__(self):
        self.risk_engine = RiskEngine()
        self.chargeback_engine = chargeback_ml_engine
        self.model_registry = {
            "fraud_risk": self.risk_engine,
            "chargeback_evidence": self.chargeback_engine,
        }
    
    def evaluate_all_models(self) -> Dict:
        """Evaluate all models in the system."""
        results = {}
        
        # Evaluate risk engine
        print("🔍 Evaluating Fraud Risk Model...")
        results["fraud_risk"] = self.risk_engine.evaluate_comprehensive()
        
        # Evaluate chargeback engine
        print("🔍 Evaluating Chargeback Evidence Model...")
        results["chargeback_evidence"] = self.chargeback_engine.evaluate_model_performance()
        
        # System-wide summary
        system_summary = evaluation_suite.get_summary(last_n=20)
        
        return {
            "model_evaluations": results,
            "system_summary": system_summary,
            "evaluation_timestamp": datetime.now().isoformat(),
            "models_count": len(self.model_registry),
            "total_evaluations": len(evaluation_suite.export_history())
        }
    
    def get_system_health(self) -> Dict:
        """Get overall system health metrics."""
        fraud_stats = self.risk_engine.get_model_stats()
        chargeback_stats = self.chargeback_engine.get_performance_metrics()
        
        return {
            "overall_status": "healthy",
            "models": {
                "fraud_risk": fraud_stats,
                "chargeback_evidence": chargeback_stats
            },
            "compliance_metrics": {
                "precision_fraud": chargeback_stats["ml_metrics"]["precision"],
                "recall_fraud": chargeback_stats["ml_metrics"]["recall"],
                "false_positive_cost": chargeback_stats["ml_metrics"]["total_cost_impact"],
                "roc_auc_fraud": chargeback_stats["ml_metrics"]["roc_auc"]
            }
        }


# Global instances
risk_engine = RiskEngine()
ml_risk_manager = MLRiskManager()
