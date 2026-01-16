
import sys
import os
import random
import string

# Add Backend to python path
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool
from src.infrastructure.database.postgres_cuenta_repository import PostgresCuentaRepository
from src.domain.models.cuenta import Cuenta

def verify_changes():
    print("Initializing connection pool...")
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    try:
        repo = PostgresCuentaRepository(conn)
        
        # 1. Create a new account with permite_conciliar=True
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        account_name = f"Test Account {random_suffix}"
        
        new_account = Cuenta(
            cuentaid=None,
            cuenta=account_name,
            activa=True,
            permite_carga=True,
            permite_conciliar=True
        )
        
        print(f"Creating account: {new_account}")
        saved_account = repo.guardar(new_account)
        print(f"Saved account ID: {saved_account.cuentaid}")
        
        # 2. Retrieve the account
        print("Retrieving account...")
        retrieved_account = repo.obtener_por_id(saved_account.cuentaid)
        
        if retrieved_account:
            print(f"Retrieved account: {retrieved_account}")
            if retrieved_account.permite_conciliar:
                print("SUCCESS: permite_conciliar is True in retrieved object.")
            else:
                print("FAILURE: permite_conciliar is False or None.")
        else:
            print("FAILURE: Account not found.")

        # 3. Clean up (Soft delete)
        print("Cleaning up (soft delete)...")
        repo.eliminar(saved_account.cuentaid)
        print("Cleanup done.")
        
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        if 'conn' in locals():
            pool.putconn(conn)
        pool.closeall()

if __name__ == "__main__":
    verify_changes()
