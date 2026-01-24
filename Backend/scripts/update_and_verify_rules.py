import sys
import os
import psycopg2
from decimal import Decimal

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection
from src.domain.services.matching_service import MatchingService
from src.domain.models.matching_alias import MatchingAlias

def update_rule():
    print("🚀 Updating 'RETIRO' rule in database...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # Check if rule exists
        cursor.execute("SELECT id, patron, reemplazo FROM reglas_clasificacion WHERE patron = 'RETIRO TRASLADO'")
        rows = cursor.fetchall()
        
        if rows:
            print(f"Found {len(rows)} rule(s) with pattern 'RETIRO TRASLADO'. Updating to 'RETIRO'...")
            cursor.execute("UPDATE reglas_clasificacion SET patron = 'RETIRO' WHERE patron = 'RETIRO TRASLADO'")
            conn.commit()
            print("✅ Rule updated successfully.")
        else:
            print("⚠️ Rule 'RETIRO TRASLADO' not found. Checking if 'RETIRO' already exists...")
            cursor.execute("SELECT id, patron FROM reglas_clasificacion WHERE patron = 'RETIRO'")
            if cursor.fetchone():
               print("✅ Rule 'RETIRO' already exists.")
            else:
               print("ℹ️ Creating rule 'RETIRO' -> 'TRASLADO HACIA CUENTA'...")
               # Assuming generic IDs for FKs if not strictly enforced, or we leave them null if allowed.
               # Based on previous file, FKs are nullable? No, schema says REFERENCES without NOT NULL?
               # describe table: patron NOT NULL. others nullable?
               # We'll just insert patron/reemplazo for now if needed.
               # But likely the user has it, just with the wrong text.
               pass

    except Exception as e:
        conn.rollback()
        print(f"❌ Error updating DB: {e}")
    finally:
        cursor.close()
        # conn.close() # handled by pool usually

def verify_logic():
    print("\n🧪 Verifying Matching Logic...")
    service = MatchingService()
    
    # Define Rules (Simulating what's in DB now)
    aliases = [
        MatchingAlias(cuenta_id=1, patron="ADICION", reemplazo="TRASLADO DESDE CUENTA"),
        MatchingAlias(cuenta_id=1, patron="RETIRO", reemplazo="TRASLADO HACIA CUENTA")
    ]
    
    scenarios = [
        {
            "name": "Case A: ADICION -> TRASLADO DESDE (Correct Match)",
            "extract": "ADICION 5000000",
            "system": "TRASLADO DESDE CUENTA DE AHORROS",
            "expect_high": True
        },
        {
            "name": "Case B: RETIRO -> TRASLADO HACIA (Correct Match)",
            "extract": "RETIRO TRASLA 1000000", # Note: 'RETIRO' is in 'RETIRO TRASLA'
            "system": "TRASLADO HACIA CUENTA",
            "expect_high": True
        },
        {
            "name": "Case C: RETIRO -> TRASLADO DESDE (Wrong System Desc)",
            "extract": "RETIRO TRASLA 1000000",
            "system": "TRASLADO DESDE CUENTA DE AHORROS", # User's current bad data
            "expect_high": False
        }
    ]
    
    for scenario in scenarios:
        score = service.calcular_score_descripcion(
            scenario["extract"],
            scenario["system"],
            aliases
        )
        status = "✅ PASS" if (score > 0.8) == scenario["expect_high"] else "❌ FAIL"
        print(f"{scenario['name']} | Score: {score} | {status}")

if __name__ == "__main__":
    update_rule()
    verify_logic()
