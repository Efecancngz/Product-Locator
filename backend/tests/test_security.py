import pytest

def test_security_headers(client):
    """
    IEEE 829 Test Case: TC-SEC-001
    Objective: Verify presence and correctness of security headers in all API responses.
    """
    response = client.get("/")
    assert response.status_code == 200
    
    headers = response.headers
    
    # 1. Content Type Options
    assert headers.get("X-Content-Type-Options") == "nosniff"
    
    # 2. Clickjacking Protection
    assert headers.get("X-Frame-Options") == "DENY"
    
    # 3. Cross-Site Scripting Protection
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    
    # 4. Content Security Policy (CSP)
    csp = headers.get("Content-Security-Policy")
    assert csp is not None
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp
    assert "style-src 'self'" in csp

def test_cors_headers(client):
    """
    Objective: Verify CORS headers permit request origins specified in settings.
    """
    # Test allowed origin
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/v1/search?q=test", headers=headers)
    assert response.status_code in [200, 204]
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
