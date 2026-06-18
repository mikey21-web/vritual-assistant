import pytest
from app.config import Settings


@pytest.fixture
def settings():
    return Settings(
        backend_api_url="http://test:3001",
        agent_service_jwt="test-jwt",
        anthropic_api_key="test-key",
    )
