import pdfplumber
import re
from typing import List, Dict, Any
from .utils import parsear_fecha, parsear_valor

def extraer_movimientos_bancolombia(file_obj: Any) -> List[Dict]:
    """
    Extrae todos los movimientos de un PDF de Bancolombia Ahorros (Stream).
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
        raise Exception(f"Error al leer el PDF Bancolombia: {e}")
    
    # Procesar
    movimientos_procesados = []
    
    for mov in movimientos_raw:
        fecha = parsear_fecha(mov['fecha_str'])
        valor = parsear_valor(mov['valor_str'])
        
        if fecha and valor is not None:
            movimientos_procesados.append({
                'fecha': fecha,
                'descripcion': mov['descripcion'].strip(),
                'referencia': mov['referencia'].strip(),
                'valor': valor
            })
    
    return movimientos_procesados

def _extraer_movimientos_desde_texto(texto: str) -> List[Dict]:
    movimientos = []
    lines = texto.split('\n')
    
    for line in lines:
        line = line.strip()
        # Buscar líneas que empiecen con fecha (ej: "27 dic 2025")
        fecha_match = re.match(r'^(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+)', line)
        
        if fecha_match:
            fecha_str = fecha_match.group(1)
            resto = fecha_match.group(2)
            
            # Buscar el valor al final
            valor_match = re.search(r'(-?\$\s*[\d,.]+)', resto)
            
            if valor_match:
                valor_str = valor_match.group(1)
                desc_ref = resto[:valor_match.start()].strip()
                
                # Intentar separar referencia (números al final, mínimo 6 dígitos)
                ref_match = re.search(r'(\d{6,})$', desc_ref)
                if ref_match:
                    referencia = ref_match.group(1)
                    descripcion = desc_ref[:ref_match.start()].strip()
                else:
                    referencia = ""
                    descripcion = desc_ref
                
                movimientos.append({
                    'fecha_str': fecha_str,
                    'descripcion': descripcion,
                    'referencia': referencia,
                    'valor_str': valor_str
                })
    
    return movimientos
