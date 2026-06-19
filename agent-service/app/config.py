from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    backend_api_url: str = "http://localhost:3001"
    agent_service_jwt: str = ""
    agent_inbound_key: str = ""
    anthropic_api_key: str = ""
    agent_model: str = "claude-sonnet-4-6"
    agent_max_tokens: int = 2048
    redis_url: str | None = None
    max_agent_steps: int = 12
    request_timeout_seconds: float = 20.0
    port: int = 8000

    # Langfuse tracing (self-hosted, env-gated; no-op if unset)
    langfuse_host: str | None = None
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
