from typing import List
from src.domain.models.movimiento import Movimiento
from src.domain.ports.extracto_reader import ExtractoReader
from extractores.bancolombia_extractor import extraer_movimientos_bancolombia

class BancolombiaAdapter(ExtractoReader):
    """
    Adaptador que utiliza el extractor existente de Bancolombia
    y convierte sus resultados al modelo de dominio.
    """
    
    def puede_procesar(self, ruta_archivo: str) -> bool:
        # Lógica simple de detección (se podría mejorar leyendo cabeceras)
        return ruta_archivo.lower().endswith(".pdf")

    def leer_archivo(self, ruta_archivo: str) -> List[Movimiento]:
        raw_movements = extraer_movimientos_bancolombia(ruta_archivo)
        
        domain_movements = []
        for raw in raw_movements:
            # Mapeo Diccionario -> Entidad Movimiento
            # NOTA: IDs como MonedaID y CuentaID deben ser resueltos por el Servicio de Aplicación,
            # no por el extractor (que no sabe de IDs de base de datos).
            # Por ahora los dejaremos en 0 o None, y el servicio los llenará.
            
            mov = Movimiento(
                moneda_id=1,        # Placeholder (Pesos)
                cuenta_id=0,        # Placeholder (Se definirá al llamar el servicio)
                fecha=raw['fecha'],
                valor=raw['valor'],
                descripcion=raw['descripcion'],
                referencia=raw['referencia'],
                tercero_id=None,
                grupo_id=None,
                concepto_id=None
            )
            domain_movements.append(mov)
            
        return domain_movements
