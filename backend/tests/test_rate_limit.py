import pytest

def test_rate_limiting_search_endpoint(client, patch_search_service):
    """
    IEEE 829 Test Case: TC-RAT-002
    Objective: Verify IP-based rate limiting on the product search endpoint.
               Max allowed requests: 5 per minute. 6th request must trigger HTTP 429.
    """
    query = "iPhone"
    
    # Send 5 allowed requests
    for i in range(5):
        response = client.get(f"/api/v1/search?q={query}")
        assert response.status_code == 200, f"Request {i+1} failed instead of passing"
        
    # The 6th request must exceed the rate limit and return 429 Too Many Requests
    exceeded_response = client.get(f"/api/v1/search?q={query}")
    assert exceeded_response.status_code == 429
    
    # Verify rate-limit error response contents
    data = exceeded_response.json()
    assert "error" in data or "detail" in data
    assert "Rate limit exceeded" in data.get("error", "") or "Too many requests" in data.get("detail", "")

