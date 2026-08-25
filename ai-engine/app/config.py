from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    groq_api_key: str = ""  # Groq API key
    grok_api_key: str = ""  # Alternative name for the same key
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "sentinel_dev"

    @property
    def ai_api_key(self) -> str:
        """Return groq_api_key, gemini_api_key, or grok_api_key"""
        return self.groq_api_key or self.gemini_api_key or self.grok_api_key

    class Config:
        env_file = ".env"


settings = Settings()
