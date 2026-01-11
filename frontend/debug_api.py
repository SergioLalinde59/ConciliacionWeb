import urllib.request
import json
import ssl

def fetch_json(url):
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    base_url = "http://localhost:8000"
    
    print("--- Grupos ---")
    grupos = fetch_json(f"{base_url}/api/grupos")
    if grupos:
        print(f"Count: {len(grupos)}")
        print(json.dumps(grupos[:3], indent=2))
        
    print("\n--- Conceptos ---")
    conceptos = fetch_json(f"{base_url}/api/conceptos")
    if conceptos:
        print(f"Count: {len(conceptos)}")
        print(json.dumps(conceptos[:3], indent=2))

if __name__ == "__main__":
    main()
