
import os
import psycopg2
from decimal import Decimal
from datetime import date
from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_detalle import MovimientoDetalle
from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository

def test_save_classification():
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")

    conn = psycopg2.connect(
        host=host,
        database=dbname,
        user=user,
        password=password,
        port=port
    )

    try:
        repo = PostgresMovimientoRepository(conn)
        cursor = conn.cursor()
        
        # 0. Get valid FKs
        cursor.execute("SELECT cuentaid FROM cuentas LIMIT 1")
        cuenta_id = cursor.fetchone()[0]
        
        cursor.execute("SELECT monedaid FROM monedas LIMIT 1")
        moneda_id = cursor.fetchone()[0]
        
        cursor.execute("SELECT terceroid FROM terceros LIMIT 1")
        tid = cursor.fetchone()[0]
        cursor.execute("SELECT centro_costo_id FROM centro_costos LIMIT 1")
        ccid = cursor.fetchone()[0]
        cursor.execute("SELECT conceptoid FROM conceptos WHERE centro_costo_id = %s LIMIT 1", (ccid,))
        cid_row = cursor.fetchone()
        cid = cid_row[0] if cid_row else None
        
        cursor.close()
        
        print(f"Using Valid IDs: Cuenta={cuenta_id}, Moneda={moneda_id}, Tercero={tid}, CC={ccid}, Concepto={cid}")

        if not cid:
            print("Could not find valid Concepto for Test. Aborting.")
            return

        # 1. Create a dummy movement
        print("Creating dummy movement...")
        mov = Movimiento(
            moneda_id=moneda_id,
            cuenta_id=cuenta_id,
            fecha=date.today(),
            valor=Decimal("-123000.00"),
            descripcion="TEST AUTOMATED SAVE CLASSIFICATION",
            referencia="REF_TEST_123"
        )
        
        # Save execution
        saved = repo.guardar(mov)
        print(f"Saved movement ID: {saved.id}")
        
        # 2. Update classification (Simulate Frontend 'Guardar')
        print("Updating classification...")
        
        # Fetch fresh copy
        to_update = repo.obtener_por_id(saved.id)
        
        # Apply logic from Router:
        to_update.tercero_id = tid
        to_update.centro_costo_id = ccid # This triggers the setter and creates detail
        to_update.concepto_id = cid # This updates the detail

        print(f"Details before save: {to_update.detalles}")
        
        updated = repo.guardar(to_update)
        print(f"Updated movement ID: {updated.id}")
        
        # 3. Verify Persistence
        print("Verifying persistence...")
        # Reload from DB
        reloaded = repo.obtener_por_id(updated.id)
        
        # Manual check in raw table to avoid Repo logic bias
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM movimientos_detalle WHERE movimiento_id = %s", (updated.id,))
        raw_rows = cursor.fetchall()
        print(f"Raw rows in movimientos_detalle: {raw_rows}")
        cursor.close()
        
        print(f"Reloaded Details: {reloaded.detalles}")
        if not reloaded.detalles:
            print("FAILURE: No details found!")
        else:
            det = reloaded.detalles[0]
            print(f"Detail found: CC={det.centro_costo_id}, C={det.concepto_id}, T={det.tercero_id}")
            
            if det.centro_costo_id == ccid and det.concepto_id == cid and det.tercero_id == tid:
                print("SUCCESS: Classification saved correctly.")
            else:
                print("FAILURE: Saved values do not match.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        if 'saved' in locals() and saved.id:
            print("Cleaning up...")
            cursor = conn.cursor()
            cursor.execute("DELETE FROM movimientos_detalle WHERE movimiento_id = %s", (saved.id,))
            cursor.execute("DELETE FROM movimientos_encabezado WHERE Id = %s", (saved.id,))
            conn.commit()
            cursor.close()
            
        conn.close()

if __name__ == "__main__":
    test_save_classification()
