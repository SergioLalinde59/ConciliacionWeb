"""
Extractor de resumen mensual para Tarjeta de Crédito MasterCard Bancolombia (USD).
Lee PDFs de extracto bancario mensual.
"""

import pdfplumber
import re
import logging
from typing import Dict, Any, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)


def extraer_resumen(file_obj: Any) -> Dict[str, Any]:
    """
    Extrae el resumen del periodo de un extracto MasterCard USD.
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
    logger.info("MASTERCARD USD - Iniciando extracción de resumen")
    logger.info("=" * 80)
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            logger.info(f"Total de páginas en el PDF: {len(pdf.pages)}")
            
            # IMPORTANTE: Este PDF puede contener AMBAS secciones (DOLARES y PESOS)
            # Debemos procesar TODAS las páginas y buscar específicamente la sección de DOLARES
            # NO debemos detenernos en la primera sección que encontremos
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"\n--- Procesando página {page_num} ---")
                texto = page.extract_text()
                
                if texto:
                    logger.info(f"Texto extraído de página {page_num} (primeros 500 caracteres):")
                    logger.info(texto[:500])
                    logger.info(f"\n... (total {len(texto)} caracteres)")
                    
                    datos = _extraer_resumen_desde_texto(texto)
                    
                    if datos:
                        logger.info(f"Datos extraídos de página {page_num}: {list(datos.keys())}")
                        resumen.update(datos)
                        # Si ya tenemos saldo final de DOLARES, podemos detenernos
                        if 'saldo_final' in resumen:
                            logger.info("✓ Resumen USD completo encontrado (saldo_final presente)")
                            break
                    else:
                        logger.warning(f"No se extrajeron datos de página {page_num} (puede ser sección PESOS)")
                else:
                    logger.warning(f"Página {page_num} no contiene texto extraíble")
                            
    except Exception as e:
        logger.error(f"Error al leer resumen del PDF MasterCard USD: {e}", exc_info=True)
        raise Exception(f"Error al leer resumen del PDF MasterCard USD: {e}")
    
    logger.info(f"\nResumen final extraído: {list(resumen.keys())}")
    
    # STRICT LOGIC: If we didn't confirm it's USD or we have no data, return empty/raise
    # to allow fallback to the older extractor.
    if not resumen or 'saldo_final' not in resumen:
        logger.warning("No se extrajo el resumen completo de MasterCard USD. No se aplicarán valores por defecto para permitir fallback.")
        return {} # Returning empty dictionary allows the service to catch it or fail gracefully
    
    # Ensure default keys exist IF we are sure this is the right format
    defaults = {
        'saldo_anterior': Decimal(0),
        'entradas': Decimal(0),
        'salidas': Decimal(0),
        'saldo_final': Decimal(0),
        'year': 2024,
        'month': 1,
        'periodo_texto': "PERIODO DESCONOCIDO"
    }
    
    for key, default_val in defaults.items():
        if key not in resumen:
            resumen[key] = default_val

    logger.info("=" * 80)
    logger.info("MASTERCARD USD - Extracción completada exitosamente")
    logger.info("=" * 80)
    
    return resumen


def _extraer_resumen_desde_texto(texto: str) -> Optional[Dict[str, Any]]:
    """Extrae campos del resumen desde el texto del PDF."""
    # Normalizamos el texto para facilitar búsquedas
    texto_norm = texto.replace('\n', ' ').strip()
    
    logger.info("\n--- Iniciando parsing del texto ---")
    logger.info(f"Longitud del texto normalizado: {len(texto_norm)}")
    
    data = {}
    
    # Verificar que sea la sección de DOLARES
    # El PDF puede tener caracteres "triplicados" como: MMMooonnneeedddaaa::: DDDOOOLLLAAARRREEESSS
    
    # SEGUNDO: Buscar indicadores de DOLARES
    # Primero definimos marcadores de la moneda contraria para exclusión opcional
    tiene_pesos_1 = 'Moneda en PESOS' in texto
    tiene_pesos_2 = 'ESTADO DE CUENTA EN: PESOS' in texto
    tiene_pesos_3 = bool(re.search(r'P+E+S+O+S+', texto))

    tiene_dolares_1 = 'Moneda DOLARES' in texto
    tiene_dolares_2 = 'ESTADO DE CUENTA EN:  DOLARES' in texto
    tiene_dolares_3 = 'ESTADO DE CUENTA EN: DOLARES' in texto  # Sin doble espacio
    # Buscar patrón con caracteres triplicados
    tiene_dolares_4 = bool(re.search(r'D+O+L+A+R+E+S+', texto))
    
    # REFINEMENT: Explicit exclusion if PESOS markers are present as headers
    if tiene_pesos_1 or tiene_pesos_2 or tiene_pesos_3:
        logger.warning("✗ SALTAR: Detectados marcadores explicitos de PESOS en esta pagina.")
        return None

    logger.info(f"Verificación de moneda DOLARES:")
    logger.info(f"  - 'Moneda DOLARES': {tiene_dolares_1}")
    logger.info(f"  - 'ESTADO DE CUENTA EN: DOLARES': {tiene_dolares_2 or tiene_dolares_3}")
    logger.info(f"  - Patrón DOLARES: {tiene_dolares_4}")
    
    if not (tiene_dolares_1 or tiene_dolares_2 or tiene_dolares_3 or tiene_dolares_4):
        logger.warning("No se encontró indicación FUERTE de moneda DOLARES - saltando este texto")
        return None
    
    logger.info("✓ Confirmado: es un extracto en DOLARES")
    
    # 1. SALDO ANTERIOR
    saldo_ant_match = re.search(r'Saldo anterior\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if saldo_ant_match:
        data['saldo_anterior'] = _parsear_valor_formato_col(saldo_ant_match.group(1))
        logger.info(f"  ✓ Encontrado Saldo Anterior: {data['saldo_anterior']}")
    
    # 2. COMPRAS DEL MES
    compras_match = re.search(r'\+\s*Compras del mes\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    compras = Decimal(0)
    if compras_match:
        compras = _parsear_valor_formato_col(compras_match.group(1))
    
    # 3. INTERESES DE MORA
    int_mora_match = re.search(r'\+\s*Intereses de mora\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_mora = Decimal(0)
    if int_mora_match:
        int_mora = _parsear_valor_formato_col(int_mora_match.group(1))
    
    # 4. INTERESES CORRIENTES
    int_corr_match = re.search(r'\+\s*Intereses corrientes\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_corr = Decimal(0)
    if int_corr_match:
        int_corr = _parsear_valor_formato_col(int_corr_match.group(1))
    
    # 5. AVANCES
    avances_match = re.search(r'\+\s*Avances\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    avances = Decimal(0)
    if avances_match:
        avances = _parsear_valor_formato_col(avances_match.group(1))
    
    # 6. OTROS CARGOS
    otros_match = re.search(r'\+\s*Otros cargos\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    otros = Decimal(0)
    if otros_match:
        otros = _parsear_valor_formato_col(otros_match.group(1))
    
    # TOTAL SALIDAS = Compras + Intereses + Avances + Otros cargos
    data['salidas'] = compras + int_mora + int_corr + avances + otros
    
    # 7. PAGOS/ABONOS (ENTRADAS)
    pagos_match = re.search(r'Pagos\s*/\s*abonos\s+\$\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if pagos_match:
        data['entradas'] = _parsear_valor_formato_col(pagos_match.group(1))
        logger.info(f"  ✓ Encontrado Pagos: {data['entradas']}")
    
    # 8. PERIODO FACTURADO
    # Formato: "30 nov - 30 dic. 2025" en la sección "Información de pago en dolares"
    # Puede aparecer como:
    # - "Periodo facturado 30 nov - 30 dic. 2025"
    # - "Periodo facturado Pago Total:\n30 nov - 30 dic. 2025"
    logger.info("\nBuscando: Periodo facturado")
    
    # ESTRATEGIA: Buscar el patrón de fecha directamente (más flexible)
    # Buscar: "dd mmm - dd mmm. yyyy"
    periodo_match = re.search(
        r'(\d{1,2})\s+(\w{3})\s+-\s+(\d{1,2})\s+(\w{3})\.\s+(\d{4})',
        texto,
        re.IGNORECASE
    )
    
    if periodo_match:
        logger.info(f"  ✓ Encontrado periodo: {periodo_match.group(0)}")
        grupos = periodo_match.groups()
        mes_fin_str = grupos[3].lower()  # 4to grupo (mes final)
        year = int(grupos[4])  # 5to grupo (año)
        
        # Mapeo de meses en español (abreviados)
        meses = {
            'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
        }
        month = meses.get(mes_fin_str, 0)
        
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
        logger.warning("  ✗ No se encontró el periodo facturado")
    
    # 9. CALCULAR SALDO FINAL
    # Para tarjetas de crédito: Saldo Final = Saldo Anterior + Salidas - Entradas
    if 'saldo_anterior' in data and 'salidas' in data and 'entradas' in data:
        data['saldo_final'] = data['saldo_anterior'] + data['salidas'] - data['entradas']
    
    # Si encontramos los datos principales, retornamos
    if 'saldo_anterior' in data and 'saldo_final' in data:
        return data
        
    return None


def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con detección de formato robusta.
    """
    if not valor_str:
        return Decimal(0)
    
    v_limpio = re.sub(r'[^\d,.-]', '', valor_str)
    
    if ',' in v_limpio and '.' in v_limpio:
        pos_coma = v_limpio.rfind(',')
        pos_punto = v_limpio.rfind('.')
        if pos_punto > pos_coma:
            v_limpio = v_limpio.replace(',', '')
        else:
            v_limpio = v_limpio.replace('.', '').replace(',', '.')
    elif ',' in v_limpio:
        if len(v_limpio.split(',')[-1]) == 2:
            v_limpio = v_limpio.replace(',', '.')
        else:
            v_limpio = v_limpio.replace(',', '')
    elif '.' in v_limpio:
        if len(v_limpio.split('.')[-1]) != 2:
            v_limpio = v_limpio.replace('.', '')
    
    try:
        return Decimal(v_limpio)
    except:
        return Decimal(0)
