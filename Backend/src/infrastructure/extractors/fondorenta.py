from decimal import Decimal
import pdfplumber
import re
from typing import List, Dict, Any, Optional
from .utils import parsear_fecha, parsear_valor

def extraer_movimientos_fondorenta(file_obj: Any) -> List[Dict]:
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
    import logging
    logger = logging.getLogger("app_logger")
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


import logging

logger = logging.getLogger(__name__)

def extraer_resumen_fondorenta(file_obj: Any) -> Dict[str, Any]:
    """
    Extrae el resumen del periodo de un extracto Fondo Renta.
    Tabla inferior con: SALDO ANTERIOR, ADICIONES, RETIROS | REND. NETOS, RETENCIÓN, NUEVO SALDO
    """
    resumen = {}
    print(f"DEBUG: EXTRACTOR FONDO RENTA INVOKED")
    
    try:
        # Asegurar puntero al inicio
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        with pdfplumber.open(file_obj) as pdf:
            full_text = ""
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    full_text += t + "\n"
            
            # LOGGING ROBUSTO
            # DEBUG: Log full text to see what we extracted
            logger.error(f"DEBUG FondoRenta: Texto extraido ({len(full_text)} chars):\n{full_text[:3000]}") # Log first 3000 chars as ERROR
            
            # Also try to write to a file for easier inspection if volume is mounted
            try:
                with open("logs/debug_extract_dump.txt", "w", encoding="utf-8") as f:
                    f.write(full_text)
            except Exception as e:
                logger.error(f"Could not write debug dump file: {e}")

            datos = _extraer_resumen_desde_texto_full(full_text)
            if datos:
                resumen.update(datos)
            else:
                # Si falló, loguear POR QUÉ
                search_area = full_text[full_text.find('SALDO'):full_text.find('SALDO')+500] if 'SALDO' in full_text else 'No SALDO found'
                logger.error(f"DEBUG FondoRenta FAILED. Search Area for SALDO: {search_area}")
                
                # Lanzar error con preview del área donde se esperaba encontrar datos
                raise ValueError(f"No se pudieron extraer datos. Verifique logs. Preview: {search_area[:200]}")
                
    except ValueError as ve:
        raise ve
    except Exception as e:
        logger.error(f"Error al leer resumen del PDF Fondo Renta: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Error al leer resumen del PDF Fondo Renta: {e}")
        
    return resumen

