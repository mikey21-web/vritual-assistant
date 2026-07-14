from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    backend_api_url: str = "http://localhost:3001"
    agent_service_jwt: str = ""
    agent_inbound_key: str = ""
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    agent_model: str = "deepseek-chat"
    agent_max_tokens: int = 2048
    redis_url: str | None = None
    max_agent_steps: int = 12
    request_timeout_seconds: float = 20.0
    port: int = 8000

    # Khoj knowledge base
    khoj_api_url: str = "http://localhost:42111"
    khoj_api_key: str = ""
    khoj_request_timeout: float = 10.0

    # Langfuse tracing (self-hosted, env-gated; no-op if unset)
    langfuse_host: str | None = None
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
