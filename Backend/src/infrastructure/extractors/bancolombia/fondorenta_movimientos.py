"""
Extractor de movimientos para FondoRenta (Cibest Capital - Bancolombia).
Lee PDFs de movimientos del fondo.
"""

from decimal import Decimal
import pdfplumber
import re
import logging
from typing import List, Dict, Any
from ..utils import parsear_fecha, parsear_valor

logger = logging.getLogger(__name__)


def extraer_movimientos(file_obj: Any) -> List[Dict]:
    """
    Extrae todos los movimientos de un PDF de Fondo Renta (Renta Fija Plazo).
    Formato: FECHA (YYYYMMDD) | TRANSACCIÓN | VALOR EN PESOS ...
    """
    movimientos_raw = []
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            for page in pdf.pages:
                texto = page.extract_text()
                if texto:
                    movs = _extraer_movimientos_desde_texto(texto)
                    movimientos_raw.extend(movs)
    except Exception as e:
        raise Exception(f"Error al leer PDF Fondo Renta: {e}")
    
    
    # Procesar
    return _procesar_movimientos(movimientos_raw)


def _procesar_movimientos(movimientos_raw: List[Dict]) -> List[Dict]:
    movimientos_procesados = []
    
    # Mapeo de meses en español a números
    meses_es = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    }
    
    for mov in movimientos_raw:
        fecha_str = mov['fecha_str']
        fecha = None
        
        # Nuevo formato: "13 Ene 2026"
        if ' ' in fecha_str:
            partes = fecha_str.split()
            if len(partes) == 3:
                dia = partes[0].zfill(2)
                mes_nombre = partes[1].lower()[:3]
                anio = partes[2]
                
                mes = meses_es.get(mes_nombre, '01')
                fecha = f"{anio}-{mes}-{dia}"
        # Formato antiguo: YYYYMMDD
        elif len(fecha_str) == 8 and fecha_str.isdigit():
            fecha = f"{fecha_str[:4]}-{fecha_str[4:6]}-{fecha_str[6:]}"
        else:
            fecha = parsear_fecha(fecha_str)

        # Parsear valor (puede venir con $ o -$)
        valor = parsear_valor(mov['valor_str'].replace('$', '').strip())
        descripcion = mov['descripcion'].strip().upper()
        
        # Lógica de signos basada en descripción
        # "Traslado hacia cuenta" -> Salida (negativo)
        # "Traslado desde cuenta" -> Entrada (positivo)
        if valor is not None:
            if any(x in descripcion for x in ['HACIA', 'RETIRO', 'RETEFTE', 'RETENCION', 'COMISION', 'GMF']):
                valor = abs(valor) * -1
            else:
                valor = abs(valor)
            
            movimientos_procesados.append({
                'fecha': fecha,
                'descripcion': mov['descripcion'].strip(),
                'referencia': mov['referencia'].strip(),
                'valor': valor
            })
    
    return movimientos_procesados


def _extraer_movimientos_desde_texto(texto: str) -> List[Dict]:
    """
    Extrae movimientos del PDF de FondoRenta.
    
    Formato observado (multi-línea):
    Traslado hacia cuenta
    13 Ene 2026 -- -$ 500.000,00 -$ 500.000,00
    de ahorros
    
    O también:
    Traslado desde cuenta
    06 Ene 2026 124,506416 $ 5.000.000,00 $ 5.000.000,00
    de ahorros
    """
    movimientos = []
    lines = texto.split('\n')
    
    # DEBUG: Print full text to identify format
    logger.error("=" * 80)
    logger.error("DEBUG FONDORENTA MOVIMIENTOS - TEXTO EXTRAÍDO DEL PDF:")
    logger.error(texto)
    logger.error("=" * 80)
    logger.error(f"Total de líneas: {len(lines)}")
    logger.error("=" * 80)
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Buscar líneas que empiezan con "Traslado"
        if line.startswith("Traslado"):
            descripcion_parte1 = line
            
            # La siguiente línea debe tener la fecha y valores
            if i + 1 < len(lines):
                fecha_line = lines[i + 1].strip()
                
                # Regex para línea de fecha: "13 Ene 2026 ... $ 5.000.000,00 ..."
                # Buscar patrón: DD Mmm YYYY seguido de valor monetario
                fecha_match = re.match(r'(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+.*?(-?\$\s*[\d.]+,\d{2})', fecha_line)
                
                if fecha_match:
                    fecha_str = fecha_match.group(1)  # "13 Ene 2026"
                    valor_str = fecha_match.group(2)    # "-$ 500.000,00" o "$ 5.000.000,00"
                    
                    # Descripción parte 2 (siguiente línea)
                    descripcion_parte2 = ""
                    if i + 2 < len(lines):
                        descripcion_parte2 = lines[i + 2].strip()
                    
                    # Combinar descripción
                    descripcion = f"{descripcion_parte1} {descripcion_parte2}".strip()
                    
                    movimientos.append({
                        'fecha_str': fecha_str,
                        'descripcion': descripcion,
                        'referencia': "",
                        'valor_str': valor_str
                    })
                    
                    # Avanzar 3 líneas (descripción1 + fecha + descripción2)
                    i += 3
                    continue
        
        i += 1
    
    logger.error(f"DEBUG: Extrajimos {len(movimientos)} movimientos")
    for mov in movimientos:
        logger.error(f"  - {mov['fecha_str']} | {mov['descripcion']} | {mov['valor_str']}")
    
    return movimientos
