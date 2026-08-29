"""
Model evaluation utilities for fraud detection systems.
Provides comprehensive metrics including precision, recall, ROC curves, and cost analysis.
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    precision_recall_fscore_support, 
    roc_auc_score, 
    roc_curve, 
    confusion_matrix,
    classification_report
)
from sklearn.datasets import make_classification
import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any, Optional
import requests
from scipy import stats


def generate_synthetic_fraud(n_samples: int = 10000, n_features: int = 5, fraud_rate: float = 0.02, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Generate realistic synthetic fraud detection dataset."""
    np.random.seed(random_state)
    
    # Create base features with realistic distributions
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features-2),
        n_redundant=min(2, n_features-2),
        n_clusters_per_class=2,
        weights=[1-fraud_rate, fraud_rate],
        flip_y=0.01,  # 1% label noise
        random_state=random_state
    )
    
    # Add realistic fraud patterns
    fraud_indices = np.where(y == 1)[0]
    
    # High-risk patterns for fraud cases
    X[fraud_indices, 0] *= 2.5  # Higher velocity
    X[fraud_indices, 1] += np.random.exponential(2, len(fraud_indices))  # Device clustering
    
    # Add some edge cases to test model robustness
    edge_cases = np.random.choice(len(X), size=int(0.05 * len(X)), replace=False)
    X[edge_cases] += np.random.normal(0, 0.5, (len(edge_cases), n_features))
    
    return X, y


def holdout_split(X: np.ndarray, y: np.ndarray, holdout_frac: float = 0.2, random_state: int = 42) -> Tuple[Tuple[np.ndarray, np.ndarray], Tuple[np.ndarray, np.ndarray]]:
    """Split data into train and holdout test sets."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=holdout_frac, random_state=random_state, stratify=y
    )
    return (X_train, y_train), (X_test, y_test)


def precision_recall_per_label(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate precision and recall for each class."""
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, average=None)
    
    return {
        "legitimate": {
            "precision": float(precision[0]),
            "recall": float(recall[0]),
            "f1_score": float(f1[0]),
            "support": int(support[0])
        },
        "fraud": {
            "precision": float(precision[1]) if len(precision) > 1 else 0.0,
            "recall": float(recall[1]) if len(recall) > 1 else 0.0,
            "f1_score": float(f1[1]) if len(f1) > 1 else 0.0,
            "support": int(support[1]) if len(support) > 1 else 0
        },
        "macro_avg": {
            "precision": float(np.mean(precision)),
            "recall": float(np.mean(recall)),
            "f1_score": float(np.mean(f1))
        }
    }


def compute_roc_auc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
    """Calculate ROC AUC score."""
    if len(np.unique(y_true)) < 2:
        return 0.5  # No discrimination possible
    return float(roc_auc_score(y_true, y_scores))


def roc_curve_points(y_true: np.ndarray, y_scores: np.ndarray) -> Dict[str, List[float]]:
    """Get ROC curve data points."""
    if len(np.unique(y_true)) < 2:
        return {"fpr": [0, 1], "tpr": [0, 1], "thresholds": [1, 0]}
    
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)
    return {
        "fpr": fpr.tolist(),
        "tpr": tpr.tolist(), 
        "thresholds": thresholds.tolist()
    }


def compute_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> np.ndarray:
    """Calculate confusion matrix."""
    return confusion_matrix(y_true, y_pred)


def false_positive_cost(y_true: np.ndarray, y_pred: np.ndarray, cost_fp: float = 1.0, cost_fn: float = 10.0) -> Dict[str, float]:
    """
    Calculate false positive and false negative costs.
    
    Args:
        cost_fp: Cost per false positive (blocking legitimate transaction)
        cost_fn: Cost per false negative (missing fraud)
    """
    cm = confusion_matrix(y_true, y_pred)
    
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
    else:
        # Handle edge case where only one class is present
        tn = fp = fn = tp = 0
        if len(cm) == 1:
            if np.unique(y_true)[0] == 0:
                tn = cm[0, 0]
            else:
                tp = cm[0, 0]
    
    total_fp_cost = fp * cost_fp
    total_fn_cost = fn * cost_fn
    total_cost = total_fp_cost + total_fn_cost
    
    return {
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "fp_cost_per_unit": cost_fp,
        "fn_cost_per_unit": cost_fn,
        "total_fp_cost": float(total_fp_cost),
        "total_fn_cost": float(total_fn_cost),
        "total_cost": float(total_cost),
        "cost_effectiveness_ratio": float(total_fn_cost / max(total_fp_cost, 1))
    }


def k_fold_cross_validation(model, X: np.ndarray, y: np.ndarray, k: int = 5, scoring: str = "roc_auc") -> np.ndarray:
    """Perform k-fold cross validation."""
    return cross_val_score(model, X, y, cv=k, scoring=scoring)


