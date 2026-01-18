"""
Extractor de movimientos individuales para MasterCard USD Bancolombia (Nuevo Formato).
Lee PDFs de extracto y extrae cada transacción.
"""
import pdfplumber
import re
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime

def extraer_movimientos(file_obj: Any) -> List[Dict[str, Any]]:
    """
    Extrae los movimientos individuales de un extracto MasterCard USD (Nuevo Formato).
    
    Retorna: Lista de diccionarios con las claves:
        - fecha (date)
        - descripcion (str)
        - referencia (str)
        - valor (Decimal)
        - numero_linea (int)
        - raw_text (str)
    """
    movimientos = []
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            numero_linea = 0
            
            for page in pdf.pages:
                texto = page.extract_text()
                if not texto:
                    continue
                
                # Filtrar páginas: Procesar SOLO si contiene el encabezado de Dólares (Uso regex flexible)
                if re.search(r"ESTADO\s+DE\s+CUENTA\s+EN[:;]?\s+DOLARES", texto, re.IGNORECASE):
                     print(f"DEBUG: Página detectada como DOLARES. Procesando...")
                     movs_pagina = _extraer_movimientos_desde_texto(texto, numero_linea)
                     movimientos.extend(movs_pagina)
                     numero_linea += len(movs_pagina)
                else:
                     # Log de los primeros caracteres para ver por qué falla
                     print(f"DEBUG: Página ignorada (No coincide encabezado USD). Inicio: {texto[:150].replace(chr(10), ' ')}...")
                
    except Exception as e:
        raise Exception(f"Error al leer movimientos del PDF MasterCard USD: {e}")
    
    print(f"DEBUG: Total movimientos encontrados en MasterCard USD: {len(movimientos)}")
    return movimientos

def _extraer_movimientos_desde_texto(texto: str, offset_linea: int) -> List[Dict[str, Any]]:
    """
    Extrae movimientos desde el texto de una página del PDF.
    """
    movimientos = []
    lineas = texto.split('\n')
    
    print(f"DEBUG: Procesando texto de página, longitud: {len(texto)}")
    
    # Regex ajustado al nuevo formato (similar a Pesos pero de USD)
    # Columnas: Autorización | Fecha | Movimientos | Valor movimiento ...
    # Ejemplo: T02672 27/12/2025 APPLE.COM/BILL $ 3,43
    
    patron_movimiento = re.compile(
        r'^\s*[A-Z0-9]+\s+(\d{2}/\d{2}/\d{4})\s+(.+?)\s+([-]?\$\s*[-]?[\d.,]+)',
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
            
            print(f"DEBUG: MATCH - Fecha: {fecha_str}, Desc: {descripcion}, Valor: {valor_str}")
            
            try:
                # Formato DD/MM/YYYY
                fecha = datetime.strptime(fecha_str, '%d/%m/%Y').date()
                
                # Parsear valor
                valor_raw = _parsear_valor(valor_str)
                
                # Determinación de signo basada en descripción y signo explícito
                # Palabras clave que indican un ABONO/PAGO (Ingreso para la tarjeta, disminuye deuda)
                KEYWORDS_ABONO = ["ABONO", "PAGO", "REVERSION", "ANULACION"]
                descripcion_upper = descripcion.upper()
                es_abono = any(k in descripcion_upper for k in KEYWORDS_ABONO)
                
                if es_abono:
                    # Es un abono/ingreso -> POSITIVO
                    valor = abs(valor_raw)
                else:
                    # Es una compra/gasto -> NEGATIVO
                    # Salvo que el PDF indique explícitamente negativo sin ser abono (raro)
                    valor = -abs(valor_raw)
                
                # Mapeo estricto para cuenta USD:
                # usd = valor parseado, valor = 0, trm = 0
                movimientos.append({
                    'fecha': fecha,
                    'descripcion': descripcion,
                    'referencia': '', 
                    'valor': Decimal(0),
                    'usd': valor,
                    'trm': Decimal(0),
                    'numero_linea': offset_linea + len(movimientos) + 1,
                    'raw_text': linea
                })
            except Exception as e:
                print(f"DEBUG: Error parseando linea '{linea}': {e}")
                continue
    
    return movimientos

def _parsear_valor(valor_str: str) -> Decimal:
    """Parsea valores numéricos eliminando símbolos."""
    if not valor_str:
        return Decimal(0)
    
    valor_str = valor_str.replace('$', '').replace(' ', '').strip()
    
    # Manejo de separadores
    if ',' in valor_str and valor_str.rfind(',') > valor_str.rfind('.'):
        valor_limpio = valor_str.replace('.', '').replace(',', '.')
    else:
        valor_limpio = valor_str.replace(',', '')
    
    try:
        return Decimal(valor_limpio)
    except:
        return Decimal(0)