"""
Extractor de resumen mensual para Tarjeta de Crédito MasterCard Bancolombia (Pesos).
FORMATO ANTIGUO (Pre-Septiembre 2025)
Lee PDFs de extracto bancario mensual con formato anterior.
"""

import pdfplumber
import re
from typing import Dict, Any, Optional
from decimal import Decimal
import logging

# Configurar logger
logger = logging.getLogger("app_logger")


def extraer_resumen(file_obj: Any) -> Dict[str, Any]:
    """
    Extrae el resumen del periodo de un extracto MasterCard Pesos (FORMATO ANTIGUO).
    Retorna: {
        'saldo_anterior': Decimal,
        'entradas': Decimal,  # Pagos/abonos
        'salidas': Decimal,   # Compras + Intereses + Avances + Otros cargos
        'saldo_final': Decimal,
        'year': int,
        'month': int,
        'periodo_texto': str
    }
    """
    resumen = {}
    
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS ANTIGUO - Iniciando extracción de resumen")
    logger.info("=" * 80)
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            logger.info(f"Total de páginas en el PDF: {len(pdf.pages)}")
            
            # Este PDF puede contener AMBAS secciones (DOLARES y PESOS)
            # Debemos procesar TODAS las páginas y buscar específicamente la sección de PESOS
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"\n--- Procesando página {page_num} ---")
                texto = page.extract_text()
                
                if texto:
                    logger.info(f"Texto extraído de página {page_num} (primeros 500 caracteres):")
                    logger.info(texto[:500])
                    logger.info(f"\n... (total {len(texto)} caracteres)")
                    
                    # Guardar el texto completo en un archivo para inspección
                    try:
                        mode = "a" if page_num > 1 else "w"
                        with open("debug_mastercard_pesos_anterior_text.txt", mode, encoding="utf-8") as debug_file:
                            debug_file.write(f"=== PÁGINA {page_num} ===\n")
                            debug_file.write(texto)
                            debug_file.write("\n\n")
                        logger.info(f"Texto de página {page_num} guardado en: debug_mastercard_pesos_anterior_text.txt")
                    except Exception as debug_e:
                        logger.warning(f"No se pudo guardar archivo debug: {debug_e}")
                    
                    datos = _extraer_resumen_desde_texto(texto)
                    
                    if datos:
                        logger.info(f"Datos extraídos de página {page_num}: {list(datos.keys())}")
                        resumen.update(datos)
                        # Si ya tenemos saldo final de PESOS, podemos detenernos
                        if 'saldo_final' in resumen:
                            logger.info("✓ Resumen PESOS completo encontrado (saldo_final presente)")
                            break
                    else:
                        logger.warning(f"No se extrajeron datos de página {page_num} (puede ser sección DOLARES)")
                else:
                    logger.warning(f"Página {page_num} no contiene texto extraíble")
                            
    except Exception as e:
        logger.error(f"Error al leer resumen del PDF MasterCard Pesos Antiguo: {e}", exc_info=True)
        raise Exception(f"Error al leer resumen del PDF MasterCard Pesos: {e}")
    
    logger.info(f"\nResumen final extraído: {list(resumen.keys())}")
    
    if not resumen or 'saldo_final' not in resumen:
        logger.error("✗ FALLO: No se encontró saldo_final en el resumen")
        logger.error(f"Campos encontrados: {list(resumen.keys())}")
        raise Exception("No se pudo extraer el resumen del archivo. Verifique el formato.")
    
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS ANTIGUO - Extracción completada exitosamente")
    logger.info("=" * 80)
    
    return resumen


