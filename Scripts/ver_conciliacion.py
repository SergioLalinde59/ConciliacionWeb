
import sys
import os
import decimal
from datetime import datetime

# Add Backend to python path to allow imports
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool

def format_currency(value):
    if value is None:
        return "N/A"
    return f"{value:,.2f}"

def format_header(text, width):
    return text.center(width)

def format_cell(value, width):
    return str(value).rjust(width)

def run():
    print("--- Ver Conciliación ---")
    
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
        cursor = conn.cursor()
        
        # 1. List Accounts
        print("\nCuentas Disponibles:")
        cursor.execute("SELECT cuentaid, cuenta FROM cuentas WHERE activa = TRUE ORDER BY cuenta")
        cuentas = cursor.fetchall()
        for c in cuentas:
            print(f"  ID: {c[0]} - {c[1]}")
            
        # 2. Get Inputs
        try:
            cuenta_id_str = input("\nIngrese ID de la Cuenta: ").strip()
            if not cuenta_id_str:
                print("Operación cancelada.")
                return
            cuenta_id = int(cuenta_id_str)
            
            year_str = input("Ingrese Año (YYYY): ").strip()
            if not year_str:
                year = datetime.now().year
                print(f"Usando año actual: {year}")
            else:
                year = int(year_str) 
                
            month_str = input("Ingrese Mes (1-12): ").strip()
            if not month_str:
                 month = datetime.now().month
                 print(f"Usando mes actual: {month}")
            else:
                month = int(month_str)
                
        except ValueError:
            print("Error: Entrada inválida. Por favor ingrese números.")
            return

        # 3. Query Data
        sql = """
            SELECT 
                id, estado, fecha_corte,
                extracto_saldo_anterior, extracto_entradas, extracto_salidas, extracto_saldo_final,
                sistema_entradas, sistema_salidas, sistema_saldo_final,
                diferencia_saldo
            FROM conciliaciones 
            WHERE cuenta_id = %s AND year = %s AND month = %s
        """
        
        cursor.execute(sql, (cuenta_id, year, month))
        row = cursor.fetchone()
        
        if row:
            print(f"\nResultados para Cuenta {cuenta_id} - {year}/{month}")
            print("-" * 60)
            
            # Basic Info
            print(f"ID Conciliación: {row[0]}")
            print(f"Estado:          {row[1]}")
            print(f"Fecha Corte:     {row[2]}")
            print("-" * 60)
            
            # Financial Data Table
            headers = ["Concepto", "Extracto", "Sistema", "Diferencia"]
            col_widths = [20, 20, 20, 20]
            
            # Print Header
            header_str = " | ".join([format_header(h, w) for h, w in zip(headers, col_widths)])
            print(header_str)
            print("-" * (sum(col_widths) + 3*3)) # 3 separators of 3 chars each
            
            # Data Mapping
            # extracto is index 3, 4, 5, 6 (ant, ent, sal, fin)
            # sistema is index 7, 8, 9 (ent, sal, fin). Note: Sistema usually doesn't store 'Initial Balance' in this table explicitly as a column in the displayed schema snippet, but let's check. 
            # Looking at create_conciliaciones_table.py: 
            # sistema_entradas, sistema_salidas, sistema_saldo_final.
            
            # Rows to display
            rows_to_print = [
                ("Saldo Anterior", row[3], None, None), # Extracto Start
                ("Entradas (+)", row[4], row[7], None),
                ("Salidas (-)", row[5], row[8], None),
                ("Saldo Final (=)", row[6], row[9], row[10]) # Diff is row[10]
            ]
            
            for label, ext_val, sis_val, diff_val in rows_to_print:
                ext_str = format_currency(ext_val) if ext_val is not None else "-"
                sis_str = format_currency(sis_val) if sis_val is not None else "-"
                
                # Diff only makes sense for Final Balance in this specific schema context usually, 
                # or if we calculated it. The DB calculates `diferencia_saldo`.
                diff_str = format_currency(diff_val) if diff_val is not None else ""
                
                print(f"{label.ljust(col_widths[0])} | {ext_str.rjust(col_widths[1])} | {sis_str.rjust(col_widths[2])} | {diff_str.rjust(col_widths[3])}")
                
            print("-" * (sum(col_widths) + 3*3))

        else:
            print(f"\nNo se encontró ninguna conciliación para Cuenta {cuenta_id}, Año {year}, Mes {month}.")
            
    except Exception as e:
        print(f"\nError al consultar la base de datos: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'pool' in locals():
            if 'conn' in locals():
                pool.putconn(conn)
            pool.closeall()

if __name__ == "__main__":
    run()
