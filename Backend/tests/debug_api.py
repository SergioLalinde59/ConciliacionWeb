import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url):
    print(f"\n--- Testing {name} [{url}] ---")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"Success! Returned {len(data)} items.")
                if data:
                    print("Sample item:", json.dumps(data[0], indent=2))
            elif isinstance(data, dict):
                # Handle PaginatedMovimientosResponse structure
                if "items" in data:
                    print(f"Success! Returned {len(data['items'])} items (Total: {data.get('total')}).")
                    if data['items']:
                        print("Sample item:", json.dumps(data['items'][0], indent=2))
                else:
                    print("Success! Returned dictionary.")
                    print(json.dumps(data, indent=2))
            else:
                print("Success! Response:", data)
            return True
        else:
            print("Failed.")
            print("Response:", response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Is it running?")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print(f"Checking API at {BASE_URL}...")
    
    # 1. Conceptos
    conceptos_ok = test_endpoint("Conceptos", f"{BASE_URL}/api/conceptos")
    
    # 2. Movimientos
    movimientos_ok = test_endpoint("Movimientos", f"{BASE_URL}/api/movimientos")
    
    if start := input("\nDo you want to test 'pendientes' endpoints? (y/n): ").lower() == 'y':
        test_endpoint("Pendientes Dashboard", f"{BASE_URL}/api/movimientos/pendientes")

if __name__ == "__main__":
    main()
