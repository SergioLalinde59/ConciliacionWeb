"""
Servicio para gestionar la detección y corrección de matches 1-a-muchos.
"""
from typing import List, Dict, Any
from database import get_db_connection


def detectar_matches_1_a_muchos(cuenta_id: int, year: int, month: int) -> Dict[str, Any]:
    """
    Detecta movimientos del sistema vinculados a múltiples extractos.
    
    Args:
        cuenta_id: ID de la cuenta
        year: Año a analizar
        month: Mes a analizar
        
    Returns:
        Dict con casos problemáticos y estadísticas
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                m.id as sistema_id,
                m.descripcion,
                m.valor,
                m.fecha,
                COUNT(mv.id) as num_vinculaciones,
                ARRAY_AGG(mv.movimiento_extracto_id ORDER BY mv.id) as extracto_ids,
                ARRAY_AGG(me.descripcion ORDER BY mv.id) as extracto_descripciones,
                ARRAY_AGG(me.valor ORDER BY mv.id) as extracto_valores
            FROM movimientos m
            JOIN movimiento_vinculaciones mv ON m.id = mv.movimiento_sistema_id
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE m.cuentaid = %s
              AND EXTRACT(YEAR FROM m.fecha) = %s
              AND EXTRACT(MONTH FROM m.fecha) = %s
            GROUP BY m.id, m.descripcion, m.valor, m.fecha
            HAVING COUNT(mv.id) > 1
            ORDER BY COUNT(mv.id) DESC
        """
        
        cursor.execute(query, (cuenta_id, year, month))
        resultados = cursor.fetchall()
        
        casos_problematicos = []
        total_extractos_afectados = 0
        
        for row in resultados:
            caso = {
                'sistema_id': row[0],
                'sistema_descripcion': row[1],
                'sistema_valor': float(row[2]) if row[2] else 0,
                'sistema_fecha': row[3].isoformat() if row[3] else None,
                'num_vinculaciones': row[4],
                'extracto_ids': row[5],
                'extracto_descripciones': row[6],
                'extracto_valores': [float(v) if v else 0 for v in row[7]]
            }
            casos_problematicos.append(caso)
            total_extractos_afectados += row[4]
        
        return {
            'casos_problematicos': casos_problematicos,
            'total_movimientos_sistema_afectados': len(casos_problematicos),
            'total_extractos_afectados': total_extractos_afectados
        }
        
    finally:
        cursor.close()
        conn.close()


def invalidar_matches_1_a_muchos(cuenta_id: int, year: int, month: int) -> Dict[str, Any]:
    """
    Elimina vinculaciones donde 1 movimiento del sistema está vinculado a múltiples extractos.
    
    Args:
        cuenta_id: ID de la cuenta
        year: Año a analizar
        month: Mes a analizar
        
    Returns:
        Dict con resumen de cambios realizados
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Detectar casos problemáticos
        casos = detectar_matches_1_a_muchos(cuenta_id, year, month)
        
        if not casos['casos_problematicos']:
            return {
                'vinculaciones_eliminadas': 0,
                'movimientos_sistema_afectados': 0,
                'extractos_ahora_sin_match': 0,
                'mensaje': 'No se encontraron matches 1-a-muchos'
            }
        
        # 2. Eliminar TODAS las vinculaciones de esos movimientos del sistema
        movimientos_sistema_ids = [caso['sistema_id'] for caso in casos['casos_problematicos']]
        
        delete_query = """
            DELETE FROM movimiento_vinculaciones
            WHERE movimiento_sistema_id = ANY(%s)
        """
        
        cursor.execute(delete_query, (movimientos_sistema_ids,))
        vinculaciones_eliminadas = cursor.rowcount
        
        conn.commit()
        
        return {
            'vinculaciones_eliminadas': vinculaciones_eliminadas,
            'movimientos_sistema_afectados': len(movimientos_sistema_ids),
            'extractos_ahora_sin_match': casos['total_extractos_afectados'],
            'mensaje': f'Se eliminaron {vinculaciones_eliminadas} vinculaciones incorrectas',
            'casos_corregidos': casos['casos_problematicos']
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
