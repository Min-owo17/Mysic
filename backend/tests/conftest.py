import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from main import app  # backend/app/main.py -> backend/main.py (if run from backend root) or app.main
import os
import sys

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User

# Use a separate database for testing
# Ensure this database exists or the user has permission to create it
SQLALCHEMY_DATABASE_URL = "postgresql://mysic_user:mysic_password@localhost:5432/mysic_test_db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Create tables at the start of the test session and drop them at the end.
    """
    # Import all models to ensure they are registered with Base.metadata
    import app.models  # noqa: F401
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """
    Creates a new database session for a test.
    Rolls back transaction after the test is complete.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient with overridden dependency.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """
    Creates a test user.
    """
    user = User(
        email="test@example.com",
        nickname="TestUser",
        unique_code="TESTCODE1234",
        password_hash="hashed_password", # In real auth tests, we might need real hash
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def token(test_user):
    """
    Generates a valid access token for the test user.
    """
    return create_access_token(subject=str(test_user.user_id))

@pytest.fixture
def authorized_client(client, token):
    """
    Client with Authorization header.
    """
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}"
    }
    return client
