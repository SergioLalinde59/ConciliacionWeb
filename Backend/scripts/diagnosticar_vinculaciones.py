#!/usr/bin/env python3
"""
Script de diagnóstico para identificar vinculaciones huérfanas.
Detecta vinculaciones en movimiento_vinculaciones que no tienen movimiento del sistema correspondiente.
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


def diagnosticar_vinculaciones():
    """Ejecuta el diagnóstico de vinculaciones huérfanas."""
    DB_CONFIG = load_env_config()
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("\n" + "="*70)
        print("  DIAGNÓSTICO DE VINCULACIONES HUÉRFANAS")
        print("="*70 + "\n")
        
        # Solicitar filtros
        cuenta_input = input("Ingrese ID de cuenta (Enter para todas): ").strip()
        cuenta_id = int(cuenta_input) if cuenta_input else None
        
        year_input = input("Ingrese año (Enter para todos): ").strip()
        year = int(year_input) if year_input else None
        
        month_input = input("Ingrese mes (1-12, Enter para todos): ").strip()
        month = int(month_input) if month_input else None
        
        print("\n" + "-"*70)
        print("  RESULTADOS DEL DIAGNÓSTICO")
        print("-"*70 + "\n")
        
        # 1. Vinculaciones donde movimiento_sistema_id es NULL
        query1 = """
            SELECT 
                mv.id as vinculacion_id,
                mv.movimiento_sistema_id,
                mv.movimiento_extracto_id,
                me.descripcion,
                me.valor,
                me.fecha
            FROM movimiento_vinculaciones mv
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE mv.movimiento_sistema_id IS NULL
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
            query1 += " AND " + " AND ".join(conditions)
        
        cur.execute(query1, params)
        null_sistema_id = cur.fetchall()
        
        print(f"1. Vinculaciones con movimiento_sistema_id = NULL: {len(null_sistema_id)}")
        if null_sistema_id:
            for r in null_sistema_id:
                print(f"   - Vinc ID: {r[0]}, Extracto ID: {r[2]}")
                print(f"     Desc: {r[3][:50]}")
                print(f"     Valor: ${r[4]:,.2f}, Fecha: {r[5]}")
        print()
        
        # 2. Vinculaciones donde movimiento_sistema_id no existe en movimientos
        query2 = """
            SELECT 
                mv.id as vinculacion_id,
                mv.movimiento_sistema_id,
                mv.movimiento_extracto_id,
                me.descripcion,
                me.valor,
                me.fecha
            FROM movimiento_vinculaciones mv
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
            WHERE mv.movimiento_sistema_id IS NOT NULL 
              AND m.id IS NULL
        """
        
        if conditions:
            query2 += " AND " + " AND ".join(conditions)
        
        cur.execute(query2, params)
        sistema_no_existe = cur.fetchall()
        
        print(f"2. Vinculaciones donde el movimiento del sistema no existe: {len(sistema_no_existe)}")
        if sistema_no_existe:
            for r in sistema_no_existe:
                print(f"   - Vinc ID: {r[0]}, Sistema ID (no existe): {r[1]}, Extracto ID: {r[2]}")
                print(f"     Desc: {r[3][:50]}")
                print(f"     Valor: ${r[4]:,.2f}, Fecha: {r[5]}")
        print()
        
        # 3. Extractos vinculados múltiples veces
        query3 = """
            SELECT 
                movimiento_extracto_id, 
                COUNT(*) as veces_vinculado,
                ARRAY_AGG(id) as vinculacion_ids
            FROM movimiento_vinculaciones
            WHERE 1=1
        """
        
        if conditions:
            # Necesitamos re-construir las condiciones con el alias correcto
            conditions_mv = []
            if cuenta_id:
                query3 = """
                    SELECT 
                        mv.movimiento_extracto_id, 
                        COUNT(*) as veces_vinculado,
                        ARRAY_AGG(mv.id) as vinculacion_ids
                    FROM movimiento_vinculaciones mv
                    JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
                    WHERE me.cuenta_id = %s
                """
                if year:
                    query3 += " AND EXTRACT(YEAR FROM me.fecha) = %s"
                if month:
                    query3 += " AND EXTRACT(MONTH FROM me.fecha) = %s"
                query3 += " GROUP BY mv.movimiento_extracto_id HAVING COUNT(*) > 1"
        else:
            query3 += " GROUP BY movimiento_extracto_id HAVING COUNT(*) > 1"
        
        cur.execute(query3, params if conditions else [])
        duplicados = cur.fetchall()
        
        print(f"3. Extractos vinculados múltiples veces: {len(duplicados)}")
        if duplicados:
            for r in duplicados:
                print(f"   - Extracto ID: {r[0]}, Vinculado {r[1]} veces")
                print(f"     IDs de vinculaciones: {r[2]}")
        print()
        
        # Resumen
        total_problematicas = len(null_sistema_id) + len(sistema_no_existe)
        
        print("-"*70)
        print(f"RESUMEN: {total_problematicas} vinculaciones huérfanas encontradas")
        
        if total_problematicas > 0:
            print("\nOpciones de solución:")
            print("  1. Eliminar manualmente estas vinculaciones")
            print("  2. Implementar función de limpieza automática")
            print("  3. Re-hacer el matching completo")
        else:
            print("\n✅ No se encontraron vinculaciones huérfanas")
        
        print("\n" + "="*70 + "\n")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    diagnosticar_vinculaciones()
