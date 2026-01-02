from fastapi import status

def test_register_user(client, db_session):
    """
    Test user registration
    """
    payload = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "nickname": "NewUser",
        "unique_code": "NEWCODE12345"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == payload["email"]
    assert "user_id" in data

def test_duplicate_email(client, test_user):
    """
    Test registration with duplicate email
    """
    payload = {
        "email": "test@example.com", # Same as test_user
        "password": "anotherpassword",
        "nickname": "AnotherUser",
        "unique_code": "DIFFCODE1234"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_login_user(client, db_session):
    """
    Test user login
    """
    # First register
    register_payload = {
        "email": "loginuser@example.com",
        "password": "loginpassword",
        "nickname": "LoginUser",
        "unique_code": "LOGINCODE123"
    }
    client.post("/api/auth/register", json=register_payload)
    
    # Then login
    login_payload = {
        "username": "loginuser@example.com", # OAuth2PasswordRequestForm uses username for email
        "password": "loginpassword"
    }
    response = client.post("/api/auth/login", data=login_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
