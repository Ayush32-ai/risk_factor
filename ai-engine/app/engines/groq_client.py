"""Groq AI integration for natural language risk assessments."""

import httpx
from typing import Optional
from app.config import settings


class GroqClient:
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    async def assess_risk(self, context: str) -> str:
        if not settings.ai_api_key:
            return self._mock_assessment(context)

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.BASE_URL,
                    headers={
                        "Authorization": f"Bearer {settings.ai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-70b-versatile",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a payment fraud analyst at Razorpay. Provide concise 2-3 sentence risk assessments."
                            },
                            {
                                "role": "user",
                                "content": f"Analyze this fraud pattern and provide a risk assessment:\n\n{context}"
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 200
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

        return self._mock_assessment(context)

    def _mock_assessment(self, context: str) -> str:
        return (
            "This pattern indicates a coordinated transaction network rather than "
            "independent customer activity. Multiple risk signals converge — shared "
            "device fingerprints, abnormal timing, and refund destination overlap — "
            "suggesting an organized fraud ring exploiting per-transaction evaluation gaps."
        )


groq_client = GroqClient()
