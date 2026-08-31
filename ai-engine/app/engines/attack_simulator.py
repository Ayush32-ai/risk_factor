"""Red-team attack simulator — evolves attack patterns to find blind spots."""

import random
import os
import json
from typing import Dict, List

try:
    import redis as _redis_lib
except Exception:
    _redis_lib = None


ATTACK_SCENARIOS = {
    "Distributed Account Network": {
        "base_detection": 25.0,
        "evolution_rate": -0.4,
        "tx_multiplier": 5000,
        "account_multiplier": 25,
    },
    "Refund Loop Exploitation": {
        "base_detection": 28.0,
        "evolution_rate": -0.35,
        "tx_multiplier": 3000,
        "account_multiplier": 15,
    },
    "Merchant Cluster Abuse": {
        "base_detection": 35.0,
        "evolution_rate": -0.3,
        "tx_multiplier": 4000,
        "account_multiplier": 20,
    },
    "Velocity Limit Bypass": {
        "base_detection": 40.0,
        "evolution_rate": -0.25,
        "tx_multiplier": 6000,
        "account_multiplier": 30,
    },
    "Device Fingerprint Rotation": {
        "base_detection": 45.0,
        "evolution_rate": -0.2,
        "tx_multiplier": 2000,
        "account_multiplier": 10,
    },
}


class AttackSimulator:
    def __init__(self):
        self.current_simulation = None
        # Try to load persisted simulation from Redis if available
        try:
            redis_url = os.environ.get('REDIS_URL')
            if _redis_lib and redis_url:
                try:
                    client = _redis_lib.from_url(redis_url, decode_responses=True)
                    raw = client.get('sentinel:current_simulation')
                    if raw:
                            try:
                                self.current_simulation = json.loads(raw)
                                print('✓ Loaded persisted attack simulation from Redis in AI engine')
                            except Exception:
                                # Try to recover from legacy/malformed format like {id:sim-123,...}
                                try:
                                    def parse_legacy(s: str):
                                        cleaned = s.strip().lstrip('{').rstrip('}').strip()
                                        parts = [p for p in cleaned.split(',') if ':' in p]
                                        out = {}
                                        for p in parts:
                                            k, v = p.split(':', 1)
                                            key = k.strip().strip('"').strip("'")
                                            val = v.strip().strip('"').strip("'")
                                            if val.lower() in ('true', 'false'):
                                                out[key] = val.lower() == 'true'
                                            else:
                                                try:
                                                    out[key] = int(val)
                                                except Exception:
                                                    try:
                                                        out[key] = float(val)
                                                    except Exception:
                                                        out[key] = val
                                        return out

                                    parsed = parse_legacy(raw)
                                    # normalize
                                    if 'detectionRate' in parsed and 'detection_rate' not in parsed:
                                        parsed['detection_rate'] = parsed['detectionRate']
                                    self.current_simulation = parsed
                                    print('✓ Recovered persisted attack simulation (legacy format) in AI engine')
                                    # attempt to rewrite normalized JSON back to Redis
                                    try:
                                        client.set('sentinel:current_simulation', json.dumps(self.current_simulation))
                                        print('✓ Rewrote normalized simulation to Redis from AI engine')
                                    except Exception as e:
                                        print('⚠ Could not rewrite normalized simulation to Redis from AI engine', e)
                                except Exception as e2:
                                    print('⚠ Could not parse persisted simulation in AI engine:', e2)
                except Exception as e:
                    print('⚠ Could not load persisted simulation from Redis in AI engine:', e)
        except Exception:
            pass
    
    def simulate(self, scenario: str, generation: int = 1) -> Dict:
        config = ATTACK_SCENARIOS.get(scenario, ATTACK_SCENARIOS["Distributed Account Network"])
        detection_rate = max(
            12.0,
            config["base_detection"] + config["evolution_rate"] * generation + random.uniform(-2, 2),
        )

        result = {
            "id": f"sim-{random.randint(1000, 9999)}",
            "target": "Payment Risk Engine",
            "scenario": scenario,
            "generation": generation,
            "transactions_count": config["tx_multiplier"] * generation + random.randint(1000, 5000),
            "accounts_count": config["account_multiplier"] * generation + random.randint(10, 50),
            "merchants_count": random.randint(15, 45),
            "detection_rate": round(detection_rate, 1),
            "status": "running",
            "blind_spot_discovered": detection_rate < 30,
            "start_time": "2024-08-24T02:00:00Z",
            "metrics": {
                "accounts_compromised": int(config["account_multiplier"] * generation),
                "velocity_violations": int(15 * generation),
                "failed_attempts": int(50 * generation),
                "synthetic_accounts": int(8 * generation),
                "suspicious_refunds": int(12 * generation),
                "device_switches": int(20 * generation),
                "rapid_transactions": int(30 * generation),
                "testing_attempts": int(40 * generation)
            }
        }
        
        # Store as current simulation
        self.current_simulation = result
        return result

    def get_current_simulation(self) -> Dict:
        """Get the current running simulation."""
        return self.current_simulation

    def evolve(self, current: Dict) -> Dict:
        return self.simulate(current["scenario"], current.get("generation", 1) + 1)


attack_simulator = AttackSimulator()
