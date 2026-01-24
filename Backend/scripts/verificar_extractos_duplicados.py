#!/usr/bin/env python3
"""
Script para verificar los detalles de los extractos vinculados incorrectamente.
"""

import psycopg2
from pathlib import Path

def load_env_config():
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
        
        print("\n" + "="*80)
        print("  VERIFICACIÓN DE EXTRACTOS VINCULADOS AL MISMO MOVIMIENTO DEL SISTEMA")
        print("="*80 + "\n")
        
        # Verificar los extractos 1725 y 1726 que están vinculados al movimiento 2134
        extracto_ids = [1725, 1726]
        
        print("📄 EXTRACTOS QUE ESTÁN VINCULADOS AL MOVIMIENTO DEL SISTEMA 2134:\n")
        
        for extracto_id in extracto_ids:
            cur.execute("""
                SELECT 
                    me.id,
                    me.fecha,
                    me.descripcion,
                    me.valor,
                    mv.movimiento_sistema_id,
                    m.descripcion as sistema_descripcion,
                    m.valor as sistema_valor
                FROM movimientos_extracto me
                LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
                LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
                WHERE me.id = %s
            """, (extracto_id,))
            
            result = cur.fetchone()
            if result:
                print(f"Extracto ID: {result[0]}")
                print(f"  Fecha: {result[1]}")
                print(f"  Descripción: {result[2]}")
                print(f"  Valor: ${result[3]:,.2f}")
                if result[4]:
                    print(f"  ✓ Vinculado a Sistema ID: {result[4]}")
                    print(f"    Sistema Descripción: {result[5]}")
                    print(f"    Sistema Valor: ${result[6]:,.2f}")
                else:
                    print(f"  ✗ NO vinculado")
                print()
        
        print("-"*80)
        print("\n💡 ANÁLISIS:")
        print("\nSi los 2 extractos tienen:")
        print("  - Misma descripción")
        print("  - Mismo valor ($2,000,000 cada uno)")
        print("  - Mismo fecha")
        print("\nEntonces son DOS movimientos DIFERENTES en el extracto,")
        print("pero solo hay UNO en el sistema.")
        print("\n⚠️  PROBLEMA: Falta 1 movimiento en el sistema.")
        print("   El sistema debería tener 2 movimientos de TRASLADO A FONDO DE INVERSION")
        print("   para coincidir con los 2 del extracto.")
        
        print("\n" + "="*80)
        
        # Ahora verificar el otro caso (Transferencia Cta Suc)
        print("\n📄 EXTRACTOS QUE ESTÁN VINCULADOS AL MOVIMIENTO DEL SISTEMA 173:\n")
        
        extracto_ids_2 = [1730, 1731]
        
        for extracto_id in extracto_ids_2:
            cur.execute("""
                SELECT 
                    me.id,
                    me.fecha,
                    me.descripcion,
                    me.valor,
                    mv.movimiento_sistema_id,
                    m.descripcion as sistema_descripcion,
                    m.valor as sistema_valor
                FROM movimientos_extracto me
                LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
                LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
                WHERE me.id = %s
            """, (extracto_id,))
            
            result = cur.fetchone()
            if result:
                print(f"Extracto ID: {result[0]}")
                print(f"  Fecha: {result[1]}")
                print(f"  Descripción: {result[2]}")
                print(f"  Valor: ${result[3]:,.2f}")
                if result[4]:
                    print(f"  ✓ Vinculado a Sistema ID: {result[4]}")
                    print(f"    Sistema Descripción: {result[5]}")
                    print(f"    Sistema Valor: ${result[6]:,.2f}")
                else:
                    print(f"  ✗ NO vinculado")
                print()
        
        print("\n" + "="*80 + "\n")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
