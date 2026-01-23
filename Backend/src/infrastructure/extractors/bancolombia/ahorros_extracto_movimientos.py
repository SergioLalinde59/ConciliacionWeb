"""
Extractor de movimientos individuales para Cuenta de Ahorros Bancolombia.
Lee PDFs de extracto bancario y extrae cada transacción.
"""
import pdfplumber
import re
import logging
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime

# Configurar logger local para este archivo
logger = logging.getLogger(__name__)

def extraer_movimientos(file_obj: Any) -> List[Dict[str, Any]]:
    """
    Extrae los movimientos individuales de un extracto Bancolombia Ahorros.
    """
    movimientos = []
    
    try:
        # Intentar determinar el rango de fechas del extracto leyendo la primera página
        year_inicio = datetime.now().year
        year_fin = year_inicio
        
        with pdfplumber.open(file_obj) as pdf:
            # 1. Buscar RANGO DE FECHAS en la primera página
            if len(pdf.pages) > 0:
                first_page_text = pdf.pages[0].extract_text() or ""
                # Buscar patrón "DESDE: AAAA/MM/DD ... HASTA: AAAA/MM/DD"
                # Ejemplo imagen: "DESDE: 2024/12/31 HASTA: 2025/01/31"
                match_periodo = re.search(r'DESDE[:\s]+(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s+HASTA[:\s]+(\d{4})[./-](\d{1,2})[./-](\d{1,2})', first_page_text, re.IGNORECASE)
                
                if match_periodo:
                    year_inicio = int(match_periodo.group(1))
                    # mes_inicio = int(match_periodo.group(2))
                    # dia_inicio = int(match_periodo.group(3))
                    
                    year_fin = int(match_periodo.group(4))
                    # mes_fin = int(match_periodo.group(5))
                    # dia_fin = int(match_periodo.group(6))
                    
                    logger.info(f"Rango fechas detectado: {year_inicio} - {year_fin}")
                else:
                    # Fallback simple a solo el año de inicio si no encuentra el rango completo
                    match_simple = re.search(r'DESDE:\s*(\d{4})[./-]', first_page_text)
                    if match_simple:
                        year_inicio = int(match_simple.group(1))
                        year_fin = year_inicio
                        logger.info(f"Año único detectado: {year_inicio}")
                    else:
                        logger.warning("No se detectó año en el encabezado. Se usará el año actual.")

            numero_linea = 0
            
            for page_num, page in enumerate(pdf.pages):
                texto = page.extract_text()
                if not texto:
                    continue
                
                logger.debug(f"Procesando página {page_num+1}...")
                
                # Extraer movimientos de esta página
                movs_pagina = _extraer_movimientos_desde_texto(texto, year_inicio, year_fin, numero_linea)
                movimientos.extend(movs_pagina)
                numero_linea += len(movs_pagina)
                
            logger.info(f"Total movimientos extraídos: {len(movimientos)}")
                
    except Exception as e:
        logger.error(f"Error crítico leyendo PDF Bancolombia Ahorros: {e}", exc_info=True)
        raise Exception(f"Error al leer movimientos del PDF Bancolombia Ahorros: {e}")
    
    return movimientos

