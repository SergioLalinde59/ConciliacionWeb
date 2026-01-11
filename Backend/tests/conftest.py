import pytest
from fastapi.testclient import TestClient
from src.infrastructure.api.main import app

@pytest.fixture
def client():
    # Usamos TestClient de FastAPI que internamente usa httpx
    with TestClient(app) as client:
        yield client