def _extraer_resumen_desde_texto(texto: str) -> Optional[Dict[str, Any]]:
    """Extrae campos del resumen desde el texto del PDF (formato antiguo)."""
    # Normalizamos el texto para facilitar búsquedas
    texto_norm = texto.replace('\n', ' ').strip()
    
    logger.info("\n--- Iniciando parsing del texto (FORMATO ANTIGUO) ---")
    logger.info(f"Longitud del texto normalizado: {len(texto_norm)}")
    
    data = {}
    
    # Verificar que sea la sección de PESOS
    logger.info("Verificando moneda...")
    
    # PRIMERO: Verificar que NO sea DOLARES
    tiene_dolares = (
        'DOLARES' in texto or
        'ESTADO DE CUENTA EN: DOLARES' in texto or
        bool(re.search(r'Estado de cuenta en:\s*DOLARES', texto, re.IGNORECASE))
    )
    
    if tiene_dolares:
        logger.warning("✗ SALTAR: Detectado DOLARES - este es un extracto USD, no PESOS")
        return None
    
    # SEGUNDO: Buscar indicadores de PESOS
    tiene_pesos = (
        'PESOS' in texto or
        'ESTADO DE CUENTA EN: PESOS' in texto or
        bool(re.search(r'Estado de cuenta en:\s*PESOS', texto, re.IGNORECASE))
    )
    
    logger.info(f"  - Tiene PESOS: {tiene_pesos}")
    
    if not tiene_pesos:
        logger.warning("No se encontró indicación de moneda PESOS - saltando este texto")
        return None
    
    logger.info("✓ Confirmado: es un extracto en PESOS (formato antiguo)")
    
    # 1. SALDO ANTERIOR
    logger.info("\nBuscando: Saldo anterior")
    # Formato antiguo: "Saldo anterior + Compras del mes 15,107,211.00"
    # O también puede ser línea separada
    saldo_ant_match = re.search(
        r'Saldo anterior\s*\+?\s*(?:Compras del mes)?\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    if saldo_ant_match:
        valor_str = saldo_ant_match.group(1)
        data['saldo_anterior'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['saldo_anterior']}")
    else:
        logger.warning("  ✗ No encontrado: Saldo anterior")
    
    # 2. COMPRAS DEL MES
    logger.info("\nBuscando: Compras del mes")
    # Puede estar en la misma línea que "Saldo anterior + Compras del mes"
    # o en línea separada: "+ Compras del mes 1,857,246.00"
    compras_match = re.search(
        r'\+\s*Compras del mes\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    compras = Decimal(0)
    if compras_match:
        valor_str = compras_match.group(1)
        compras = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {compras}")
    else:
        logger.info("  - No encontrado: Compras del mes (puede ser 0)")
    
    # 3. INTERESES CORRIENTES
    logger.info("\nBuscando: Intereses corrientes")
    int_corr_match = re.search(
        r'\+\s*Intereses corrientes\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    int_corr = Decimal(0)
    if int_corr_match:
        valor_str = int_corr_match.group(1)
        int_corr = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {int_corr}")
    else:
        logger.info("  - No encontrado: Intereses corrientes (puede ser 0)")
    
    # 4. AVANCES
    logger.info("\nBuscando: Avances")
    avances_match = re.search(
        r'\+\s*Avances\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    avances = Decimal(0)
    if avances_match:
        valor_str = avances_match.group(1)
        avances = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {avances}")
    else:
        logger.info("  - No encontrado: Avances (puede ser 0)")
    
    # TOTAL SALIDAS = Compras + Intereses + Avances
    data['salidas'] = compras + int_corr + avances
    logger.info(f"\nSalidas totales calculadas: {data['salidas']}")
    
    # 5. PAGOS/ABONOS (ENTRADAS)
    logger.info("\nBuscando: - Pagos / abonos")
    # Formato antiguo: "- Pagos / abonos 10,429,042.00" (con GUIÓN y espacios)
    # El patrón \s* permite 0 o más espacios alrededor de la barra
    pagos_match = re.search(
        r'-\s*[Pp]agos\s*/\s*abonos\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    if pagos_match:
        valor_str = pagos_match.group(1)
        data['entradas'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['entradas']}")
    else:
        logger.warning("  ✗ No encontrado: - Pagos / abonos")
    
    # 6. PAGOS TOTAL (SALDO FINAL)
    logger.info("\nBuscando: = Pagos total")
    # Formato antiguo: "= Pagos total 11,917,143.00" (con IGUAL antes)
    # También intentamos variaciones sin el símbolo =
    pago_total_match = re.search(
        r'=\s*Pagos\s+total\s*\$?\s*([0-9,.]+)',
        texto,
        re.IGNORECASE
    )
    
    if not pago_total_match:
        # Intentar sin el símbolo = como fallback
        pago_total_match = re.search(
            r'Pagos?\s+total\s*\$?\s*([0-9,.]+)',
            texto,
            re.IGNORECASE
        )
    
    if not pago_total_match:
        # Intentar con "Saldo a pagar" como fallback adicional
        pago_total_match = re.search(
            r'Saldo\s+a\s+pagar\s*\$?\s*([0-9,.]+)',
            texto,
            re.IGNORECASE
        )
    
    if pago_total_match:
        valor_str = pago_total_match.group(1)
        data['saldo_final'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['saldo_final']}")
    else:
        logger.warning("  ✗ No encontrado: = Pagos total")
        # Si no encontramos el saldo final explícito, intentamos calcularlo
        logger.info("  Intentando calcular saldo final...")
        if 'saldo_anterior' in data and 'salidas' in data and 'entradas' in data:
            data['saldo_final'] = data['saldo_anterior'] + data['salidas'] - data['entradas']
            logger.info(f"  ✓ Saldo final calculado: {data['saldo_final']}")
    
    # 7. PERIODO FACTURADO
    logger.info("\nBuscando: Periodo facturado")
    # Formato antiguo: "Desde: 30/01/2025 Hasta: 28/02/2025"
    periodo_match = re.search(
        r'Desde:\s*(\d{1,2})/(\d{1,2})/(\d{4})\s+Hasta:\s*(\d{1,2})/(\d{1,2})/(\d{4})',
        texto,
        re.IGNORECASE
    )
    
    if periodo_match:
        logger.info(f"  ✓ Encontrado periodo: {periodo_match.group(0)}")
        # Tomamos la fecha final (hasta)
        # grupos: (dia_inicio, mes_inicio, año_inicio, dia_fin, mes_fin, año_fin)
        month = int(periodo_match.group(5))  # mes final
        year = int(periodo_match.group(6))   # año final
        
        if year > 2000 and 1 <= month <= 12:
            data['year'] = year
            data['month'] = month
            
            # Nombres completos de meses
            meses_es = [
                "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ]
            mes_nombre = meses_es[month]
            data['periodo_texto'] = f"{year} - {mes_nombre}"
            logger.info(f"  ✓ Periodo extraído: {data['periodo_texto']} (año={year}, mes={month})")
        else:
            logger.warning(f"  ✗ Periodo inválido: year={year}, month={month}")
    else:
        logger.warning("  ✗ No se encontró el periodo facturado en formato antiguo")
    
    # Si encontramos los datos principales, retornamos
    if 'saldo_anterior' in data and 'saldo_final' in data:
        logger.info("\n✓ Parsing exitoso - retornando datos")
        return data
    
    logger.warning(f"\n✗ Parsing incompleto - campos encontrados: {list(data.keys())}")
    return None


def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con detección automática de formato.
    
    El PDF antiguo puede usar formato USA (1,234.56) o colombiano (1.234,56)
    Detecta automáticamente basándose en la posición de coma y punto.
    """
    if not valor_str:
        return Decimal(0)
    
    # Eliminar espacios
    valor_limpio = valor_str.strip()
    
    # Detectar formato: Si tiene coma Y punto, determinar cuál es decimal
    tiene_coma = ',' in valor_limpio
    tiene_punto = '.' in valor_limpio
    
    if tiene_coma and tiene_punto:
        # Determinar cuál viene último (ese es el decimal)
        pos_coma = valor_limpio.rfind(',')
        pos_punto = valor_limpio.rfind('.')
        
        if pos_punto > pos_coma:
            # Formato USA: 1,234.56 (punto es decimal)
            valor_limpio = valor_limpio.replace(',', '')  # Eliminar comas (miles)
        else:
            # Formato colombiano: 1.234,56 (coma es decimal)
            valor_limpio = valor_limpio.replace('.', '')  # Eliminar puntos (miles)
            valor_limpio = valor_limpio.replace(',', '.')  # Coma -> punto
    elif tiene_coma:
        # Solo tiene coma - podría ser:
        # - Formato colombiano decimal: 123,45
        # - Formato USA miles: 1,234
        # Si tiene más de 3 dígitos después de la coma, es miles USA
        partes = valor_limpio.split(',')
        if len(partes) == 2 and len(partes[1]) <= 2:
            # Probablemente decimal colombiano: 123,45
            valor_limpio = valor_limpio.replace(',', '.')
        else:
            # Probablemente miles USA: 1,234
            valor_limpio = valor_limpio.replace(',', '')
    elif tiene_punto:
        # Solo tiene punto - podría ser:
        # - Formato USA decimal: 123.45
        # - Formato colombiano miles: 1.234
        # Si tiene más de 3 dígitos después del punto, es miles colombiano
        partes = valor_limpio.split('.')
        if len(partes[-1]) > 2:
            # Probablemente miles colombiano: 1.234
            valor_limpio = valor_limpio.replace('.', '')
        # else: es decimal USA, lo dejamos como está
    
    try:
        return Decimal(valor_limpio)
    except Exception as e:
        logger.warning(f"No se pudo parsear valor: '{valor_str}' (error: {e}), retornando 0")
        return Decimal(0)