def _extraer_movimientos_desde_texto(texto: str, year_inicio: int, year_fin: int, offset_linea: int) -> List[Dict[str, Any]]:
    """
    Extrae movimientos soportando fechas dd/mm y manejo flexible de columnas.
    """
    movimientos = []
    lineas = texto.split('\n')
    
    # Regex para detectar inicio de línea con fecha: DD/MM (o DD/MM/AAAA)
    # Soporta 1/12, 01/12, 01/12/2025
    patron_fecha_inicio = re.compile(r'^(\d{1,2}/\d{2})(?:/\d{4})?')
    
    for idx, linea in enumerate(lineas):
        linea = linea.strip()
        if not linea:
            continue
            
        match_fecha = patron_fecha_inicio.match(linea)
        if match_fecha:
            fecha_part = match_fecha.group(1) # dd/mm
            
            try:
                # Construir objeto fecha con lógica de cambio de año
                day, month = map(int, fecha_part.split('/'))
                
                # Determinar año correcto
                year_asignado = year_fin # Default al año final (el más probable en la mayoría de extractos salvo dic)
                
                if year_inicio != year_fin:
                    # Si hay cambio de año (Ej: Dic 2024 - Ene 2025)
                    # Si el mes es 12, pertenece al año inicio
                    if month == 12:
                        year_asignado = year_inicio
                    # Si el mes es 1 (u otro), y estamos asumiendo cronología hacia adelante, es año fin.
                    # Nota: Esto cubre bien el caso típico de extracto mensual Dic-Ene.
                    
                fecha = datetime(year_asignado, month, day).date()
            except Exception as e:
                logger.warning(f"Error parseando fecha '{fecha_part}' en línea: {linea} - Error: {e}")
                continue
                
            # Tokenizar de atrás hacia adelante
            # Remover la fecha del inicio para analizar el resto con seguridad
            # (El match es sobre el inicio, así que podemos cortar)
            resto_linea = linea[match_fecha.end():].strip()
            
            # Dividir por espacios múltiples (las columnas suelen tener gran separación)
            # o simplemente split()
            tokens = resto_linea.split()
            
            if len(tokens) < 1:
                logger.debug(f"Línea con fecha pero sin contenido suficiente: {linea}")
                continue

            # Buscar montos numéricos al final
            def es_numero(s):
                # Permite: 1,000.00 | 1.000,00 | -500 | 500
                return re.match(r'^[\d,.-]+$', s) is not None

            indices_numericos = [i for i, t in enumerate(tokens) if es_numero(t)]
            
            # Necesitamos al menos 1 número (Valor) o 2 (Valor, Saldo)
            # En la imagen se ve: SUCURSAL (vacío), DCTO (vacío), VALOR, SALDO
            # Ejemplo: ... TRANSFERENCIA... 2,825,000.00 11,162,137.17
            
            valor = Decimal(0)
            saldo = Decimal(0)
            descripcion = ""
            referencia = ""
            
            if len(indices_numericos) >= 2:
                # Caso ideal: Encontramos Valor y Saldo al final
                idx_saldo = indices_numericos[-1]
                idx_valor = indices_numericos[-2]
                
                # Validar que estén al final de la línea o cerca
                # Si hay texto después del saldo, algo anda mal, pero asumamos que el saldo es lo último
                
                str_valor = tokens[idx_valor]
                # str_saldo = tokens[idx_saldo] # No lo guardamos por ahora pero sirve de ancla
                
                descripcion_tokens = tokens[:idx_valor]
                
                # Chequear si hay referencia numérica antes del valor
                if len(indices_numericos) >= 3:
                     # Posible referencia: el número antes del valor
                     idx_ref = indices_numericos[-3]
                     if idx_ref == idx_valor - 1:
                         referencia = tokens[idx_ref]
                         descripcion_tokens = tokens[:idx_ref]

                valor = _parsear_valor(str_valor)
                descripcion = " ".join(descripcion_tokens)

            elif len(indices_numericos) == 1:
                # Solo un número al final. Podría ser el valor (si el saldo no está) o el saldo (si el valor no está?)
                # Improbable en extracto estándar, pero posible. Asumamos Valor.
                idx_valor = indices_numericos[-1]
                str_valor = tokens[idx_valor]
                descripcion_tokens = tokens[:idx_valor]
                valor = _parsear_valor(str_valor)
                descripcion = " ".join(descripcion_tokens)
            else:
                # Sin números claros
                logger.debug(f"No se encontraron montos en línea: {linea}")
                continue

            # Heurística de signo (La imagen muestra valores negativos explícitos con '-')
            # Ejemplo: -60,000.00
            # Si `_parsear_valor` maneja el '-', ya estamos bien.
            # Veamos `_parsear_valor` abajo.
            
            movimientos.append({
                'fecha': fecha,
                'descripcion': descripcion,
                'referencia': referencia,
                'valor': valor,
                'numero_linea': offset_linea + len(movimientos) + 1,
                'raw_text': linea.strip()
            })
            
    return movimientos

def _parsear_valor(valor_str: str) -> Decimal:
    """
    Parsea valores con formato colombiano (1.234.567,89) o US y maneja signos negativos.
    """
    if not valor_str:
        return Decimal(0)
    
    valor_str = valor_str.strip()
    
    # Manejo de signo negativo al inicio o final (a veces PDF pone 500-)
    signo = 1
    if valor_str.startswith('-') or valor_str.startswith('('):
        signo = -1
        valor_str = valor_str.replace('-', '').replace('(', '').replace(')', '')
    elif valor_str.endswith('-'):
        signo = -1
        valor_str = valor_str.replace('-', '')
        
    try:
        # Detectar formato: si tiene coma antes del último grupo de dígitos y punto como miles
        # Ejemplo: 1.234.567,89 (CO) vs 1,234,567.89 (US)
        
        # Eliminar caracteres no numéricos excepto . y ,
        v_clean = re.sub(r'[^\d.,]', '', valor_str)
        
        if ',' in v_clean and '.' in v_clean:
            last_comma = v_clean.rfind(',')
            last_dot = v_clean.rfind('.')
            if last_comma > last_dot: 
                # Formato CO: 1.000,00
                v_clean = v_clean.replace('.', '').replace(',', '.')
            else:
                # Formato US: 1,000.00
                v_clean = v_clean.replace(',', '')
        elif ',' in v_clean:
            # Solo comas. 
            # Si hay más de una coma o la coma está a modo de miles (ej 1,000): US
            # Si es 12,50: CO
            # Heurística: Si tiene formato NN,NNN es miles. Si es NN,NN es decimal.
            # Difícil saber con certeza sin contexto, pero Bancolombia PDF nativo suele ser CO (miles punto, dec coma)
            # excepto en extractos dolar.
            # Asumamos CO para Ahorros si hay ambigüedad: Coma es decimal si hay pocos decimales?
            # Mejor: Asumir CO (remover puntos, cambiar coma por punto)
            v_clean = v_clean.replace('.', '').replace(',', '.')
        
        return Decimal(v_clean) * signo
    except Exception as e:
        logger.error(f"Error parseando valor '{valor_str}': {e}")
        return Decimal(0)