#!/usr/bin/env python3
"""
Script para verificar si hay movimientos del sistema vinculados múltiples veces.
"""

import psycopg2
from pathlib import Path

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


def main():
    DB_CONFIG = load_env_config()
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("\n" + "="*70)
        print("  ANÁLISIS DE VINCULACIONES 1-A-MUCHOS")
        print("="*70 + "\n")
        
        # Solicitar filtros
        cuenta_input = input("Ingrese ID de cuenta (Enter para todas): ").strip()
        cuenta_id = int(cuenta_input) if cuenta_input else None
        
        year_input = input("Ingrese año (Enter para todos): ").strip()
        year = int(year_input) if year_input else None
        
        month_input = input("Ingrese mes (1-12, Enter para todos): ").strip()
        month = int(month_input) if month_input else None
        
        print("\n" + "-"*70)
        
        # Verificar movimientos del sistema vinculados múltiples veces
        query = """
            SELECT 
                mv.movimiento_sistema_id,
                COUNT(*) as veces_vinculado,
                ARRAY_AGG(mv.movimiento_extracto_id) as extracto_ids,
                m.descripcion,
                m.valor,
                m.fecha
            FROM movimiento_vinculaciones mv
            JOIN movimientos m ON mv.movimiento_sistema_id = m.id
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE 1=1
        """
        
        conditions = []
        params = []
        
        if cuenta_id:
            conditions.append("m.cuentaid = %s")
            params.append(cuenta_id)
        
        if year:
            conditions.append("EXTRACT(YEAR FROM m.fecha) = %s")
            params.append(year)
        
        if month:
            conditions.append("EXTRACT(MONTH FROM m.fecha) = %s")
            params.append(month)
        
        if conditions:
            query += " AND " + " AND ".join(conditions)
        
        query += """
            GROUP BY mv.movimiento_sistema_id, m.descripcion, m.valor, m.fecha
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
        """
        
        cur.execute(query, params)
        duplicados = cur.fetchall()
        
        print(f"\nMovimientos del SISTEMA vinculados a MÚLTIPLES extractos: {len(duplicados)}\n")
        
        if duplicados:
            for idx, r in enumerate(duplicados, 1):
                print(f"{idx}. Movimiento Sistema ID: {r[0]} (vinculado {r[1]} veces)")
                print(f"   Descripción: {r[3][:60]}")
                print(f"   Valor: ${r[4]:,.2f}, Fecha: {r[5]}")
                print(f"   Extractos vinculados: {r[2]}")
                print()
        else:
            print("✅ No se encontraron movimientos del sistema vinculados múltiples veces\n")
        
        # Estadísticas generales
        print("-"*70)
        
        # Contar movimientos únicos del sistema con vinculación
        query_count = """
            SELECT COUNT(DISTINCT mv.movimiento_sistema_id)
            FROM movimiento_vinculaciones mv
            JOIN movimientos m ON mv.movimiento_sistema_id = m.id
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE 1=1
        """
        
        if conditions:
            query_count += " AND " + " AND ".join(conditions)
        
        cur.execute(query_count, params)
        movimientos_unicos = cur.fetchone()[0]
        
        # Contar total de vinculaciones
        query_vinc = """
            SELECT COUNT(*)
            FROM movimiento_vinculaciones mv
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE 1=1
        """
        
        conditions_me = []
        params_me = []
        
        if cuenta_id:
            conditions_me.append("me.cuenta_id = %s")
            params_me.append(cuenta_id)
        
        if year:
            conditions_me.append("EXTRACT(YEAR FROM me.fecha) = %s")
            params_me.append(year)
        
        if month:
            conditions_me.append("EXTRACT(MONTH FROM me.fecha) = %s")
            params_me.append(month)
        
        if conditions_me:
            query_vinc += " AND " + " AND ".join(conditions_me)
        
        cur.execute(query_vinc, params_me)
        total_vinculaciones = cur.fetchone()[0]
        
        print("\nESTADÍSTICAS:")
        print(f"  Movimientos únicos del sistema (con vinculación): {movimientos_unicos}")
        print(f"  Total de vinculaciones: {total_vinculaciones}")
        print(f"  Diferencia (vinculaciones extra): {total_vinculaciones - movimientos_unicos}")
        
        if total_vinculaciones > movimientos_unicos:
            print(f"\n⚠️  Hay {total_vinculaciones - movimientos_unicos} vinculaciones extra debido a relaciones 1-a-muchos")
        
        print("\n" + "="*70 + "\n")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