def drift_detection_permutation(baseline_scores: np.ndarray, current_scores: np.ndarray, n_permutations: int = 1000, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Detect model drift using permutation test on performance scores.
    """
    if len(baseline_scores) == 0 or len(current_scores) == 0:
        return {"drift": False, "p_value": 1.0, "statistic": 0.0, "method": "insufficient_data"}
    
    # Use Kolmogorov-Smirnov test for distribution comparison
    statistic, p_value = stats.ks_2samp(baseline_scores, current_scores)
    
    drift_detected = p_value < alpha
    
    return {
        "drift": drift_detected,
        "p_value": float(p_value),
        "statistic": float(statistic),
        "alpha": alpha,
        "method": "kolmogorov_smirnov",
        "baseline_mean": float(np.mean(baseline_scores)),
        "current_mean": float(np.mean(current_scores)),
        "baseline_std": float(np.std(baseline_scores)),
        "current_std": float(np.std(current_scores))
    }


def check_retrain_trigger(metrics: Dict[str, float], thresholds: Dict[str, float], drift_flag: bool = False) -> bool:
    """
    Determine if model retraining should be triggered based on performance thresholds.
    """
    trigger_reasons = []
    
    # Check individual metric thresholds
    for metric_name, threshold in thresholds.items():
        if metric_name in metrics:
            if metrics[metric_name] < threshold:
                trigger_reasons.append(f"{metric_name} ({metrics[metric_name]:.3f}) below threshold ({threshold})")
    
    # Check for drift
    if drift_flag:
        trigger_reasons.append("Distribution drift detected")
    
    # Additional heuristics
    roc_auc = metrics.get("roc_auc", 1.0)
    cv_roc = metrics.get("cv_mean_roc_auc", 1.0)
    
    if abs(roc_auc - cv_roc) > 0.1:
        trigger_reasons.append(f"Large CV-test gap: {abs(roc_auc - cv_roc):.3f}")
    
    should_retrain = len(trigger_reasons) > 0
    
    return should_retrain


def save_metrics(metrics: Dict, out_dir: str = "./metrics") -> str:
    """Save metrics to JSON file with timestamp."""
    os.makedirs(out_dir, exist_ok=True)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"ml_metrics_{timestamp}.json"
    filepath = os.path.join(out_dir, filename)
    
    # Add metadata
    metrics_with_meta = {
        "timestamp": timestamp,
        "version": "1.0",
        "metrics": metrics
    }
    
    with open(filepath, 'w') as f:
        json.dump(metrics_with_meta, f, indent=2, default=str)
    
    return filepath


def plot_roc_curve(y_true: np.ndarray, y_scores: np.ndarray, save_path: str) -> None:
    """Generate and save ROC curve plot."""
    if len(np.unique(y_true)) < 2:
        return
    
    plt.figure(figsize=(8, 6))
    
    fpr, tpr, _ = roc_curve(y_true, y_scores)
    auc_score = roc_auc_score(y_true, y_scores)
    
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC Curve (AUC = {auc_score:.3f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
    
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC) Curve')
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()


def send_alert_webhook(webhook_url: str, payload: Dict) -> Optional[Dict]:
    """Send alert to webhook endpoint."""
    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        return {"status_code": response.status_code, "response": response.text[:200]}
    except Exception as e:
        return {"error": str(e)}


def generate_performance_report(metrics: Dict) -> str:
    """Generate human-readable performance report."""
    report_lines = [
        "=== FRAUD DETECTION MODEL PERFORMANCE REPORT ===",
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}",
        "",
        "CLASSIFICATION METRICS:",
    ]
    
    if "precision_recall" in metrics:
        pr = metrics["precision_recall"]
        report_lines.extend([
            f"  Fraud Detection:",
            f"    Precision: {pr['fraud']['precision']:.3f}",
            f"    Recall: {pr['fraud']['recall']:.3f}",
            f"    F1-Score: {pr['fraud']['f1_score']:.3f}",
            f"    Support: {pr['fraud']['support']}",
            "",
            f"  Legitimate Transactions:",
            f"    Precision: {pr['legitimate']['precision']:.3f}",
            f"    Recall: {pr['legitimate']['recall']:.3f}",
        ])
    
    if "roc_auc" in metrics:
        report_lines.extend([
            "",
            f"ROC AUC Score: {metrics['roc_auc']:.3f}",
        ])
    
    if "false_positive_cost" in metrics:
        fpc = metrics["false_positive_cost"]
        report_lines.extend([
            "",
            "COST ANALYSIS:",
            f"  False Positives: {fpc['false_positives']} (₹{fpc['total_fp_cost']:,.2f})",
            f"  False Negatives: {fpc['false_negatives']} (₹{fpc['total_fn_cost']:,.2f})",
            f"  Total Cost: ₹{fpc['total_cost']:,.2f}",
            f"  Cost Effectiveness Ratio: {fpc['cost_effectiveness_ratio']:.2f}",
        ])
    
    if "drift_test" in metrics and metrics["drift_test"]:
        drift = metrics["drift_test"]
        report_lines.extend([
            "",
            "DRIFT ANALYSIS:",
            f"  Drift Detected: {'Yes' if drift['drift'] else 'No'}",
            f"  P-Value: {drift['p_value']:.6f}",
            f"  Method: {drift.get('method', 'statistical_test')}",
        ])
    
    return "\n".join(report_lines)