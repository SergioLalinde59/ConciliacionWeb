import pdfplumber
import re
from typing import List, Dict, Any
from .utils import parsear_fecha, parsear_valor

def extraer_movimientos_credito(file_obj: Any) -> List[Dict]:
    """
    Extrae movimientos de tarjeta de crédito Bancolombia desde Stream.
    """
    movimientos = []
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                lines = text.split('\n')
                i = 0
                while i < len(lines):
                    line = lines[i].strip()
                    
                    # Regex para encontrar fecha de inicio
                    match_start = re.match(r'^(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+)$', line)
                    
                    if match_start:
                        fecha_str = match_start.group(1)
                        resto = match_start.group(2)
                        
                        # Manejo de formatos TC
                        match_full = re.search(r'(?:(\d{1,2}\s+\w{3}\s+\d{4})\s+)?(COP|USD)\s+(\$?\s*[\d\.,]+)\s+(\d+)$', resto)
                        match_wrap = re.search(r'(?:(\d{1,2}\s+\w{3}\s+\d{4})\s+)?(COP|USD)\s+(\d+)$', resto)
                        
                        fecha_txn = parsear_fecha(fecha_str)
                        
                        if match_full:
                            curr = match_full.group(2)
                            val_str = match_full.group(3)
                            desc = resto[:match_full.start()].strip()
                            val = parsear_valor(val_str)
                            
                            if fecha_txn and val is not None:
                                # IMPORTANTE: Los movimientos de tarjeta de crédito se multiplican por -1
                                # porque en el extracto del banco las compras vienen positivas (débito al saldo)
                                # pero para nosotros representan gastos (negativos)
                                valor_invertido = -val
                                movimientos.append({
                                    'fecha': fecha_txn,
                                    'descripcion': desc,
                                    'referencia': '', 
                                    'valor': valor_invertido,
                                    'moneda': curr
                                })
                                
                        elif match_wrap:
                            curr = match_wrap.group(2)
                            desc = resto[:match_wrap.start()].strip()
                            
                            if i + 1 < len(lines):
                                next_line = lines[i+1].strip()
                                match_val = re.match(r'^(-?\$?\s*[\d\.,]+)', next_line)
                                if match_val:
                                    val_str = match_val.group(1)
                                    val = parsear_valor(val_str)
                                    
                                    if fecha_txn and val is not None:
                                        # IMPORTANTE: Multiplicar por -1 (signo contrario TC)
                                        valor_invertido = -val
                                        movimientos.append({
                                            'fecha': fecha_txn,
                                            'descripcion': desc,
                                            'referencia': '',
                                            'valor': valor_invertido,
                                            'moneda': curr
                                        })
                                    i += 1
                    i += 1
    except Exception as e:
        raise Exception(f"Error extrayendo PDF crédito: {e}")

    return movimientos
