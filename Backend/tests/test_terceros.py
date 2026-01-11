import pytest
import uuid

def test_crear_tercero_idempotencia(client):
    """Verifica que crear dos veces el mismo tercero no genere duplicados (idempotencia)"""
    # Generamos un nombre único para evitar colisiones con datos reales
    unique_name = f"TEST_CORP_{uuid.uuid4().hex[:8]}"
    payload = {
        "tercero": unique_name
    }
    
    # Primera creación
    resp1 = client.post("/api/terceros", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    id1 = data1["id"]
    
    # Segunda creación (debe devolver el mismo ID)
    resp2 = client.post("/api/terceros", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    id2 = data2["id"]
    
    assert id1 == id2
    
    # Limpieza: eliminamos el tercero de prueba
    del_resp = client.delete(f"/api/terceros/{id1}")
    assert del_resp.status_code == 200
