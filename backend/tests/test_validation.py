import pytest

def test_query_validation_success(client, patch_search_service):
    """
    IEEE 829 Test Case: TC-VAL-003 (Success case)
    Objective: Verify valid query length (between 2 and 100 characters) returns HTTP 200.
    """
    # 5 characters - valid
    response = client.get("/api/v1/search?q=dyson")
    assert response.status_code == 200
    assert response.json()["query"] == "dyson"

def test_query_validation_too_short(client, patch_search_service):
    """
    IEEE 829 Test Case: TC-VAL-003 (Too Short)
    Objective: Verify query length less than 2 characters is rejected with HTTP 422.
    """
    response = client.get("/api/v1/search?q=a")
    assert response.status_code == 422
    
    # Verify Pydantic/FastAPI validation details
    errors = response.json().get("detail", [])
    assert len(errors) > 0
    assert any("less_than_equal" in err.get("type", "") or "min_length" in err.get("type", "") or "at least" in err.get("msg", "") for err in errors)

def test_query_validation_too_long(client, patch_search_service):
    """
    IEEE 829 Test Case: TC-VAL-003 (Too Long)
    Objective: Verify query length more than 100 characters is rejected with HTTP 422.
    """
    very_long_query = "a" * 101
    response = client.get(f"/api/v1/search?q={very_long_query}")
    assert response.status_code == 422
    
    # Verify Pydantic/FastAPI validation details
    errors = response.json().get("detail", [])
    assert len(errors) > 0
    assert any("greater_than_equal" in err.get("type", "") or "max_length" in err.get("type", "") or "at most" in err.get("msg", "") for err in errors)
