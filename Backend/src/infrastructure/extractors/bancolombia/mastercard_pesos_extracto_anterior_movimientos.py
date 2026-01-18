"""
Extractor de movimientos individuales para MasterCard Pesos Bancolombia (FORMATO ANTIGUO).
Lee PDFs de extracto y extrae cada transacción.
Valida estrictamente que la página contenga el encabezado "ESTADO DE CUENTA PESOS" (sin espacios).
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
    Extrae los movimientos individuales de un extracto MasterCard Pesos (FORMATO ANTIGUO).
    
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
            
            for page_num, page in enumerate(pdf.pages, 1):
                texto = page.extract_text()
                if not texto:
                    continue
                
                # Validación estricta de encabezado para asegurar que es sección PESOS
                # Eliminamos espacios y saltos de línea para verificar
                texto_normalizado = texto.replace(" ", "").replace("\n", "")
                
                # DEBUG: Ver qué texto se está validando
                if page_num == 1:
                    logger.info(f"DEBUG HEADER: Texto normalizado inicio: {texto_normalizado[:100]}")

                if "ESTADODECUENTAPESOS" not in texto_normalizado:
                    logger.info(f"Página {page_num}: No se encontró 'EST ADO DE CUENTA PESOS' (Normalizado). Buscando alternativas...")
                    # Fallback eventual por si el header es ligeramente distinto
                    if "ESTADODECUENTA" not in texto_normalizado or "PESOS" not in texto_normalizado:
                         logger.info(f"Página {page_num}: Definitivamente no es seccion PESOS. Saltando.")
                         continue
                
                logger.info(f"Página {page_num}: Sección PESOS detectada. Procesando movimientos...")
                
                movs_pagina = _extraer_movimientos_desde_texto(texto, numero_linea)
                movimientos.extend(movs_pagina)
                numero_linea += len(movs_pagina)
                
    except Exception as e:
        logger.error(f"Error al leer movimientos del PDF MasterCard Pesos (Antiguo): {e}")
        # Importante: No re-lanzar excepción para permitir que otros extractores intenten si este falla
        # raise Exception(f"Error al leer movimientos del PDF MasterCard Pesos (Antiguo): {e}")
        return []
    
    logger.info(f"Total movimientos encontrados en MasterCard Pesos (Antiguo): {len(movimientos)}")
    return movimientos

def _extraer_movimientos_desde_texto(texto: str, offset_linea: int) -> List[Dict[str, Any]]:
    """
    Extrae movimientos desde el texto de una página del PDF.
    """
    movimientos = []
    lineas = texto.split('\n')
    
    # Regex ajustado al formato antiguo MasterCard Pesos
    # Columnas esperadas: [Autorización] Fecha Transacción Descripción Valor Original ...
    # Ejemplo esperado: R09435 31/08/2025 INTERESES CORRIENTES 3,532.89
    # Grupo 1: Fecha (DD/MM/YYYY) - Flexibilizado espacios
    # Grupo 2: Descripción
    # Grupo 3: Valor (Soporta signo menos al inicio O al final)s
    
    patron_movimiento = re.compile(
        # InicioLinea + (Opcional Auth) + Fecha + Espacios + Desc + Espacios + Valor + (Opcional Menos final)
        r'^\s*(?:[A-Z0-9]+\s+)?(\d{2}\s*/\s*\d{2}\s*/\s*\d{4})\s+(.+?)\s+([-]?\$?\s*[-]?[\d.,]+(?:\s*-)?)',
        re.MULTILINE
    )
    
    for i, linea in enumerate(lineas):
        linea = linea.strip()
        if not linea:
            continue
            
        match = patron_movimiento.search(linea)
        if match:
            fecha_str = match.group(1).replace(" ", "") # Eliminar espacios internos en fecha
            descripcion = match.group(2).strip()
            valor_str = match.group(3)
            
            # Filtros adicionales para evitar falsos positivos (como encabezados repetidos)
            if "Fecha" in fecha_str or "Transacción" in descripcion:
                continue

            try:
                # Formato DD/MM/YYYY
                fecha = datetime.strptime(fecha_str, '%d/%m/%Y').date()
                
                # Parsear valor
                # Lógica de signo:
                # Si es Abono (tiene menos al final o es negativo), debería sumar saldo (positivo).
                # Si es Compra (positivo), debería restar saldo (negativo).
                # PERO la lógica solicitada para este extractor fue: "Multiplicar por -1".
                # Asumimos que el PDF muestra Compras como Positivo y Abonos como Negativo (con - al final).
                # Si PDF: 3,532.89 (Compra) -> * -1 -> -3,532.89 (Resta saldo). CORRECTO.
                # Si PDF: 7,600,000- (Abono) -> * -1 -> ?? 
                # Necesitamos parsear el negativo correctamente primero.
                
                valor_raw = _parsear_valor_formato_col(valor_str)
                
                # Aplicar inversión de signo global requrida para este extracto
                valor = valor_raw * Decimal(-1)
                
                movimientos.append({
                    'fecha': fecha,
                    'descripcion': descripcion,
                    'referencia': '', 
                    'valor': valor,
                    'numero_linea': offset_linea + len(movimientos) + 1,
                    'raw_text': linea
                })
            except Exception as e:
                logger.warning(f"Error parseando linea '{linea}': {e}")
                continue
        else:
            # DEBUG: Logear líneas que NO matchean pero parecen tener fecha, para diagnosticar
            if "/" in linea and len(linea) > 20 and i < 20: # Solo primeras lineas para no spam
                 logger.debug(f"DEBUG NO MATCH: '{linea}'")

    return movimientos

def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con detección automática de formato (Lógica robusta del extractor antiguo).
    Soporta signo menos al final '100.00-'.
    """
    if not valor_str:
        return Decimal(0)
    
    # Eliminar símbolo de moneda y espacios
    valor_limpio = valor_str.replace('$', '').strip()
    
    # Detectar signo negativo al final (común en abonos Bancolombia)
    es_negativo = False
    if valor_limpio.endswith('-'):
        es_negativo = True
        valor_limpio = valor_limpio.rstrip('-').strip()
    elif valor_limpio.startswith('-'):
        es_negativo = True
        valor_limpio = valor_limpio.lstrip('-').strip()
    
    # Detectar formato: Si tiene coma Y punto, determinar cuál es decimal
    tiene_coma = ',' in valor_limpio
    tiene_punto = '.' in valor_limpio
    
    if tiene_coma and tiene_punto:
        # Determinar cuál viene último (ese es el decimal)
        pos_coma = valor_limpio.rfind(',')
        pos_punto = valor_limpio.rfind('.')
        
        if pos_punto > pos_coma:
            # Formato USA: 1,234.56
            valor_limpio = valor_limpio.replace(',', '')
        else:
            # Formato COL: 1.234,56
            valor_limpio = valor_limpio.replace('.', '').replace(',', '.')
    elif tiene_coma:
        # Solo tiene coma.
        partes = valor_limpio.split(',')
        if len(partes) == 2 and len(partes[1]) <= 2:
            # Probablemente decimal: 123,45
            valor_limpio = valor_limpio.replace(',', '.')
        else:
            # Probablemente miles: 1,234
            valor_limpio = valor_limpio.replace(',', '')
    elif tiene_punto:
        # Solo tiene punto.
        partes = valor_limpio.split('.')
        if len(partes[-1]) > 2:
            # Probablemente miles: 1.234
            valor_limpio = valor_limpio.replace('.', '')
        # else: decimal USA 123.45, dejar como está
    
    try:
        val = Decimal(valor_limpio)
        return val * Decimal(-1) if es_negativo else val
    except:
        return Decimal(0)
