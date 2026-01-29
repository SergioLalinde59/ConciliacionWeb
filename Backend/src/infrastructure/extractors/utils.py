from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime
import re

def parsear_fecha(fecha_str: str) -> Optional[str]:
    """
    Convierte una fecha en formato "DD mes YYYY" a datetime.
    Ejemplo: "27 dic 2025" -> datetime(2025, 12, 27)
    """
    if not fecha_str or not fecha_str.strip():
        return None
    
    try:
        # Mapeo de meses en español
        meses = {
            'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
            'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        partes = fecha_str.lower().split()
        if len(partes) < 3: return None

        dia = int(partes[0])
        mes_str = partes[1][:3] # Primeras 3 letras
        mes = meses.get(mes_str)
        if not mes: return None
        año = int(partes[2])
        
        return datetime(año, mes, dia).date().isoformat()
    except Exception as e:
        print(f"⚠ Error al parsear fecha '{fecha_str}': {e}")
        return None


def parsear_valor(valor_str: str) -> Optional[Decimal]:
    """
    Convierte un valor en formato "$X.XXX,XX" o "-$ X.XXX,XX" a Decimal.
    """
    if not valor_str or not valor_str.strip():
        return None
    
    try:
        # Limpiar el string
        valor = valor_str.strip()
        es_negativo = False
        
        # Detectar signo negativo
        if valor.startswith('-'):
            es_negativo = True
            valor = valor[1:].strip()
        
        # Remover símbolo de peso y espacios
        valor = valor.replace('$', '').strip()
        
        # Remover puntos (separadores de miles) y reemplazar coma por punto (decimal)
        valor = valor.replace('.', '').replace(',', '.')
        
        resultado = Decimal(valor)
        
        if es_negativo:
            resultado = -resultado
        
        return resultado
    except Exception as e:
        print(f"⚠ Error al parsear valor '{valor_str}': {e}")
        return None

def obtener_nombre_mes(mes_idx: int) -> str:
    """Retorna el nombre corto del mes (ENE, FEB, etc.). 1-indexed."""
    meses_es = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
    if 1 <= mes_idx <= 12:
        return meses_es[mes_idx - 1]
    return "UNK"

def extraer_periodo_de_movimientos(movs: List[Dict[str, Any]]) -> Optional[str]:
    """
    Retorna "YYYY-MMM" basado en las fechas de los movimientos.
    Se asume que los movimientos tienen un campo 'fecha' en formato ISO (YYYY-MM-DD).
    """
    if not movs:
        return None
    
    try:
        # Extraer todas las fechas válidas
        fechas = [m['fecha'] for m in movs if m.get('fecha') and isinstance(m['fecha'], str)]
        if not fechas:
            return None
        
        # En el caso más común, todos los movimientos son del mismo mes.
        # Usamos la primera fecha para determinar el periodo.
        # Podríamos hacer un conteo por mes si fuera necesario, pero por ahora esto es suficiente.
        fecha_str = fechas[0]
        partes = fecha_str.split('-')
        if len(partes) >= 2:
            year = partes[0]
            month = int(partes[1])
            return f"{year}-{obtener_nombre_mes(month)}"
    except Exception as e:
        print(f"⚠ Error al extraer periodo de movimientos: {e}")
    
    return None

def extraer_periodo_de_nombre_archivo(filename: str) -> Optional[Tuple[int, int]]:
    """Extrae año y mes del nombre del archivo (ej: 2025-01 o 202501)."""
    if not filename:
        return None
        
    match = re.search(r'(\d{4})[-_ ]?(\d{2})', filename)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        if 2000 < year < 2100 and 1 <= month <= 12:
            return year, month
    return None