def _extraer_resumen_desde_texto_full(texto: str) -> Optional[Dict[str, Any]]:
    data = {}
    
    # 1. Periodo: "Desde: 20251201 Hasta: 20251231"
    periodo_match = re.search(r'Desde[:\s]*(\d{8})\s+Hasta[:\s]*(\d{8})', texto, re.IGNORECASE)
    if periodo_match:
        f_fin = periodo_match.group(2) # 20251231
        try:
            year = int(f_fin[:4])
            month = int(f_fin[4:6])
            
            data['year'] = year
            data['month'] = month
            data['periodo_texto'] = f"{year}-{month:02d}"
        except:
            pass

    # 2. Valores del cuadro de resumen
    # El cuadro es complejo de parsear linealmente porque tiene dos filas de encabezados y valores mezclados.
    # Pero los valores numéricos están debajo de los textos.
    # Buscaremos patrones específicos.
    
    # Helper para limpiar valor español
    def clean_dec(s):
        if not s: return Decimal(0)
        s = s.replace('.', '').replace(',', '.')
        try: return Decimal(s)
        except: return Decimal(0)

    # NUEVO: Valor Unidad y Rentabilidad
    # Valor Unidad al Final: 39.897,86978598
    # Rentabilidad Periodo: 5,89- % NETA
    
    val_unidad_match = re.search(r'Valor Unidad al Final[:\s]*([\d.,]+)', texto)
    if val_unidad_match:
        data['valor_unidad'] = clean_dec(val_unidad_match.group(1))

    rentabilidad_match = re.search(r'Rentabilidad Periodo[:\s]*([\d.,\-]+)\s*%', texto)
    if rentabilidad_match:
        rent_str = rentabilidad_match.group(1).strip()
        # Manejo de signo negativo al final: "5,89-"
        if rent_str.endswith('-'):
            rent_str = '-' + rent_str[:-1]
        data['rentabilidad'] = clean_dec(rent_str)


    # Identificar valores usando Regex en todo el texto (más robusto ante saltos de línea)
    # Patrones para buscar valores monetarios después de etiquetas clave
    # Usamos DOTALL para que '.' coincida con newlines si es necesario
    
    # Identificar valores usando Regex Posicional
    # La tabla suele ser:
    # Fila 1 Headers: SALDO ANTERIOR ... ADICIONES ... RETIROS
    # Fila 1 Valores: V_SaldoAnt ... V_Adiciones ... V_Retiros
    #
    # Fila 2 Headers: REND. NETOS ... RETENCION ... NUEVO SALDO
    # Fila 2 Valores: V_Rend ... V_Ret ... V_NuevoSaldo
    
    # Buscamos el bloque de texto desde "SALDO ANTERIOR"
    # Normalizamos el texto para búsqueda (eliminamos multiples espacios/newlines para stream continuo)
    # Pero mantenemos cierto orden.
    
    # Estrategia: 
    # 1. Buscar "SALDO ANTERIOR"
    # 2. Extraer los siguientes 3 números (formatos de moneda)
    # 3. Asignar en orden.
    
    texto_search = texto
    
    # Helper para buscar N valores después de un anchor
    def buscar_valores_despues_de(anchor, num_valores):
        # Buscar el anchor
        match_anchor = re.search(anchor, texto_search, re.IGNORECASE)
        if not match_anchor:
            return []
        
        # Cortar texto desde el anchor
        resto_texto = texto_search[match_anchor.end():]
        
        # Buscar todos los montos en el resto.
        # CRITICO: Los valores en UNIDADES tienen muchos decimales line '61,27892292'
        # Los valores en PESOS tienen exactamente 2 decimales line '2.457.535,91' o '23.500.000,00'
        # Usamos regex que asegure que después de la coma hay exactamente 2 dígitos y NO un tercero.
        # Regex: ... ,\d{2}(?!\d)
        
        vals = re.findall(r'(-?[\d]{1,3}(?:\.[\d]{3})*,\d{2})(?!\d)', resto_texto)
        return [clean_dec(v) for v in vals[:num_valores]]

    # Saldo Anterior, Adiciones, Retiros
    # Teniendo 'SALDO ANTERIOR', el siguiente valor monetario es Pesos (S_Ant), 
    # luego Units (ignorado por regex), luego ADICIONES -> Pesos, luego ValUnidades(ignorado?), luego RETIROS -> Pesos
    # El orden en el texto suele ser columna a columna o fila a fila. pdfplumber suele ir izquierda a derecha.
    # Fila 1: [SaldoAntPesos] [SaldoAntUnits] [AdicPesos] [RetirosPesos]
    # Si mi regex ignora Units, debería capturar: S_Ant, Adiciones, Retiros.
    
    valores_fila1 = buscar_valores_despues_de(r'SALDO\s+ANTERIOR', 3) 
    
    if not valores_fila1:
        valores_fila1 = buscar_valores_despues_de(r'ANTERIOR', 3)
    
    if len(valores_fila1) >= 3:
        saldo_anterior = valores_fila1[0]
        adiciones = valores_fila1[1]
        retiros = valores_fila1[2]
    else:
        saldo_anterior = valores_fila1[0] if len(valores_fila1) > 0 else Decimal(0)
        # Si falta alguno, asumimos 0 pero registramos warn
        adiciones = valores_fila1[1] if len(valores_fila1) > 1 else Decimal(0)
        retiros = valores_fila1[2] if len(valores_fila1) > 2 else Decimal(0)

    # Rendimientos, Retencion, Nuevo Saldo
    valores_fila2 = buscar_valores_despues_de(r'REND\.?\s+NETOS', 3)
    
    if not valores_fila2:
         valores_fila2 = buscar_valores_despues_de(r'RETENCI[ÓO]N', 3)
         # Si entramos por retencion, el primer valor seria Retencion, no Rendimientos!
         # Mmm, mejor ser especifico.
         # Probemos buscar por "REND..."
         if not valores_fila2:
             valores_fila2 = buscar_valores_despues_de(r'RENDIMIENTOS', 3)
    
    if len(valores_fila2) >= 3:
        rendimientos = valores_fila2[0]
        retenciones = valores_fila2[1]
        saldo_final = valores_fila2[2]
    else:
        rendimientos = valores_fila2[0] if len(valores_fila2) > 0 else Decimal(0)
        retenciones = valores_fila2[1] if len(valores_fila2) > 1 else Decimal(0)
        saldo_final = valores_fila2[2] if len(valores_fila2) > 2 else Decimal(0)

    
    # Calcular entradas y salidas
    entradas = adiciones
    salidas = retiros + retenciones
    
    if rendimientos >= 0:
        entradas += rendimientos
    else:
        salidas += abs(rendimientos)

    data['saldo_anterior'] = saldo_anterior
    data['entradas'] = entradas
    data['salidas'] = salidas
    data['saldo_final'] = saldo_final
    
    # NUEVO: Devolver datos detallados
    data['rendimientos'] = rendimientos
    data['retenciones'] = retenciones
    
    # Debug info
    print(f"DEBUG FondoRenta Posicional: Ant={saldo_anterior}, Adi={adiciones}, Ret={retiros}, Rend={rendimientos}, SalFin={saldo_final}")
    logger.info(f"DEBUG FondoRenta Posicional: Ant={saldo_anterior}, Adi={adiciones}, Ret={retiros}, Rend={rendimientos}, SalFin={saldo_final}")
    
    # Retornamos data si tiene ALGO
    if saldo_final != 0 or saldo_anterior != 0:
        return data
        
    return None
