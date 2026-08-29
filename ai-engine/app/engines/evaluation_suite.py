"""
Comprehensive evaluation suite for fraud detection models.
Tracks model performance over time and provides evaluation summaries.
"""

import threading
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import json


class ModelEvaluationSuite:
    """Thread-safe evaluation suite for tracking model performance."""
    
    def __init__(self):
        self._evaluations: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._latest: Optional[Dict[str, Any]] = None
    
    def add_evaluation(self, 
                      model_name: str,
                      metrics: Dict[str, Any],
                      dataset_size: int,
                      fraud_rate: float,
                      cost_config: Dict[str, float] = None) -> Dict[str, Any]:
        """Add a new evaluation result to the suite."""
        
        if cost_config is None:
            cost_config = {"fp_cost": 1.0, "fn_cost": 10.0}
        
        evaluation = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_name": model_name,
            "dataset_size": dataset_size,
            "fraud_rate": fraud_rate,
            "cost_config": cost_config,
            "metrics": metrics,
            "performance_grade": self._calculate_grade(metrics),
            "recommendations": self._generate_recommendations(metrics)
        }
        
        with self._lock:
            self._evaluations.append(evaluation)
            self._latest = evaluation
        
        return evaluation
    
    def _calculate_grade(self, metrics: Dict[str, Any]) -> str:
        """Calculate overall performance grade based on key metrics."""
        score = 0
        weights = {
            "roc_auc": 0.4,
            "fraud_precision": 0.25, 
            "fraud_recall": 0.25,
            "cost_effectiveness": 0.1
        }
        
        # ROC AUC component
        roc_auc = metrics.get("roc_auc", 0.5)
        if roc_auc >= 0.95:
            score += weights["roc_auc"] * 100
        elif roc_auc >= 0.90:
            score += weights["roc_auc"] * 85
        elif roc_auc >= 0.80:
            score += weights["roc_auc"] * 70
        else:
            score += weights["roc_auc"] * 50
        
        # Precision component
        pr_metrics = metrics.get("precision_recall", {})
        fraud_precision = pr_metrics.get("fraud", {}).get("precision", 0)
        if fraud_precision >= 0.90:
            score += weights["fraud_precision"] * 100
        elif fraud_precision >= 0.80:
            score += weights["fraud_precision"] * 85
        elif fraud_precision >= 0.70:
            score += weights["fraud_precision"] * 70
        else:
            score += weights["fraud_precision"] * 50
        
        # Recall component
        fraud_recall = pr_metrics.get("fraud", {}).get("recall", 0)
        if fraud_recall >= 0.85:
            score += weights["fraud_recall"] * 100
        elif fraud_recall >= 0.75:
            score += weights["fraud_recall"] * 85
        elif fraud_recall >= 0.65:
            score += weights["fraud_recall"] * 70
        else:
            score += weights["fraud_recall"] * 50
        
        # Cost effectiveness
        cost_metrics = metrics.get("false_positive_cost", {})
        cost_ratio = cost_metrics.get("cost_effectiveness_ratio", 1)
        if cost_ratio >= 5:
            score += weights["cost_effectiveness"] * 100
        elif cost_ratio >= 3:
            score += weights["cost_effectiveness"] * 85
        elif cost_ratio >= 2:
            score += weights["cost_effectiveness"] * 70
        else:
            score += weights["cost_effectiveness"] * 50
        
        # Convert to letter grade
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "C+"
        elif score >= 65:
            return "C"
        else:
            return "D"
    
    def _generate_recommendations(self, metrics: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on metrics."""
        recommendations = []
        
        roc_auc = metrics.get("roc_auc", 0.5)
        pr_metrics = metrics.get("precision_recall", {})
        fraud_precision = pr_metrics.get("fraud", {}).get("precision", 0)
        fraud_recall = pr_metrics.get("fraud", {}).get("recall", 0)
        cost_metrics = metrics.get("false_positive_cost", {})
        
        # ROC AUC recommendations
        if roc_auc < 0.80:
            recommendations.append("ROC AUC below 0.80 - consider feature engineering or model complexity increase")
        
        # Precision recommendations
        if fraud_precision < 0.70:
            recommendations.append("Low fraud precision - consider adjusting decision threshold to reduce false positives")
        
        # Recall recommendations  
        if fraud_recall < 0.70:
            recommendations.append("Low fraud recall - model missing too many fraud cases, consider ensemble methods")
        
        # Cost recommendations
        fp_count = cost_metrics.get("false_positives", 0)
        fn_count = cost_metrics.get("false_negatives", 0)
        total_cost = cost_metrics.get("total_cost", 0)
        
        if fp_count > fn_count * 2:
            recommendations.append("High false positive rate - consider relaxing decision threshold")
        elif fn_count > fp_count:
            recommendations.append("High false negative rate - consider tightening decision threshold")
        
        if total_cost > 10000:
            recommendations.append("High total cost detected - review cost parameters and decision thresholds")
        
        # Drift recommendations
        drift_info = metrics.get("drift_test", {})
        if drift_info.get("drift", False):
            recommendations.append("Model drift detected - schedule retraining on recent data")
        
        # CV-Test gap
        cv_auc = metrics.get("cv_mean_roc_auc", 0)
        if abs(roc_auc - cv_auc) > 0.1:
            recommendations.append("Large CV-test performance gap - possible overfitting or data leakage")
        
        if not recommendations:
            recommendations.append("Model performance is within acceptable ranges")
        
        return recommendations
    
    def get_latest(self) -> Optional[Dict[str, Any]]:
        """Get the most recent evaluation."""
        with self._lock:
            return self._latest.copy() if self._latest else None
    
    def get_summary(self, last_n: int = 10) -> Dict[str, Any]:
        """Get summary statistics for recent evaluations."""
        with self._lock:
            recent = self._evaluations[-last_n:] if self._evaluations else []
        
        if not recent:
            return {
                "count": 0,
                "summary": "No evaluations available"
            }
        
        # Aggregate metrics
        roc_aucs = []
        precisions = []
        recalls = []
        grades = []
        
        for eval_result in recent:
            metrics = eval_result["metrics"]
            roc_aucs.append(metrics.get("roc_auc", 0))
            
            pr = metrics.get("precision_recall", {})
            precisions.append(pr.get("fraud", {}).get("precision", 0))
            recalls.append(pr.get("fraud", {}).get("recall", 0))
            grades.append(eval_result["performance_grade"])
        
        # Calculate trends
        if len(roc_aucs) >= 2:
            roc_trend = "improving" if roc_aucs[-1] > roc_aucs[-2] else "declining"
        else:
            roc_trend = "stable"
        
        return {
            "count": len(recent),
            "date_range": {
                "start": recent[0]["timestamp"],
                "end": recent[-1]["timestamp"]
            },
            "performance_summary": {
                "avg_roc_auc": sum(roc_aucs) / len(roc_aucs),
                "avg_fraud_precision": sum(precisions) / len(precisions),
                "avg_fraud_recall": sum(recalls) / len(recalls),
                "latest_grade": grades[-1] if grades else "N/A",
                "trend": roc_trend
            },
            "grade_distribution": {grade: grades.count(grade) for grade in set(grades)},
            "latest_recommendations": recent[-1]["recommendations"] if recent else []
        }
    
    def export_history(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Export evaluation history."""
        with self._lock:
            if limit:
                return self._evaluations[-limit:].copy()
            return self._evaluations.copy()
    
    def latest(self) -> Optional[Dict[str, Any]]:
        """Get latest evaluation with summary."""
        latest = self.get_latest()
        if not latest:
            return None
        
        summary = self.get_summary(last_n=5)
        return {
            "evaluation": latest,
            "summary": summary
        }


# Global singleton instance
evaluation_suite = ModelEvaluationSuite()


def evaluate_model_comprehensive(model_name: str, metrics: Dict[str, Any], dataset_size: int, fraud_rate: float) -> Dict[str, Any]:
    """Convenient function to add evaluation and get comprehensive results."""
    return evaluation_suite.add_evaluation(model_name, metrics, dataset_size, fraud_rate)