"""
Extractor de movimientos individuales para MasterCard USD Bancolombia (FORMATO ANTIGUO).
Lee PDFs de extracto y extrae cada transacción de la sección DOLARES.
Valida estrictamente que la página contenga el encabezado "ESTADO DE CUENTA DOLARES" (sin espacios).
"""
import pdfplumber
import re
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime
import logging

# Configurar logger
logger = logging.getLogger("app_logger")

def extraer_movimientos(file_obj: Any) -> List[Dict[str, Any]]:
    """
    Extrae los movimientos individuales de un extracto MasterCard USD (FORMATO ANTIGUO).
    
    Retorna: Lista de diccionarios con las claves:
        - fecha (date)
        - descripcion (str)
        - referencia (str)
        - valor (Decimal) -> Siempre 0 para USD
        - usd (Decimal) -> Valor extraído * -1
        - trm (Decimal) -> Siempre 0
        - numero_linea (int)
        - raw_text (str)
    """
    movimientos = []
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            numero_linea = 0
            
            for page_num, page in enumerate(pdf.pages, 1):
                texto = page.extract_text()
                if not texto:
                    continue
                
                # Validación estricta de encabezado para asegurar que es sección DOLARES
                # Eliminamos espacios y saltos de línea para verificar
                texto_normalizado = texto.replace(" ", "").replace("\n", "")
                
                # Buscar "ESTADO DE CUENTA DOLARES" o variaciones
                # Img2: "ESTADO DE CUENTA EN: DOLARES" -> Normalizado: "ESTADODECUENTAEN:DOLARES" o similar
                if "DOLARES" not in texto_normalizado or "ESTADODECUENTA" not in texto_normalizado:
                     # Log nivel debug o info si es necesario, pero silencioso por defecto para no llenar logs
                     # logger.debug(f"Página {page_num}: No es sección DOLARES. Saltando.")
                     continue
                
                logger.info(f"Página {page_num}: Sección DOLARES detectada. Procesando movimientos...")
                
                movs_pagina = _extraer_movimientos_desde_texto(texto, numero_linea)
                movimientos.extend(movs_pagina)
                numero_linea += len(movs_pagina)
                
    except Exception as e:
        logger.error(f"Error al leer movimientos del PDF MasterCard USD (Antiguo): {e}")
        # Retornar lista vacía o lo que se haya procesado
        return movimientos
    
    logger.info(f"Total movimientos encontrados en MasterCard USD (Antiguo): {len(movimientos)}")
    return movimientos

def _extraer_movimientos_desde_texto(texto: str, offset_linea: int) -> List[Dict[str, Any]]:
    """
    Extrae movimientos desde el texto de una página del PDF.
    """
    movimientos = []
    lineas = texto.split('\n')
    
    # Regex para capturar columnas: Fecha Transacción, Descripción, Valor Original
    # Estructura observada en Img1/Img3:
    # Autorización | Fecha | Descripción | Valor Original | ...
    # Ejemplo: T06309 27/08/2025 APPLE.COM BILL 3.22
    
    patron_movimiento = re.compile(
        # Inicio | (Auth opcional) | Fecha | Descripcion | Valor Original (USD)
        r'^\s*(?:[A-Z0-9]+\s+)?(\d{2}\s*/\s*\d{2}\s*/\s*\d{4})\s+(.+?)\s+([-]?\$?\s*[-]?[\d.,]+)',
        re.MULTILINE
    )
    
    for i, linea in enumerate(lineas):
        linea = linea.strip()
        if not linea:
            continue
            
        match = patron_movimiento.search(linea)
        if match:
            fecha_str = match.group(1).replace(" ", "")
            descripcion = match.group(2).strip()
            valor_str = match.group(3)
            
            # Filtros básicos de encabezados
            if "Fecha" in fecha_str or "Descripción" in descripcion or "Valor" in valor_str:
                continue

            try:
                # Formato DD/MM/YYYY
                fecha = datetime.strptime(fecha_str, '%d/%m/%Y').date()
                
                # Parsear valor (USD)
                valor_raw = _parsear_valor_formato_col(valor_str)
                
                # Determinación de signo basada en descripción y signo explícito
                # Palabras clave que indican un ABONO/PAGO (Ingreso para la tarjeta, disminuye deuda)
                KEYWORDS_ABONO = ["ABONO", "PAGO", "REVERSION", "ANULACION"]
                descripcion_upper = descripcion.upper()
                es_abono = any(k in descripcion_upper for k in KEYWORDS_ABONO)
                
                if es_abono:
                     # Es un abono/ingreso -> POSITIVO
                     valor_usd = abs(valor_raw)
                else:
                     # REGLA DE NEGOCIO ORIGINAL: Multiplicar * -1
                     # Para simular cargos (positivos en PDF) como gastos (negativos en sistema)
                     # Y abonos (negativos en PDF) como ingresos (positivos en sistema)
                     valor_usd = valor_raw * Decimal(-1)
                
                movimientos.append({
                    'fecha': fecha,
                    'descripcion': descripcion,
                    'referencia': '', 
                    'valor': Decimal(0), # Valor en pesos es 0
                    'usd': valor_usd,    # Valor Original mapeado a USD
                    'trm': Decimal(0),   # TRM 0 por defecto
                    'numero_linea': offset_linea + len(movimientos) + 1,
                    'raw_text': linea
                })
            except Exception as e:
                logger.warning(f"Error parseando linea '{linea}': {e}")
                continue
                
    return movimientos

def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con detección automática de formato.
    """
    if not valor_str:
        return Decimal(0)
    
    # Eliminar símbolo de moneda y espacios
    valor_limpio = valor_str.replace('$', '').strip()
    
    # Detectar signo negativo al final '31.00-' o inicio
    es_negativo = False
    if valor_limpio.endswith('-'):
        es_negativo = True
        valor_limpio = valor_limpio.rstrip('-').strip()
    elif valor_limpio.startswith('-'):
        es_negativo = True
        valor_limpio = valor_limpio.lstrip('-').strip()
    
    # Detección de decimales (Punto vs Coma)
    tiene_coma = ',' in valor_limpio
    tiene_punto = '.' in valor_limpio
    
    if tiene_coma and tiene_punto:
        pos_coma = valor_limpio.rfind(',')
        pos_punto = valor_limpio.rfind('.')
        if pos_punto > pos_coma: # 1,234.56
            valor_limpio = valor_limpio.replace(',', '')
        else: # 1.234,56
            valor_limpio = valor_limpio.replace('.', '').replace(',', '.')
    elif tiene_coma:
        # Analisis simple: si la parte post-coma es 2 digitos, asumo decimal
        partes = valor_limpio.split(',')
        if len(partes) == 2 and len(partes[1]) == 2:
            valor_limpio = valor_limpio.replace(',', '.')
        else:
            valor_limpio = valor_limpio.replace(',', '')
    elif tiene_punto:
        # Analisis simple
        partes = valor_limpio.split('.')
        if len(partes) > 1 and len(partes[-1]) != 2: # Si NO son dos digitos, asumo miles (ej: 1.000)
             valor_limpio = valor_limpio.replace('.', '')
        # Si son dos digitos (10.50), dejo el punto
    
    try:
        val = Decimal(valor_limpio)
        return val * Decimal(-1) if es_negativo else val
    except:
        return Decimal(0)
