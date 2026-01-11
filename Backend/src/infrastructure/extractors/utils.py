from datetime import datetime
from decimal import Decimal
from typing import Optional

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
