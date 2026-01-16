
import requests
import random
import string

BASE_URL = "http://localhost:8000/api/cuentas"

def verify_api():
    print("Verifying API endpoints...")
    
    # 1. Create a new account with permite_conciliar=True
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    account_name = f"API Test Account {random_suffix}"
    
    payload = {
        "cuenta": account_name,
        "permite_carga": True,
        "permite_conciliar": True
    }
    
    print(f"Creating account via API: {payload}")
    try:
        response = requests.post(BASE_URL, json=payload)
        response.raise_for_status()
        created_account = response.json()
        print(f"Created account response: {created_account}")
        
        if created_account.get("permite_conciliar") is True:
            print("SUCCESS: API returned allows_conciliar=True on creation.")
        else:
            print("FAILURE: API returned permite_conciliar=False or missing on creation.")
            
        account_id = created_account.get("id")
        
        # 2. List accounts and verify
        print("Listing accounts...")
        response = requests.get(BASE_URL)
        response.raise_for_status()
        accounts = response.json()
        
        found = False
        for acc in accounts:
            if acc["id"] == account_id:
                print(f"Found created account in list: {acc}")
                if acc.get("permite_conciliar") is True:
                    print("SUCCESS: API list returned permite_conciliar=True.")
                else:
                    print("FAILURE: API list returned permite_conciliar=False or missing.")
                found = True
                break
        
        if not found:
            print("FAILURE: Created account not found in list.")
            
        # 3. Clean up (Delete)
        print(f"Deleting account {account_id}...")
        response = requests.delete(f"{BASE_URL}/{account_id}")
        response.raise_for_status()
        print("Account deleted.")

    except Exception as e:
        print(f"Error during API verification: {e}")

if __name__ == "__main__":
    verify_api()
