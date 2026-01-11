def test_health_check(client):
    """Verifica que el API esté arriba y responda OK"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_obtener_catalogos(client):
    """Verifica que el endpoint de catálogos devuelva las claves esperadas"""
    response = client.get("/api/catalogos")
    assert response.status_code == 200
    data = response.json()
    assert "cuentas" in data
    assert "monedas" in data
    assert "terceros" in data
    assert "grupos" in data
    assert "conceptos" in data
    # Verificar que al menos devuelva listas
    assert isinstance(data["cuentas"], list)
