"""
Extractor de movimientos individuales para FondoRenta Bancolombia.
Lee PDFs de extracto y extrae cada transacción.
"""
import pdfplumber
import re
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime
def extraer_movimientos(file_obj: Any) -> List[Dict[str, Any]]:
    """
    Extrae los movimientos individuales de un extracto FondoRenta.
    
    Retorna: Lista de diccionarios (mismo formato que ahorros_extracto_movimientos)
    """
    movimientos = []
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            numero_linea = 0
            
            for page in pdf.pages:
                texto = page.extract_text()
                if not texto:
                    continue
                
                movs_pagina = _extraer_movimientos_desde_texto(texto, numero_linea)
                movimientos.extend(movs_pagina)
                numero_linea += len(movs_pagina)
                
    except Exception as e:
        raise Exception(f"Error al leer movimientos del PDF FondoRenta: {e}")
    
    print(f"DEBUG: Total movimientos encontrados en FondoRenta: {len(movimientos)}")
    return movimientos

def _extraer_movimientos_desde_texto(texto: str, offset_linea: int) -> List[Dict[str, Any]]:
    """
    Extrae movimientos desde el texto de una página del PDF.
    """
    movimientos = []
    lineas = texto.split('\n')
    
    print(f"DEBUG: Procesando texto de página, longitud: {len(texto)}")
    
    # Regex ajustado al formato observado: YYYYMMDD + Descripción + Valor
    # Ejemplo: 20251201 ADICION 7.000.000,00
    patron_movimiento = re.compile(
        r'^\s*(\d{8})\s+(.+?)\s+([\d.,]+)',
        re.MULTILINE
    )
    
    for linea in lineas:
        linea = linea.strip()
        if not linea:
            continue
            
        match = patron_movimiento.search(linea)
        if match:
            fecha_str = match.group(1)
            descripcion = match.group(2).strip()
            valor_str = match.group(3)
            
            # Debug para verificar qué está encontrando
            print(f"DEBUG: MATCH - Fecha: {fecha_str}, Desc: {descripcion}, Valor: {valor_str}")
            
            try:
                # Formato YYYYMMDD (Ej: 20251201)
                fecha = datetime.strptime(fecha_str, '%Y%m%d').date()
                valor = _parsear_valor(valor_str)
                
                # Definir signo según propuesta: ADICION positivo, resto negativo
                if "ADICION" in descripcion.upper():
                    valor = abs(valor)
                else:
                    valor = -abs(valor)
                
                movimientos.append({
                    'fecha': fecha,
                    'descripcion': descripcion,
                    'referencia': '', # No parece haber referencia explicita en este formato
                    'valor': valor,
                    'numero_linea': offset_linea + len(movimientos) + 1,
                    'raw_text': linea
                })
            except Exception as e:
                print(f"DEBUG: Error parseando linea '{linea}': {e}")
                continue
        # else:
        #     print(f"DEBUG: No coincide regex: '{linea}'")
    
    return movimientos
def _parsear_valor(valor_str: str) -> Decimal:
    """Parsea valores (mismo que ahorros)"""
    if not valor_str:
        return Decimal(0)
    
    valor_str = valor_str.strip()
    
    if ',' in valor_str and valor_str.rfind(',') > valor_str.rfind('.'):
        valor_limpio = valor_str.replace('.', '').replace(',', '.')
    else:
        valor_limpio = valor_str.replace(',', '')
    
    try:
        return Decimal(valor_limpio)
    except:
        return Decimal(0)