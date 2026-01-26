"""
Extractor de resumen mensual para Cuenta de Ahorros Bancolombia.
Lee PDFs de extracto bancario (principios de mes).
"""

import pdfplumber
import re
from typing import Dict, Any, Optional
from decimal import Decimal


def extraer_resumen(file_obj: Any) -> Dict[str, Any]:
    """
    Extrae el resumen del periodo de un extracto Bancolombia.
    Retorna: {
        'saldo_anterior': Decimal,
        'entradas': Decimal,
        'salidas': Decimal,
        'saldo_final': Decimal,
        'year': int,
        'month': int,
        'periodo_texto': str
    }
    """
    resumen = {}
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            # Generalmente el resumen está en la primera o segunda página
            for page in pdf.pages[:2]:
                texto = page.extract_text()
                if texto:
                    datos = _extraer_resumen_desde_texto(texto)
                    if datos:
                        resumen.update(datos)
                        # Si ya tenemos saldo final, asumimos que encontramos el resumen
                        if 'saldo_final' in resumen:
                            break
                            
    except Exception as e:
        raise Exception(f"Error al leer resumen del PDF Bancolombia: {e}")
        
    return resumen


def _extraer_resumen_desde_texto(texto: str) -> Optional[Dict[str, Any]]:
    # Normalizamos el texto para facilitar búsquedas
    texto_norm = texto.replace('\n', ' ').strip()
    
    data = {}
    
    # 1. Buscar bloque de "RESUMEN" o "MOVIMIENTO DE SU CUENTA"
    # Bancolombia suele tener: SALDO ANTERIOR ... (+) DEPÓSITOS ... (-) RETIROS ... SALDO ACTUAL
    
    # SALDO ANTERIOR
    saldo_ant_match = re.search(r'SALDO ANTERIOR.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if saldo_ant_match:
        data['saldo_anterior'] = _parsear_valor_formato_us(saldo_ant_match.group(1))
        
    # ENTRADAS / TOTAL ABONOS
    # PDF real: TOTAL ABONOS
    entradas_match = re.search(r'TOTAL ABONOS.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if not entradas_match:
        entradas_match = re.search(r'\(\+\)\s*ABONOS.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if not entradas_match:
         entradas_match = re.search(r'\(\+\)\s*ENTR[ÓO] A SU CUENTA.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
        
    if entradas_match:
        data['entradas'] = _parsear_valor_formato_us(entradas_match.group(1))

    # SALIDAS / TOTAL CARGOS
    # PDF real: TOTAL CARGOS
    salidas_match = re.search(r'TOTAL CARGOS.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if not salidas_match:
        salidas_match = re.search(r'\(\-\)\s*SALI[ÓO] DE SU CUENTA.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if not salidas_match:
        salidas_match = re.search(r'\(\-\)\s*CARGOS.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)    
        
    if salidas_match:
        data['salidas'] = _parsear_valor_formato_us(salidas_match.group(1))
        
    # SALDO FINAL / SALDO ACTUAL
    # PDF real: SALDO ACTUAL
    saldo_final_match = re.search(r'SALDO ACTUAL.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
    if not saldo_final_match:
        # Fallback
        saldo_final_match = re.search(r'SALDO AL.*?\$\s*([\d,.]+)', texto_norm, re.IGNORECASE)
        
    if saldo_final_match:
        data['saldo_final'] = _parsear_valor_formato_us(saldo_final_match.group(1))
        
    # PERIODO
    # Intento 1: Formato "PERIODO: ..."
    periodo_match = re.search(r'PER[ÍI]ODO[:\s]+.*?(?P<f1>\d{4}/\d{1,2}/\d{1,2}|(?P<d1>\d{1,2})\s+de\s+(?P<mes1>[a-z]+)\s+de\s+(?P<anio1>\d{4}))\s+a\s+(?P<f2>\d{4}/\d{1,2}/\d{1,2}|(?P<d2>\d{1,2})\s+de\s+(?P<mes2>[a-z]+)\s+de\s+(?P<anio2>\d{4}))', texto_norm, re.IGNORECASE)
    
    # Intento 2: Formato "DESDE: ... HASTA: ..." (Visto en extractos recientes)
    if not periodo_match:
        periodo_match = re.search(r'DESDE[:\s]+(?P<f1>\d{4}/\d{1,2}/\d{1,2})\s+HASTA[:\s]+(?P<f2>\d{4}/\d{1,2}/\d{1,2})', texto_norm, re.IGNORECASE)

    if periodo_match:
        # Extraer año y mes del FINAL del periodo (que define el mes de conciliación)
        # Bancolombia suele usar: "Desde ... hasta 2026/01/31" o "1 de enero de 2026 a 31 de enero de 2026"
        
        # Intentar capturar grupos
        groups = periodo_match.groupdict()
        
        try:
            year = 0
            month = 0
            
            # Caso "2026/01/31" (aplica tanto para captura f2 directo como para f2 dentro de PERIODO)
            if '/' in (groups.get('f2') or ''):
                p_parts = groups['f2'].split('/')
                year = int(p_parts[0])
                month = int(p_parts[1])
            
            # Caso "31 de enero de 2026"
            elif groups.get('mes2') and groups.get('anio2'):
                year = int(groups['anio2'])
                mes_str = groups['mes2'].lower()
                meses = {
                    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
                }
                month = meses.get(mes_str, 0)
                
            if year > 2000 and 1 <= month <= 12:
                data['year'] = year
                data['month'] = month
                import calendar
                # en español manual por si locale ingles
                meses_es = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
                mes_nombre = str(month)
                if 1 <= month <= 12:
                    mes_nombre = meses_es[month]
                    
                data['periodo_texto'] = f"{year} - {mes_nombre}"
        except Exception as e:
            pass

    
    # Si encontramos al menos saldo final y anterior, retornamos
    if 'saldo_final' in data and 'saldo_anterior' in data:
        return data
        
    return None


def _parsear_valor_formato_us(valor_str: str) -> Decimal:
    """
    Parsea valores con formato US (1,234.56) donde coma es miles y punto es decimal.
    """
    if not valor_str: return Decimal(0)
    # Eliminar comas (miles)
    valor_limpio = valor_str.replace(',', '')
    # El punto se mantiene como decimal
    try:
        return Decimal(valor_limpio)
    except:
        return Decimal(0)
