import pytest
from src.services.store_service import store_service

def test_city_matching_ascii_and_turkish():
    """Verify that city lookup handles both ASCII and Turkish characters correctly."""
    # Test with ASCII
    stores_ascii = store_service.get_stores_by_city("Istanbul")
    assert len(stores_ascii) > 0

    # Test with Turkish characters
    stores_turkish = store_service.get_stores_by_city("İstanbul")
    assert len(stores_turkish) > 0
    assert len(stores_ascii) == len(stores_turkish)

    # Verify Teknosa exists in the response
    teknosa_stores = [s for s in stores_ascii if s['chain'] == 'Teknosa']
    assert len(teknosa_stores) > 0
