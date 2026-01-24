import requests
import json

url = "http://localhost:8000/api/matching/crear-movimientos-lote"

# IDs que sabemos que están libres (1730 y 1731 son los de $30.000)
payload = [
    {"movimiento_extracto_id": 1730, "descripcion": "TRANSFERENCIA CTA SUC VIRTUAL - Test Manual"}
]

print(f"Enviando POST a {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
