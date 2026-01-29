import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath("backend"))

from app.database import SessionLocal
from app.models.cuenta import Cuenta

def check_cuentas():
    db = SessionLocal()
    try:
        cuentas_carga = db.query(Cuenta).filter(Cuenta.permite_carga == True).all()
        print(f"Total cuentas con permite_carga=True: {len(cuentas_carga)}")
        for c in cuentas_carga:
            print(f"- [ID: {c.id}] {c.nombre}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_cuentas()
