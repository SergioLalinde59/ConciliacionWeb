import pytest

def test_listar_movimientos_sin_filtros(client):
    """Verifica el listado general de movimientos"""
    response = client.get("/api/movimientos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_filtrar_movimientos_por_fecha(client):
    """Verifica el filtro de fecha (aunque sea un rango vacío)"""
    params = {
        "desde": "2024-01-01",
        "hasta": "2024-01-31"
    }
    response = client.get("/api/movimientos", params=params)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_grupos_excluidos(client):
    """Verifica que el filtro grupos_excluidos sea aceptado"""
    # Sin grupos excluidos
    response = client.get("/api/movimientos")
    assert response.status_code == 200
    
    # Con grupos excluidos (ejemplo: grupo 46)
    response_con_exclusion = client.get("/api/movimientos?grupos_excluidos=46")
    assert response_con_exclusion.status_code == 200

