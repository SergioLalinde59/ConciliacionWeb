import requests
import sys

BASE_URL = "http://localhost:8000/api"

def main():
    # 1. Obtener Cuentas
    try:
        resp = requests.get(f"{BASE_URL}/cuentas")
        resp.raise_for_status()
        cuentas = resp.json()
    except Exception as e:
        print(f"Error obteniendo cuentas: {e}")
        return

    if not cuentas:
        print("No hay cuentas.")
        return

    cuenta = cuentas[0]
    cuenta_id = cuenta['id']
    print(f"Probando con Cuenta: {cuenta['nombre']} (ID: {cuenta_id})")

    # 2. Year/Month
    year = 2025
    month = 1

    # 3. Consultar antes
    print(f"Consultando conciliacion {year}-{month}...")
    try:
        resp = requests.get(f"{BASE_URL}/conciliaciones/{cuenta_id}/{year}/{month}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Estado Antes: {data.get('estado')}, Sys Entradas: {data.get('sistema_entradas')}")
        else:
            print("No existe conciliacion previa.")
    except Exception as e:
        print(f"Error consultando conciliacion: {e}")

    # 4. Reset
    print("\nEjecutando Reset...")
    try:
        resp = requests.post(f"{BASE_URL}/matching/desvincular-todo/{cuenta_id}/{year}/{month}")
        resp.raise_for_status()
        print("Reset Exitoso:", resp.json())
    except Exception as e:
        print(f"Error en Reset: {e}")
        if hasattr(e, 'response') and e.response:
             print(e.response.text)
        return

    # 5. Consultar despues
    print("\nVerificando Post-Reset...")
    try:
        resp = requests.get(f"{BASE_URL}/conciliaciones/{cuenta_id}/{year}/{month}")
        resp.raise_for_status()
        data = resp.json()
        print(f"Sys Entradas (Total): {data.get('sistema_entradas')}")
        print(f"Sys Salidas (Total): {data.get('sistema_salidas')}")
    except Exception as e:
        print(f"Error verificando: {e}")

if __name__ == "__main__":
    main()
