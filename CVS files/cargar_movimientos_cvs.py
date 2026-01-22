import csv
import psycopg2
import os
import sys
from collections import Counter

# Configuracion de archivos
CSV_FILE = '2026-01-09 movimientos.csv'
ENV_FILE = '../Backend/.env'

def leer_env(ruta_env):
    """Lee el archivo .env y retorna un diccionario con las variables"""
    config = {}
    if not os.path.exists(ruta_env):
        print(f"Advertencia: No se encontro el archivo .env en {ruta_env}")
        return config
    
    with open(ruta_env, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
                except ValueError:
                    continue
    return config

def conectar_bd(config):
    """Establece conexion a la base de datos"""
    try:
        conn = psycopg2.connect(
            host=config.get('DB_HOST', 'localhost'),
            port=config.get('DB_PORT', '5432'),
            dbname=config.get('DB_NAME', 'postgres'),
            user=config.get('DB_USER', 'postgres'),
            password=config.get('DB_PASSWORD', '')
        )
        return conn
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

def limpiar_valor(valor_str):
    if not valor_str:
        return None
    return valor_str

def cargar_movimientos():
    print(f"Iniciando carga de {CSV_FILE}...")
    
    # Leer config
    config = leer_env(ENV_FILE)
    if not config:
        print("No se pudo cargar la configuracion. Usando valores por defecto/vacios.")

    conn = conectar_bd(config)
    if not conn:
        print("Cancelando proceso por falta de conexion.")
        return

    cursor = conn.cursor()
    
    # Contadores
    total_leidos = 0
    total_insertados = 0
    total_errores = 0
    stats_por_cuenta = Counter()
    errores_detalle = []

    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            print("Archivo abierto correctamente. Procesando filas...")
            
            for row in reader:
                total_leidos += 1
                try:
                    # Mapeo basado en '2026-01-09 movimientos.csv'
                    # Headers: ID,Fecha,Cuenta ID,Cuenta,Tercero ID,Tercero,Grupo ID,Grupo,Concepto ID,Concepto,Valor,Moneda ID,Moneda,Valor USD,TRM,Detalle,Descripción,Referencia,Creación
                    
                    fecha = limpiar_valor(row.get('Fecha'))
                    cuenta_id = limpiar_valor(row.get('Cuenta ID'))
                    
                    # Para estadisticas
                    if cuenta_id:
                        stats_por_cuenta[cuenta_id] += 1
                    
                    descripcion = limpiar_valor(row.get('Descripción'))
                    referencia = limpiar_valor(row.get('Referencia'))
                    valor = limpiar_valor(row.get('Valor'))
                    usd = limpiar_valor(row.get('Valor USD'))
                    trm = limpiar_valor(row.get('TRM'))
                    moneda_id = limpiar_valor(row.get('Moneda ID'))
                    tercero_id = limpiar_valor(row.get('Tercero ID'))
                    centro_costo_id = limpiar_valor(row.get('Grupo ID'))
                    concepto_id = limpiar_valor(row.get('Concepto ID'))
                    detalle = limpiar_valor(row.get('Detalle'))
                    
                    # Query INSERT
                    query = """
                        INSERT INTO movimientos (
                            Fecha, Descripcion, Referencia, Valor, USD, TRM, 
                            MonedaID, CuentaID, TerceroID, centro_costo_id, ConceptoID, Detalle
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    cursor.execute(query, (
                        fecha, descripcion, referencia, valor, usd, trm,
                        moneda_id, cuenta_id, tercero_id, centro_costo_id, concepto_id, detalle
                    ))
                    
                    total_insertados += 1
                    
                except Exception as e:
                    total_errores += 1
                    error_msg = f"Fila {total_leidos}: {str(e)}"
                    errores_detalle.append(error_msg)
                    conn.rollback() 
                    # print(f"Error en fila {total_leidos} (Rolled back): {e}")
                    continue

                conn.commit()

        print("\n" + "="*40)
        print("REPORTE DE CARGA")
        print("="*40)
        
        print("\nEstadisticas por Cuenta ID:")
        print(f"{'Cuenta ID':<10} | {'Registros':<10}")
        print("-" * 23)
        # Ordenar por Cuenta ID si es numerico, sino alfabetico
        cuentas_ordenadas = sorted(stats_por_cuenta.keys(), key=lambda x: int(x) if x and x.isdigit() else 0)
        
        total_calculado_cuentas = 0
        for c_id in cuentas_ordenadas:
            count = stats_por_cuenta[c_id]
            print(f"{c_id:<10} | {count:<10}")
            total_calculado_cuentas += count
            
        print("-" * 23)
        print(f"{'TOTAL':<10} | {total_calculado_cuentas:<10}")

        print("\n" + "="*40)
        print(f"Total Registros Leidos:     {total_leidos}")
        print(f"Total Insertados Exitosis:  {total_insertados}")
        print(f"Total Errores:              {total_errores}")
        
        if errores_detalle:
            print("\nDetalle de Errores (Primeros 10):")
            for err in errores_detalle[:10]:
                print(f" - {err}")
            if len(errores_detalle) > 10:
                print(f" ... y {len(errores_detalle)-10} mas.")

    except FileNotFoundError:
        print(f"Error: No se encontro el archivo CSV: {CSV_FILE}")
    except Exception as e:
        print(f"Error inesperado: {e}")
    finally:
        if conn:
            conn.close()
            print("\nConexion cerrada.")

if __name__ == "__main__":
    cargar_movimientos()
