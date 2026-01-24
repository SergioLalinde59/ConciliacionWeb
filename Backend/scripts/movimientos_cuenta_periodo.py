#!/usr/bin/env python3
"""
Script interactivo para revisar el estado de las tablas de la aplicación.
Útil para debugging y verificación de la integridad de datos.

El script solicita interactivamente:
1. ID de la cuenta (o Enter para todas)
2. Año (o Enter para todos)
3. Mes (o Enter para todos)
"""

import sys
import os
import psycopg2
from pathlib import Path

# Cargar configuración desde .env
def load_env_config():
    """Carga la configuración desde el archivo .env del Backend."""
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    env_file = backend_dir / '.env'
    
    config = {
        'host': 'localhost',
        'port': 5433,
        'database': 'Mvtos',
        'user': 'postgres',
        'password': 'SLB'
    }
    
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    if key == 'DB_HOST':
                        config['host'] = value
                    elif key == 'DB_PORT':
                        config['port'] = int(value)
                    elif key == 'DB_NAME':
                        config['database'] = value
                    elif key == 'DB_USER':
                        config['user'] = value
                    elif key == 'DB_PASSWORD':
                        config['password'] = value
    
    return config


def list_cuentas(cur):
    """Lista todas las cuentas disponibles."""
    try:
        cur.execute("SELECT id, nombre FROM cuentas ORDER BY id")
        return cur.fetchall()
    except Exception as e:
        cur.connection.rollback()
        return []


def get_cuenta_nombre(cur, cuenta_id):
    """Obtiene el nombre de una cuenta."""
    try:
        cur.execute("SELECT nombre FROM cuentas WHERE id = %s", (cuenta_id,))
        result = cur.fetchone()
        return result[0] if result else f"Cuenta {cuenta_id}"
    except Exception as e:
        cur.connection.rollback()
        return f"Cuenta {cuenta_id}"


def get_record_count(cur, table_name, cuenta_id=None, year=None, month=None, debug=False):
    """Obtiene el conteo de registros para un período específico."""
    query = f"SELECT COUNT(*) FROM {table_name}"
    conditions = []
    params = []
    
    if cuenta_id:
        # La tabla 'movimientos' usa 'cuentaid', las demás usan 'cuenta_id'
        if table_name == 'movimientos':
            conditions.append("cuentaid = %s")
        else:
            conditions.append("cuenta_id = %s")
        params.append(cuenta_id)
    
    if year:
        conditions.append("EXTRACT(YEAR FROM fecha) = %s")
        params.append(year)
    
    if month:
        conditions.append("EXTRACT(MONTH FROM fecha) = %s")
        params.append(month)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    if debug:
        print(f"\n[DEBUG] Query: {query}")
        print(f"[DEBUG] Params: {params}")
    
    try:
        cur.execute(query, params)
        result = cur.fetchone()[0]
        if debug:
            print(f"[DEBUG] Resultado: {result}")
        return result
    except Exception as e:
        if debug:
            print(f"[DEBUG] Error: {e}")
        # Rollback para poder continuar con otras consultas
        cur.connection.rollback()
        return 0


def get_vinculaciones_count(cur, cuenta_id=None, year=None, month=None, debug=False):
    """Obtiene el conteo de vinculaciones para un período específico."""
    try:
        query = """
            SELECT COUNT(*) 
            FROM movimiento_vinculaciones mv 
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
        """
        conditions = []
        params = []
        
        if cuenta_id:
            conditions.append("me.cuenta_id = %s")
            params.append(cuenta_id)
        
        if year:
            conditions.append("EXTRACT(YEAR FROM me.fecha) = %s")
            params.append(year)
        
        if month:
            conditions.append("EXTRACT(MONTH FROM me.fecha) = %s")
            params.append(month)
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        if debug:
            print(f"\n[DEBUG] Vinculaciones Query: {query}")
            print(f"[DEBUG] Vinculaciones Params: {params}")
        
        cur.execute(query, params)
        result = cur.fetchone()[0]
        if debug:
            print(f"[DEBUG] Vinculaciones Resultado: {result}")
        return result
    except Exception as e:
        if debug:
            print(f"[DEBUG] Error en vinculaciones: {e}")
        cur.connection.rollback()
        cur.execute("SELECT COUNT(*) FROM movimiento_vinculaciones")
        return cur.fetchone()[0]


def format_period(year, month):
    """Formatea el período para mostrar."""
    if year and month:
        return f"{year}-{month:02d}"
    elif year:
        return str(year)
    else:
        return "Todos los periodos"


def main():
    DB_CONFIG = load_env_config()
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("\n" + "="*70)
        print("  REPORTE DE MOVIMIENTOS - CONSULTA INTERACTIVA")
        print("="*70)
        
        # Mostrar cuentas disponibles
        cuentas = list_cuentas(cur)
        if cuentas:
            print("\nCuentas disponibles:")
            for c in cuentas:
                print(f"  {c[0]:>2}. {c[1]}")
        print()
        
        # Commit para limpiar cualquier transacción pendiente
        conn.commit()
        
        # Solicitar ID de cuenta
        cuenta_input = input("Ingrese ID de cuenta (Enter para todas): ").strip()
        cuenta_id = int(cuenta_input) if cuenta_input else None
        
        # Solicitar año
        year_input = input("Ingrese año (Enter para todos): ").strip()
        year = int(year_input) if year_input else None
        
        # Solicitar mes
        month_input = input("Ingrese mes (1-12, Enter para todos): ").strip()
        month = int(month_input) if month_input else None
        
        # Preguntar si quiere modo debug
        debug_input = input("Modo debug? (s/n, Enter=n): ").strip().lower()
        debug = debug_input == 's'
        
        # Obtener información de la cuenta si se especificó
        cuenta_info = None
        cuenta_str = "Todas las cuentas"
        if cuenta_id:
            cuenta_str = get_cuenta_nombre(cur, cuenta_id)
        
        # Commit para asegurar transacción limpia
        conn.commit()
        
        period_str = format_period(year, month)
        
        print("\n" + "="*70)
        print("  REPORTE DE DATOS")
        print("="*70)
        print(f"  Cuenta:  {cuenta_str}")
        print(f"  Periodo: {period_str}")
        print("="*70)
        print()
        
        # Obtener conteos
        mov_count = get_record_count(cur, 'movimientos', cuenta_id, year, month, debug)
        ext_count = get_record_count(cur, 'movimientos_extracto', cuenta_id, year, month, debug)
        vinc_count = get_vinculaciones_count(cur, cuenta_id, year, month, debug)
        
        print(f"  Movimientos:               {mov_count:>8,}")
        print(f"  Movimientos_Extracto:      {ext_count:>8,}")
        print(f"  Movimiento_Vinculaciones:  {vinc_count:>8,}")
        print()
        
        if ext_count > 0:
            vinc_percentage = (vinc_count / ext_count) * 100
            print(f"  Porcentaje de Vinculacion: {vinc_percentage:>7.2f}% ({vinc_count:,}/{ext_count:,})")
        
        if mov_count > 0 and ext_count > 0:
            diff = mov_count - ext_count
            print(f"  Diferencia Sistema-Extracto: {diff:>6,} registros")
        
        print("\n" + "="*70 + "\n")
        
        cur.close()
        conn.close()
        
    except KeyboardInterrupt:
        print("\n\nOperacion cancelada por el usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
