import sys
from app.engines import model_evaluation
from app.engines.ml_engine import RiskEngine


def test_synthetic_generation_shapes():
    X, y = model_evaluation.generate_synthetic_fraud(100, n_features=5, fraud_rate=0.1, random_state=1)
    assert X.shape == (100, 5)
    assert y.shape == (100,)


def test_drift_detection_returns_dict():
    import numpy as np

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
    import numpy as np
    from app.engines import model_evaluation

    y_true = np.array([0, 0, 1, 1, 0])
    y_pred = np.array([0, 1, 1, 0, 0])
    cost = model_evaluation.false_positive_cost(y_true, y_pred, cost_fp=180, cost_fn=12500)
    assert cost == 180 + 12500


def test_evaluation_suite_per_detector():
    from app.engines.evaluation_suite import EvaluationSuite

    suite = EvaluationSuite()
    report = suite.run(n_samples=400, holdout_frac=0.3, persist=False)
    assert report["summary"]["detectors"] == 8
    assert "avg_precision" in report["summary"]
    names = {d["id"] for d in report["detectors"]}
    assert "payment_risk" in names
    monitoring = suite.monitoring()
    assert "drift" in monitoring


def run_all():
    tests = [
        test_synthetic_generation_shapes,
        test_drift_detection_returns_dict,
        test_risk_engine_evaluate_runs,
        test_false_positive_cost_inr,
        test_evaluation_suite_per_detector,
    ]
    failed = 0
    for t in tests:
        name = t.__name__
        try:
            t()
            print(f"OK: {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL: {name} - {e}")
        except Exception as e:
            failed += 1
            print(f"ERROR: {name} - {e}")
    if failed:
        print(f"{failed} tests failed")
        sys.exit(1)
    print("All tests passed")


if __name__ == "__main__":
    run_all()
