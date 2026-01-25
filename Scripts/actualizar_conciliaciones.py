
import sys
import os
import argparse
from datetime import date

# Add Backend to python path
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool
from src.infrastructure.database.postgres_conciliacion_repository import PostgresConciliacionRepository
from src.domain.models.conciliacion import Conciliacion

def format_currency(value):
    if value is None:
        return "0.00"
    return f"{value:,.2f}"

def actualizar_conciliaciones(cuenta_id=None, year=None, month=None):
    """
    Actualiza la tabla conciliaciones para los periodos encontrados.
    Si se especifican filtros, solo actualiza esos.
    """
    print("Initializing connection pool...")
    pool = get_connection_pool()
    conn = pool.getconn()
    
    try:
        cursor = conn.cursor()
        repo = PostgresConciliacionRepository(conn)
        
        print("Finding periods to update...")
        
        # Base query to find distinct periods from BOTH movements and extracts
        query = """
            SELECT DISTINCT cuenta_id, year, month 
            FROM (
                SELECT CuentaID as cuenta_id, 
                       EXTRACT(YEAR FROM Fecha)::INT as year, 
                       EXTRACT(MONTH FROM Fecha)::INT as month
                FROM movimientos
                WHERE CuentaID IS NOT NULL
                
                UNION
                
                SELECT cuenta_id, year, month
                FROM movimientos_extracto
            ) as combined
            WHERE 1=1
        """
        
        params = []
        if cuenta_id:
            query += " AND cuenta_id = %s"
            params.append(cuenta_id)
        if year:
            query += " AND year = %s"
            params.append(year)
        if month:
            query += " AND month = %s"
            params.append(month)
            
        query += " ORDER BY year DESC, month DESC, cuenta_id"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} periods to process.")
        
        results = []
        
        for row in rows:
            c_id, y, m = row
            
            existing = repo.obtener_por_periodo(c_id, y, m)
            
            if not existing:
                new_rec = Conciliacion(
                    id=None,
                    cuenta_id=c_id,
                    year=y,
                    month=m,
                    fecha_corte=date(y, m, 1), 
                    extracto_saldo_anterior=0,
                    extracto_entradas=0,
                    extracto_salidas=0,
                    extracto_saldo_final=0,
                    datos_extra={},
                    estado='PENDIENTE'
                )
                repo.guardar(new_rec)
                existing = repo.obtener_por_periodo(c_id, y, m)
            
            if existing:
                 updated_conciliacion = repo.recalcular_sistema(c_id, y, m)
                 if updated_conciliacion:
                     existing = updated_conciliacion
                 
                 results.append(existing)
            
        # Print Results
        print("\n=== Resultados de Actualización ===")
        
        for r in results:
            print("\n" + "="*80)
            # Header Block
            header = f"CUENTA: {r.cuenta_id} | PERIODO: {r.year}/{r.month} | ESTADO: {r.estado}"
            print(header.center(80))
            print(f"Fecha Corte: {r.fecha_corte}".center(80))
            print("-" * 80)
            
            # Comparative Table
            # Columns: Concepto, Extracto, Sistema, Diferencia
            
            headers = ["CONCEPTO", "EXTRACTO", "SISTEMA", "DIFERENCIA (Ext-Sis)"]
            widths = [20, 20, 20, 20]
            
            header_str = "".join([h.ljust(widths[i]) if i==0 else h.rjust(widths[i]) for i, h in enumerate(headers)])
            print(header_str)
            print("-" * 80)
            
            # Prepare rows
            # Note: For Saldo Anterior, implicit system logic assumes it starts same as extract usually, 
            # BUT let's verify logic. System saldo final = Ext_Ant + Sys_Ent - Sys_Sal.
            # So effectively Sys_Start = Ext_Start.
            # We will show that.
            
            ext_ant = r.extracto_saldo_anterior or 0
            sys_ant = ext_ant # Implicit per business logic
            
            ext_ent = r.extracto_entradas or 0
            sys_ent = r.sistema_entradas or 0
            
            ext_sal = r.extracto_salidas or 0
            sys_sal = r.sistema_salidas or 0
            
            ext_fin = r.extracto_saldo_final or 0
            sys_fin = r.sistema_saldo_final or 0
            
            rows = [
                ("Saldo Anterior", ext_ant, sys_ant),
                ("Entradas (+)", ext_ent, sys_ent),
                ("Salidas (-)", ext_sal, sys_sal),
                ("Saldo Final (=)", ext_fin, sys_fin)
            ]
            
            for label, e_val, s_val in rows:
                diff = e_val - s_val
                print(f"{label.ljust(widths[0])}"
                      f"{format_currency(e_val).rjust(widths[1])}"
                      f"{format_currency(s_val).rjust(widths[2])}"
                      f"{format_currency(diff).rjust(widths[3])}")
            
            print("="*80)
            
        print(f"\nTotal processed: {len(results)}")
        
    except Exception as e:
        print(f"\nError updating conciliaciones: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        pool.putconn(conn)
        pool.closeall()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Actualizar tabla conciliaciones')
    parser.add_argument('--cuenta', type=int, help='ID de cuenta especifico')
    parser.add_argument('--year', type=int, help='Año especifico')
    parser.add_argument('--month', type=int, help='Mes especifico')
    
    args = parser.parse_args()
    
    # Si no se pasan argumentos, preguntar interactivamente
    if args.cuenta is None and args.year is None and args.month is None:
        try:
            print("--- Actualizar Conciliaciones ---")
            c_input = input("Ingrese ID de Cuenta (Enter para todas): ").strip()
            cuenta_id = int(c_input) if c_input else None
            
            y_input = input("Ingrese Año (Enter para todos): ").strip()
            year = int(y_input) if y_input else None
            
            m_input = input("Ingrese Mes (Enter para todos): ").strip()
            month = int(m_input) if m_input else None
            
            actualizar_conciliaciones(cuenta_id, year, month)
        except ValueError:
            print("Error: Entrada numérica inválida.")
    else:
        actualizar_conciliaciones(args.cuenta, args.year, args.month)
