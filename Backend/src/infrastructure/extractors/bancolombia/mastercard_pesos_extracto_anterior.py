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
    
    # RELAXED LOGIC: If we don't have saldo_final, we return what we have so the user can edit it manually.
    if not resumen:
        logger.warning("No se extrajo ningún dato del resumen. Se retornarán valores en cero.")
    
    # Ensure default keys exist if missing
    defaults = {
        'saldo_anterior': Decimal(0),
        'entradas': Decimal(0),
        'salidas': Decimal(0),
        'saldo_final': Decimal(0),
        'year': 2024, # Default fallback if unknown
        'month': 1,
        'periodo_texto': "PERIODO DESCONOCIDO"
    }
    
    for key, default_val in defaults.items():
        if key not in resumen:
            resumen[key] = default_val
            
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS ANTIGUO - Extracción completada (puede ser parcial)")
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
    
    # PRIMERO: Verificar que NO sea DOLARES (prioridad)
    tiene_dolares_1 = 'Estado de cuenta en: DOLARES' in texto
    tiene_dolares_2 = bool(re.search(r'D+O+L+A+R+E+S+', texto))
    
    if tiene_dolares_1 or tiene_dolares_2:
        logger.warning("✗ SALTAR: Detectado DOLARES en formato antiguo - saltando para PESOS")
        return None
        
    # SEGUNDO: Buscar indicadores de PESOS (Exacto)
    tiene_pesos = 'Estado de cuenta en: PESOS' in texto or bool(re.search(r'P+E+S+O+S+', texto))
    
    if not tiene_pesos:
        logger.warning("No se encontró 'Estado de cuenta en: PESOS' - saltando este texto")
        return None
    
    logger.info("✓ Confirmado: es un extracto en PESOS (formato antiguo)")
    
    # 1. SALDO ANTERIOR
    logger.info("\nBuscando: Saldo anterior")
    # Formato antiguo: "Saldo anterior 16.850.704,46"
    saldo_ant_match = re.search(
        r'Saldo anterior\s*\+?\s*\$?\s*([0-9,.]+)',
        texto_norm,
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
    compras_match = re.search(
        r'\+\s*Compras del mes\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    compras = Decimal(0)
    if compras_match:
        valor_str = compras_match.group(1)
        compras = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {compras}")
    
    # 3. INTERESES DE MORA
    int_mora_match = re.search(
        r'\+\s*Intereses de mora\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    int_mora = Decimal(0)
    if int_mora_match:
        int_mora = _parsear_valor_formato_col(int_mora_match.group(1))
    
    # 4. INTERESES CORRIENTES
    int_corr_match = re.search(
        r'\+\s*Intereses corrientes\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    int_corr = Decimal(0)
    if int_corr_match:
        int_corr = _parsear_valor_formato_col(int_corr_match.group(1))
    
    # 5. AVANCES
    avances_match = re.search(
        r'\+\s*Avances\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    avances = Decimal(0)
    if avances_match:
        avances = _parsear_valor_formato_col(avances_match.group(1))
    
    # 6. OTROS CARGOS
    otros_match = re.search(
        r'\+\s*Otros cargos\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    otros = Decimal(0)
    if otros_match:
        otros = _parsear_valor_formato_col(otros_match.group(1))
        
    # TOTAL SALIDAS
    data['salidas'] = compras + int_mora + int_corr + avances + otros
    logger.info(f"\nSalidas totales calculadas: {data['salidas']}")
    
    # 7. PAGOS/ABONOS (ENTRADAS)
    logger.info("\nBuscando: - Pagos / abonos")
    pagos_match = re.search(
        r'-\s*[Pp]agos\s*/\s*abonos\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    if pagos_match:
        valor_str = pagos_match.group(1)
        data['entradas'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['entradas']}")
    else:
        logger.warning("  ✗ No encontrado: - Pagos / abonos")
        
    # 8. SALDO FINAL (Pagos total o Saldo a pagar)
    logger.info("\nBuscando: Saldo final")
    # Formato antiguo: "= Pagos total 9.211.223,00" o "Saldo a pagar"
    pago_total_match = re.search(
        r'=\s*Pagos\s+total\s*\$?\s*([0-9,.]+)',
        texto_norm,
        re.IGNORECASE
    )
    if not pago_total_match:
        pago_total_match = re.search(
            r'Saldo\s+a\s+pagar\s*\$?\s*([0-9,.]+)',
            texto_norm,
            re.IGNORECASE
        )
        
    if pago_total_match:
        valor_str = pago_total_match.group(1)
        data['saldo_final'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['saldo_final']}")
    else:
        logger.warning("  ✗ No encontrado: Saldo final explícito")
        # Calcular como fallback
        if 'saldo_anterior' in data and 'salidas' in data and 'entradas' in data:
            data['saldo_final'] = data['saldo_anterior'] + data['salidas'] - data['entradas']
            logger.info(f"  ✓ Saldo final calculado: {data['saldo_final']}")

    # 9. PERIODO FACTURADO
    logger.info("\nBuscando: Periodo facturado")
    # Formato antiguo: "Desde: 30/01/2025 Hasta: 28/02/2025"
    periodo_match = re.search(
        r'Desde:\s*(\d{1,2})/(\d{1,2})/(\d{4})\s+Hasta:\s*(\d{1,2})/(\d{1,2})/(\d{4})',
        texto_norm,
        re.IGNORECASE
    )
    
    if periodo_match:
        logger.info(f"  ✓ Encontrado periodo: {periodo_match.group(0)}")
        month = int(periodo_match.group(5))  # mes final
        year = int(periodo_match.group(6))   # año final
        
        if year > 2000 and 1 <= month <= 12:
            data['year'] = year
            data['month'] = month
            meses_es = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
            data['periodo_texto'] = f"{year} - {meses_es[month]}"
            logger.info(f"  ✓ Periodo extraído: {data['periodo_texto']}")
    
    if data:
        return data
    return None


def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con detección automática de formato y limpieza de símbolos.
    """
    if not valor_str:
        return Decimal(0)
    
    # Limpieza: eliminar símbolos de moneda, espacios y otros caracteres no numéricos excepto , y .
    v_limpio = re.sub(r'[^\d,.-]', '', valor_str)
    
    # Si tiene comas y puntos, el último es el decimal
    if ',' in v_limpio and '.' in v_limpio:
        pos_coma = v_limpio.rfind(',')
        pos_punto = v_limpio.rfind('.')
        if pos_punto > pos_coma: # US: 1,234.56
            v_limpio = v_limpio.replace(',', '')
        else: # COL: 1.234,56
            v_limpio = v_limpio.replace('.', '').replace(',', '.')
    elif ',' in v_limpio:
        # Si solo tiene coma, asumimos decimal si hay 2 dígitos al final
        partes = v_limpio.split(',')
        if len(partes[-1]) == 2:
            v_limpio = v_limpio.replace('.', '').replace(',', '.')
        else: # Miles
            v_limpio = v_limpio.replace(',', '')
    elif '.' in v_limpio:
        partes = v_limpio.split('.')
        if len(partes[-1]) == 2: # US decimal
            pass
        else: # Miles
            v_limpio = v_limpio.replace('.', '')
    
    try:
        return Decimal(v_limpio)
    except:
        return Decimal(0)
