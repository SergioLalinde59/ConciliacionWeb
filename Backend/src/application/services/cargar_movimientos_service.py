from typing import List
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.extracto_reader import ExtractoReader
from src.domain.models.movimiento import Movimiento

class CargarMovimientosService:
    """
    Servicio de Aplicación: Orquesta la carga de movimientos desde archivos.
    """
    
    def __init__(self, repositorio: MovimientoRepository):
        self.repositorio = repositorio

    def procesar_archivo(self, ruta_archivo: str, lector: ExtractoReader, cuenta_id: int, moneda_id: int) -> dict:
        """
        Lee el archivo, verifica duplicados y guarda los nuevos movimientos.
        
        Args:
            ruta_archivo: Path del archivo
            lector: Implementación de ExtractoReader a usar
            cuenta_id: ID de la cuenta a la que pertenecen los movimientos
            moneda_id: ID de la moneda predeterminada
            
        Returns:
            Resumen con cantidad de nuevos, duplicados y errores.
        """
        resultado = {
            'total_leidos': 0,
            'nuevos': 0,
            'duplicados': 0,
            'errores': []
        }
        
        try:
            # 1. Leer archivo (Puro en memoria)
            movimientos = lector.leer_archivo(ruta_archivo)
            resultado['total_leidos'] = len(movimientos)
            
            for mov in movimientos:
                try:
                    # 2. Completar datos faltantes que el extractor no conoce
                    mov.cuenta_id = cuenta_id
                    mov.moneda_id = moneda_id
                    
                    # 3. Verificar duplicados (Regla de negocio)
                    # Usamos el repo para chequear si ya existe
                    ya_existe = self.repositorio.existe_movimiento(
                        fecha=mov.fecha,
                        valor=mov.valor,
                        referencia=mov.referencia
                    )
                    
                    if ya_existe:
                        resultado['duplicados'] += 1
                    else:
                        # 4. Guardar
                        self.repositorio.guardar(mov)
                        resultado['nuevos'] += 1
                        
                except Exception as e:
                    resultado['errores'].append(f"Error procesando movimiento {mov.descripcion}: {str(e)}")
                    
        except Exception as e:
            resultado['errores'].append(f"Error crítico leyendo archivo: {str(e)}")
            
        return resultado
