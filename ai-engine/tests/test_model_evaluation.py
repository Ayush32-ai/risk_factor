import numpy as np
from app.engines import model_evaluation
from app.engines.ml_engine import RiskEngine


def test_synthetic_generation_shapes():
    X, y = model_evaluation.generate_synthetic_fraud(100, n_features=5, fraud_rate=0.1, random_state=1)
    assert X.shape == (100, 5)
    assert y.shape == (100,)


def test_drift_detection_returns_dict():
    a = np.random.RandomState(0).rand(10)
    b = np.random.RandomState(1).rand(20)
    res = model_evaluation.drift_detection_permutation(a, b, n_permutations=50, alpha=0.05)
    assert isinstance(res, dict)
    assert "p_value" in res and "drift" in res


def test_risk_engine_evaluate_runs():
    engine = RiskEngine()
    out = engine.evaluate(n_samples=200, holdout_frac=0.25)
    assert "metrics" in out and "retrained" in out
    assert isinstance(out["metrics"], dict)


def test_false_positive_cost_inr():
    y_true = np.array([0, 0, 1, 1, 0])
    y_pred = np.array([0, 1, 1, 0, 0])  # 1 FP, 1 FN
    cost = model_evaluation.false_positive_cost(y_true, y_pred, cost_fp=180, cost_fn=12500)
    assert cost == 180 + 12500


def test_roc_curve_points_json_safe():
    y_true = np.array([0, 0, 1, 1, 0, 1])
    y_scores = np.array([0.1, 0.2, 0.9, 0.8, 0.3, 0.7])
    pts = model_evaluation.roc_curve_points(y_true, y_scores)
    assert isinstance(pts, list) and pts
    assert "fpr" in pts[0] and "tpr" in pts[0]


def test_evaluation_suite_per_detector():
    from app.engines.evaluation_suite import EvaluationSuite

    suite = EvaluationSuite()
    report = suite.run(n_samples=400, holdout_frac=0.3, persist=False)
    assert report["summary"]["detectors"] == 8
    assert "avg_precision" in report["summary"]
    assert "false_positive_cost_inr" in report["summary"]
    names = {d["id"] for d in report["detectors"]}
    assert "payment_risk" in names and "refund_loop" in names
    for d in report["detectors"]:
        assert 0.0 <= d["precision"] <= 1.0
        assert 0.0 <= d["recall"] <= 1.0
        assert "confusion_matrix" in d
    monitoring = suite.monitoring()
    assert "drift" in monitoring and "history" in monitoring
