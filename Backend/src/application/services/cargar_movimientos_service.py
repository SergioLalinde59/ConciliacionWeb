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
            
            # --- Pre-Cálculo de Duplicados ---
            from collections import defaultdict
            
            # Key: (fecha, valor, referencia, descripcion)
            signatures = []
            file_counts = defaultdict(int)
            
            for mov in movimientos:
                # Normalizar para firma
                ref = mov.referencia if mov.referencia else ""
                desc = mov.descripcion if mov.descripcion else ""
                sig = (mov.fecha, mov.valor, ref, desc)
                signatures.append(sig)
                file_counts[sig] += 1
                
            # Consultar BD (Estado Inicial)
            db_initial_counts = {}
            for sig in file_counts:
                fecha, valor, ref, desc = sig
                try:
                    c = self.repositorio.contar_movimientos_similares(
                        fecha=fecha,
                        valor=valor,
                        referencia=ref,
                        cuenta_id=cuenta_id, # Importante: Usar cuenta del contexto
                        descripcion=desc
                    )
                    db_initial_counts[sig] = c
                except Exception as e:
                    resultado['errores'].append(f"Error verificando duplicados para {desc}: {e}")
                    db_initial_counts[sig] = 999 # Bloquear inserción si falla chequeo
            
            inserted_counts_in_batch = defaultdict(int)
            
            for i, mov in enumerate(movimientos):
                try:
                    # 2. Completar datos faltantes
                    mov.cuenta_id = cuenta_id
                    mov.moneda_id = moneda_id
                    
                    # 3. Verificar si debemos insertar este
                    sig = signatures[i]
                    
                    # Queremos que Total = Max(FileCount, DBCount)
                    # Insertamos si no hemos completado el "Delta" necesario
                    # Delta = Max(0, FileCount - DBCount)
                    # Si DB ya tiene 2 y File trae 2 -> Delta 0. Insertamos 0.
                    # Si DB tiene 1 y File trae 2 -> Delta 1. Insertamos 1.
                    # Si DB tiene 0 y File trae 2 -> Delta 2. Insertamos 2.
                    
                    needed = max(0, file_counts[sig] - db_initial_counts.get(sig, 0))
                    
                    if inserted_counts_in_batch[sig] < needed:
                        # 4. Guardar
                        self.repositorio.guardar(mov)
                        resultado['nuevos'] += 1
                        inserted_counts_in_batch[sig] += 1
                    else:
                        resultado['duplicados'] += 1
                        
                except Exception as e:
                    resultado['errores'].append(f"Error procesando movimiento {mov.descripcion}: {str(e)}")
                    
        except Exception as e:
            resultado['errores'].append(f"Error crítico leyendo archivo: {str(e)}")
            
        return resultado
