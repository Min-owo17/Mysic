from fastapi import status
from datetime import date

def test_create_session(authorized_client):
    """
    Test creating a new practice session
    """
    payload = {
        "practice_date": str(date.today()),
        "instrument": "Piano",
        "notes": "Testing notes"
    }
    response = authorized_client.post("/api/practice/sessions", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["instrument"] == "Piano"

def test_get_active_session(authorized_client):
    """
    Test retrieving the active session
    """
    # Ensure no active session first (or create one)
    # create_session test might have left one, but tests are isolated by transaction rollback? 
    # db_session fixture rolls back, but if we call tests in sequence in same session... 
    # Wait, db_session fixture scope is function (default), so likely rollback happens per test function.
    
    # Create a session
    payload = {
        "practice_date": str(date.today()),
        "instrument": "Guitar",
        "notes": "Active session check"
    }
    create_res = authorized_client.post("/api/practice/sessions", json=payload)
    assert create_res.status_code == status.HTTP_201_CREATED
    
    # Get active session
    response = authorized_client.get("/api/practice/sessions/active")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data is not None
    assert data["instrument"] == "Guitar"

def test_end_session(authorized_client):
    """
    Test ending a practice session
    """
    # Create session
    create_payload = {
        "practice_date": str(date.today()),
        "instrument": "Violin"
    }
    session = authorized_client.post("/api/practice/sessions", json=create_payload).json()
    session_id = session["session_id"]
    
    # End session
    end_payload = {
        "end_time": str(date.today()) + "T23:59:59", # Just a format check
        "actual_play_time": 3600,
        "notes": "Finished"
    }
    response = authorized_client.put(f"/api/practice/sessions/{session_id}", json=end_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "completed"
    assert data["actual_play_time"] == 3600

def test_get_sessions_list(authorized_client):
    """
    Test listing practice sessions
    """
    # List should be empty or have what we created if transaction wasn't rolled back (it should be)
    response = authorized_client.get("/api/practice/sessions")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "sessions" in data
    # We expect 0 if isolated, or >0 if setup data exists.
    # Since we roll back, it should be 0 unless we add setup data.
