import numpy as np
from typing import Tuple, Dict, Any
from sklearn import metrics
from sklearn.model_selection import cross_val_score, StratifiedKFold
import os
import json
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _plt_available = True
except Exception:
    _plt_available = False
import httpx
from datetime import datetime

def precision_recall_per_label(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    """Return precision, recall and f1 for each label.

    Returns dict with keys: labels, precision, recall, f1, support
    """
    p, r, f1, support = metrics.precision_recall_fscore_support(
        y_true, y_pred, average=None, zero_division=0
    )
    labels = np.unique(np.concatenate([y_true, y_pred])).astype(int).tolist()
    return {
        "labels": labels,
        "precision": [float(x) for x in p],
        "recall": [float(x) for x in r],
        "f1": [float(x) for x in f1],
        "support": [int(x) for x in support],
    }


def compute_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> np.ndarray:
    return metrics.confusion_matrix(y_true, y_pred, labels=[0, 1])


def compute_roc_auc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
    if len(np.unique(y_true)) < 2:
        return 0.5
    return float(metrics.roc_auc_score(y_true, y_scores))


def roc_curve_points(y_true: np.ndarray, y_scores: np.ndarray, max_points: int = 60) -> list:
    """Downsampled ROC curve for dashboard charts (JSON-serializable)."""
    if len(np.unique(y_true)) < 2:
        return [{"fpr": 0.0, "tpr": 0.0}, {"fpr": 1.0, "tpr": 1.0}]
    fpr, tpr, _ = metrics.roc_curve(y_true, y_scores)
    if len(fpr) > max_points:
        idx = np.linspace(0, len(fpr) - 1, max_points).astype(int)
        fpr, tpr = fpr[idx], tpr[idx]
    return [{"fpr": float(a), "tpr": float(b)} for a, b in zip(fpr, tpr)]


def false_positive_cost(y_true: np.ndarray, y_pred: np.ndarray, cost_fp: float = 1.0, cost_fn: float = 0.0) -> float:
    cm = metrics.confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    tn, fp, fn, tp = (int(x) for x in cm)
    return float(fp * cost_fp + fn * cost_fn)


def generate_synthetic_fraud(n_samples: int, n_features: int = 10, fraud_rate: float = 0.01, random_state: int | None = None) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(random_state)
    n_fraud = max(1, int(n_samples * fraud_rate))
    n_legit = n_samples - n_fraud
    # Legitimate transactions: standard normal
    X_legit = rng.normal(loc=0.0, scale=1.0, size=(n_legit, n_features))
    # Fraud transactions: shifted mean and higher variance
    X_fraud = rng.normal(loc=2.0, scale=1.5, size=(n_fraud, n_features))
    X = np.vstack([X_legit, X_fraud])
    y = np.hstack([np.zeros(n_legit, dtype=int), np.ones(n_fraud, dtype=int)])
    # Shuffle
    idx = rng.permutation(n_samples)
    return X[idx], y[idx]


def holdout_split(X: np.ndarray, y: np.ndarray, holdout_frac: float = 0.2, random_state: int | None = None) -> Tuple[Tuple[np.ndarray, np.ndarray], Tuple[np.ndarray, np.ndarray]]:
    rng = np.random.default_rng(random_state)
    n = X.shape[0]
    idx = rng.permutation(n)
    split = int(n * (1 - holdout_frac))
    train_idx, test_idx = idx[:split], idx[split:]
    return (X[train_idx], y[train_idx]), (X[test_idx], y[test_idx])


def k_fold_cross_validation(estimator, X: np.ndarray, y: np.ndarray, k: int = 5, scoring: str = "roc_auc") -> np.ndarray:
    kf = StratifiedKFold(n_splits=k, shuffle=True, random_state=0)
    return cross_val_score(estimator, X, y, cv=kf, scoring=scoring)


def drift_detection_permutation(prev_scores: np.ndarray, current_scores: np.ndarray, n_permutations: int = 1000, alpha: float = 0.01) -> Dict[str, Any]:
    """Simple permutation test on the difference of means between two score arrays.

    Returns dict with p_value and drift_detected boolean.
    """
    prev = np.asarray(prev_scores)
    curr = np.asarray(current_scores)
    obs_diff = abs(prev.mean() - curr.mean())
    pooled = np.concatenate([prev, curr])
    rng = np.random.default_rng(0)
    count = 0
    for _ in range(n_permutations):
        rng.shuffle(pooled)
        new_prev = pooled[: prev.shape[0]]
        new_curr = pooled[prev.shape[0] :]
        if abs(new_prev.mean() - new_curr.mean()) >= obs_diff:
            count += 1
    p_value = (count + 1) / (n_permutations + 1)
    drift = p_value < alpha
    return {"p_value": float(p_value), "drift": bool(drift)}


def check_retrain_trigger(metrics_latest: Dict[str, float], thresholds: Dict[str, float], drift_flag: bool = False) -> bool:
    """Decide whether to trigger retraining.

    - Retrain if any metric is below its threshold OR drift_flag is True.
    """
    for k, thresh in thresholds.items():
        val = metrics_latest.get(k)
        if val is None:
            continue
        if val < thresh:
            return True
    if drift_flag:
        return True
    return False


def save_metrics(metrics_obj: Dict[str, Any], out_dir: str = "./metrics") -> str:
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    path = os.path.join(out_dir, f"metrics_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(metrics_obj, f, indent=2, default=str)
    return path


def plot_roc_curve(y_true: np.ndarray, y_scores: np.ndarray, out_path: str) -> None:
    if not _plt_available:
        # matplotlib not available; skip plotting
        return
    fpr, tpr, _ = metrics.roc_curve(y_true, y_scores)
    auc = metrics.auc(fpr, tpr)
    plt.figure()
    plt.plot(fpr, tpr, label=f"ROC (AUC = {auc:.3f})")
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(out_path)
    plt.close()


def send_alert_webhook(url: str, payload: Dict[str, Any], timeout: float = 5.0) -> Dict[str, Any]:
    try:
        resp = httpx.post(url, json=payload, timeout=timeout)
        return {"status_code": resp.status_code, "body": resp.text}
    except Exception as e:
        return {"error": str(e)}


__all__ = [
    "precision_recall_per_label",
    "compute_confusion_matrix",
    "compute_roc_auc",
    "roc_curve_points",
    "false_positive_cost",
    "generate_synthetic_fraud",
    "holdout_split",
    "k_fold_cross_validation",
    "drift_detection_permutation",
    "check_retrain_trigger",
    "save_metrics",
    "plot_roc_curve",
    "send_alert_webhook",
]
