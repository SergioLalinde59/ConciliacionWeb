from datetime import date
import calendar
from typing import List, Dict, Optional
import os
import io
import csv
import zipfile
from datetime import datetime

from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.api.routers.admin import ALLOWED_TABLES, SNAPSHOT_DIR

class MantenimientoService:
    def __init__(self, 
                 movimiento_repo: MovimientoRepository,
                 conciliacion_repo: ConciliacionRepository,
                 db_connection):
        self.movimiento_repo = movimiento_repo
        self.conciliacion_repo = conciliacion_repo
        self.conn = db_connection

    def _get_fin_mes(self, fecha: date) -> date:
        ultimo_dia = calendar.monthrange(fecha.year, fecha.month)[1]
        return date(fecha.year, fecha.month, ultimo_dia)

    def _check_bloqueo(self, cuenta_id: int, fecha: date) -> str:
        """Retorna el estado de la conciliacion para el periodo"""
        conciliacion = self.conciliacion_repo.obtener_por_periodo(cuenta_id, fecha.year, fecha.month)
        if not conciliacion:
            return "PENDIENTE"
        return conciliacion.estado

    def analizar_desvinculacion(self, fecha_corte: date, fecha_fin: Optional[date] = None, cuenta_id: Optional[int] = None) -> List[Dict]:
        if not fecha_fin:
            fecha_fin = self._get_fin_mes(fecha_corte)
        
        # 1. Obtener stats generales
        stats = self.movimiento_repo.analizar_desvinculacion(fecha_corte, fecha_fin, cuenta_id)
        
        # 2. Enriquecer con estado de bloqueo
        # Nota: Revisamos bloqueos por cada mes involucrado en el rango
        # Para simplificar, si el periodo de inicio está bloqueado, asumimos aviso.
        resultado = []
        for item in stats:
            estado = self._check_bloqueo(item['cuenta_id'], fecha_corte)
            item['estado_periodo'] = estado
            item['bloqueado'] = (estado == 'CONCILIADO')
            resultado.append(item)
            
        return resultado

    def desvincular_por_ids(self, ids: List[int], backup: bool = True) -> int:
        if not ids:
            return 0
            
        # 1. Realizar Backup si se solicita
        if backup:
            self._realizar_backup_seguridad(prefix="autosave_pre_unlink_lote")

        # 2. Ejecutar desvinculación
        return self.movimiento_repo.desvincular_por_ids(ids)

    def desvincular_movimientos(self, fecha_corte: date, fecha_fin: Optional[date] = None, backup: bool = True, cuenta_id: Optional[int] = None) -> int:
        if not fecha_fin:
            fecha_fin = self._get_fin_mes(fecha_corte)
        
        # 1. Validar bloqueos globalmente antes de empezar
        stats = self.analizar_desvinculacion(fecha_corte, fecha_fin, cuenta_id)
        columnas_bloqueadas = [s['cuenta_nombre'] for s in stats if s['bloqueado']]
        
        if columnas_bloqueadas:
            raise ValueError(f"No se puede desvincular: Cuentas bloqueadas en el periodo (CONCILIADO): {', '.join(columnas_bloqueadas)}")

        # 2. Realizar Backup si se solicita
        if backup:
            self._realizar_backup_seguridad(prefix="autosave_pre_unlink")

        # 3. Ejecutar desvinculación (reset)
        return self.movimiento_repo.desvincular_rango(fecha_corte, fecha_fin, cuenta_id)

    def _realizar_backup_seguridad(self, prefix="autosave_pre_unlink"):
        """Genera un backup automático de las tablas críticas antes de eliminar"""
        tablas_criticas = [
            "movimientos_encabezado", 
            "movimientos_detalle", 
            "movimiento_vinculaciones",
            "conciliaciones"
        ]
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.zip"
        full_path = os.path.join(SNAPSHOT_DIR, filename)
        
        # Reutilizamos lógica de exportación manual para consistencia
        # pero optimizada para este caso
        cursor = self.conn.cursor()
        try:
            with zipfile.ZipFile(full_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for table in tablas_criticas:
                    cursor.execute(f"SELECT * FROM {table}")
                    
                    # Obtener headers
                    if cursor.description:
                        headers = [desc[0] for desc in cursor.description]
                    else:
                        headers = []
                    
                    # Escribir CSV en memoria
                    csv_buffer = io.StringIO()
                    writer = csv.writer(csv_buffer)
                    writer.writerow(headers)
                    writer.writerows(cursor.fetchall())
                    
                    zip_file.writestr(f"{table}.csv", csv_buffer.getvalue())
                    
            print(f"Backup de seguridad creado en: {full_path}")
            
        finally:
            cursor.close()
