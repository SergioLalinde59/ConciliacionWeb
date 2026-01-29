from typing import List, Optional
from datetime import date
from decimal import Decimal
import psycopg2
from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_detalle import MovimientoDetalle
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.infrastructure.database.postgres_conciliacion_repository import PostgresConciliacionRepository

class PostgresMovimientoRepository(MovimientoRepository):
    """
    Adaptador de Base de Datos para Movimientos en PostgreSQL.
    """
    
    

    def __init__(self, connection):
        self.conn = connection
        # Instanciar repositorio de conciliacion "on-the-fly" usando la misma conexión
        # Esto evita inyeccion compleja en este punto, manteniendo el coupling aceptable para un hook
        self.conciliacion_repo = PostgresConciliacionRepository(connection)

    def _get_ids_traslados(self) -> tuple[Optional[int], Optional[int]]:
        """Busca dinámicamente el ID de centro_costo y concepto para 'Traslados'"""
        cursor = self.conn.cursor()
        try:
            # 1. Buscar centro_costo en config_filtros_centro_costos (label 'Excluir Traslados')
            cursor.execute("SELECT centro_costo_id FROM config_filtros_centro_costos WHERE etiqueta ILIKE %s LIMIT 1", ('%traslado%',))
            row_grupo = cursor.fetchone()
            centro_costo_id = row_grupo[0] if row_grupo else None
            
            if not centro_costo_id:
                return None, None
                
            # 2. Buscar concepto 'Traslado' en ese centro_costo
            cursor.execute("SELECT conceptoid FROM conceptos WHERE centro_costo_id = %s AND concepto ILIKE %s LIMIT 1", (centro_costo_id, '%traslado%'))
            row_concepto = cursor.fetchone()
            conceptoid = row_concepto[0] if row_concepto else None
            
            return centro_costo_id, conceptoid
        finally:
            cursor.close()

    def _construir_filtros(self, 
                           fecha_inicio: Optional[date] = None, 
                           fecha_fin: Optional[date] = None,
                           cuenta_id: Optional[int] = None,
                           tercero_id: Optional[int] = None,
                           centro_costo_id: Optional[int] = None,
                           concepto_id: Optional[int] = None,
                           centros_costos_excluidos: Optional[List[int]] = None,
                           solo_pendientes: bool = False,
                           solo_clasificados: bool = False,
                           tipo_movimiento: Optional[str] = None,
                           descripcion_contiene: Optional[str] = None
    ) -> tuple[str, list]:
        """
        Construye la cláusula WHERE y los parámetros para los filtros comunes.
        Asume que la consulta base tiene JOINs con:
        m (movimientos_encabezado)
        md (movimientos_detalle) - REQUIRED for classification filters
        """
        conditions = []
        params = []
        
        if fecha_inicio:
            conditions.append("m.Fecha >= %s")
            params.append(fecha_inicio)
        if fecha_fin:
            conditions.append("m.Fecha <= %s")
            params.append(fecha_fin)
        if cuenta_id:
            conditions.append("m.CuentaID = %s")
            params.append(cuenta_id)
        
        # Filtros de clasificación aplican sobre el ENCABEZADO (m) para Tercero
        if tercero_id:
            conditions.append("m.terceroid = %s")
            params.append(tercero_id)
        
        # Centro de Costo y Concepto siguen siendo del DETALLE (md)
        if centro_costo_id:
            conditions.append("md.centro_costo_id = %s")
            params.append(centro_costo_id)
        if concepto_id:
            conditions.append("md.ConceptoID = %s")
            params.append(concepto_id)
             
        if centros_costos_excluidos and len(centros_costos_excluidos) > 0:
            conditions.append("(md.centro_costo_id IS NULL OR md.centro_costo_id NOT IN %s)")
            params.append(tuple(centros_costos_excluidos))
             
        if solo_pendientes:
            # Pendiente si el tercero en el encabezado es nulo O si alguno de los campos clave en detalle es nulo
            conditions.append("(m.terceroid IS NULL OR md.id IS NULL OR md.centro_costo_id IS NULL OR md.ConceptoID IS NULL)")
            
        if tipo_movimiento:
            if tipo_movimiento == 'ingresos':
                conditions.append("m.Valor > 0")
            elif tipo_movimiento == 'egresos':
                conditions.append("m.Valor < 0")
        
        if descripcion_contiene:
            conditions.append("m.Descripcion ILIKE %s")
            params.append(f"%{descripcion_contiene}%")
        
        if not conditions:
            return "", []
            
        if solo_pendientes:
            # Pendiente si el tercero en el encabezado es nulo O si alguno de los campos clave en detalle es nulo
            conditions.append("(m.terceroid IS NULL OR md.id IS NULL OR md.centro_costo_id IS NULL OR md.ConceptoID IS NULL)")
            
        if solo_clasificados:
             # Clasificado si tiene tercero en encabezado (vieja logica) Y detalle completo? 
             # O simplemente lo inverso a pendiente?
             # Definición de Clasificado: Tiene Centro de Costo Y Concepto asignados (Tercero ahora está en encabezado, pero puede ser nulo en algunos casos validos? No, asumimos que clasificado total implica todo)
             # Simplifiquemos: No es pendiente.
             conditions.append("NOT (m.terceroid IS NULL OR md.id IS NULL OR md.centro_costo_id IS NULL OR md.ConceptoID IS NULL)")
             
        return f" AND {' AND '.join(conditions)}", params

    def _row_to_movimiento(self, row) -> Movimiento:
        """Helper para convertir fila de BD (Encabezado) a objeto Movimiento"""
        # Nuevo orden esperado (según query actualizada): 
        # m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
        # m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
        # c.cuenta, mon.moneda, t.tercero
        
        # Mapping seguro:
        _id = row[0]
        fecha = row[1]
        desc = row[2] or ""
        ref = row[3] if row[3] else ""
        valor = row[4] if row[4] is not None else Decimal('0')
        usd = row[5] if row[5] is not None else None
        trm = row[6] if row[6] is not None else None
        moneda_id = row[7]
        cuenta_id = row[8]
        tercero_id = row[9]
        detalle_texto = row[10] if row[10] else None
        created_at = row[11] if len(row) > 11 else None
        
        cuenta_nombre = row[12] if len(row) > 12 else None
        moneda_nombre = row[13] if len(row) > 13 else None
        tercero_nombre = row[14] if len(row) > 14 else None
        
        # Instanciar Movimiento (sin clasificación detallada)
        if _id == 2232:
            print(f"DEBUG_REPO_2232: Row data: {row}")
            print(f"DEBUG_REPO_2232: tercero_id from row[9]={row[9]}, tercero_nombre from row[14]={row[14] if len(row)>14 else 'N/A'}")

        mov = Movimiento(
            id=_id,
            fecha=fecha,
            descripcion=desc,
            referencia=ref,
            valor=valor,
            usd=usd,
            trm=trm,
            moneda_id=moneda_id,
            cuenta_id=cuenta_id,
            created_at=created_at,
            detalle=detalle_texto,
            tercero_id=tercero_id,
            cuenta_nombre=cuenta_nombre,
            moneda_nombre=moneda_nombre,
            _tercero_nombre=tercero_nombre
            # detalles se pueblan aparte
        )
        return mov

    def _cargar_detalles_para_movimientos(self, movimientos: List[Movimiento]):
        """Carga y asigna los detalles para una lista de movimientos"""
        if not movimientos:
            return

        ids = [m.id for m in movimientos if m.id]
        if not ids:
            return

        cursor = self.conn.cursor()
        # Query para traer detalles + nombres de FKs
        query = """
            SELECT 
                d.id, d.movimiento_id, d.centro_costo_id, d.ConceptoID, d.TerceroID, d.Valor, d.created_at,
                g.centro_costo AS centro_costo_nombre,
                con.concepto AS concepto_nombre,
                t.tercero AS tercero_nombre
            FROM movimientos_detalle d
            LEFT JOIN centro_costos g ON d.centro_costo_id = g.centro_costo_id
            LEFT JOIN conceptos con ON d.ConceptoID = con.conceptoid
            LEFT JOIN terceros t ON d.TerceroID = t.terceroid
            WHERE d.movimiento_id = ANY(%s)
        """
        cursor.execute(query, (ids,))
        rows = cursor.fetchall()
        cursor.close()

        # Agrupar detalles por movimiento_id
        detalles_map = {}
        for row in rows:
            mov_id = row[1]
            detalle = MovimientoDetalle(
                id=row[0],
                movimiento_id=mov_id,
                centro_costo_id=row[2],
                concepto_id=row[3],
                tercero_id=row[4],
                valor=row[5],
                created_at=row[6],
                centro_costo_nombre=row[7],
                concepto_nombre=row[8],
                tercero_nombre=row[9]
            )
            if mov_id not in detalles_map:
                detalles_map[mov_id] = []
            detalles_map[mov_id].append(detalle)

        # Asignar a objetos Movimiento
        for mov in movimientos:
            if mov.id in detalles_map:
                mov.detalles = detalles_map[mov.id]

    def _validar_bloqueo(self, cuenta_id: int, fecha: date):
        """Lanza error si el periodo está CONCILIADO"""
        if not cuenta_id or not fecha:
            return
            
        cursor = self.conn.cursor()
        query = "SELECT estado FROM conciliaciones WHERE cuenta_id = %s AND year = %s AND month = %s"
        cursor.execute(query, (cuenta_id, fecha.year, fecha.month))
        row = cursor.fetchone()
        cursor.close()
        
        if row and row[0] == 'CONCILIADO':
            raise ValueError(f"No se permite modificar movimientos: El periodo {fecha.year}-{fecha.month} está CONCILIADO y bloqueado.")

    def guardar(self, mov: Movimiento) -> Movimiento:
        # Check lock
        self._validar_bloqueo(mov.cuenta_id, mov.fecha)

        # --- VALIDATION: Detalles must be provided ---
        if not mov.detalles or len(mov.detalles) == 0:
            raise ValueError("Debe proporcionar al menos un detalle de clasificación para el movimiento.")
        
        # --- VALIDATION: Sum of details must match header value ---
        total_detalles = sum(d.valor for d in mov.detalles)
        if abs(total_detalles - mov.valor) > Decimal('0.01'):  # Allow small rounding differences
            raise ValueError(
                f"La suma de los valores de los detalles ({total_detalles}) debe ser igual "
                f"al valor del encabezado ({mov.valor}). Diferencia encontrada: {mov.valor - total_detalles}"
            )

        # --- SYNC AUTOMÁTICA DE TERCEROS ---
        # Si hay un único detalle con tercero, forzamos que el encabezado tenga el mismo tercero.
        # Esto corrige inconsitencias donde la UI o Servicios envían el detalle clasificado pero no el encabezado.
        if mov.detalles and len(mov.detalles) == 1:
            detalle = mov.detalles[0]
            if detalle.tercero_id and mov.tercero_id != detalle.tercero_id:
                print(f"AUTO-SYNC: Actualizando Encabezado TerceroID {mov.tercero_id} -> {detalle.tercero_id} desde Detalle.")
                mov.tercero_id = detalle.tercero_id
        
        # If updating, check old lock too (in case date or account changed)
        if mov.id:
            old_mov = self.obtener_por_id(mov.id)
            if old_mov and (old_mov.fecha != mov.fecha or old_mov.cuenta_id != mov.cuenta_id):
                self._validar_bloqueo(old_mov.cuenta_id, old_mov.fecha)

        cursor = self.conn.cursor()
        try:
            if mov.id:
                # Update Encabezado
                query = """
                    UPDATE movimientos_encabezado 
                    SET Fecha=%s, Descripcion=%s, Referencia=%s, Valor=%s, USD=%s, TRM=%s,
                        MonedaID=%s, CuentaID=%s, terceroid=%s, Detalle=%s
                    WHERE Id=%s
                """
                cursor.execute(query, (
                    mov.fecha, mov.descripcion, mov.referencia, mov.valor, mov.usd, mov.trm,
                    mov.moneda_id, mov.cuenta_id, mov.tercero_id, mov.detalle,
                    mov.id
                ))
            else:
                # Insert Encabezado
                query = """
                    INSERT INTO movimientos_encabezado (
                        Fecha, Descripcion, Referencia, Valor, USD, TRM,
                        MonedaID, CuentaID, terceroid, Detalle
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING Id, created_at
                """
                cursor.execute(query, (
                    mov.fecha, mov.descripcion, mov.referencia, mov.valor, mov.usd, mov.trm,
                    mov.moneda_id, mov.cuenta_id, mov.tercero_id, mov.detalle
                ))
                result = cursor.fetchone()
                mov.id = result[0]
                mov.created_at = result[1]
            
            # --- Manejo de Detalles ---
            # Si no hay detalles, creamos uno por defecto (unclassified)
            if not mov.detalles:
                mov.detalles = [MovimientoDetalle(
                    valor=mov.valor,
                    centro_costo_id=None,
                    concepto_id=None,
                    tercero_id=mov.tercero_id
                )]
            
            # Upsert de detalles
            # Simplificación: Borrar existentes y recrear es más fácil, pero pierde historial de IDs?
            # Si los IDs de detalle no son referenciados externamente (logs?), está bien borrar y crear.
            # O intentar UPDATE si tiene ID.
            # Vamos a intentar UPDATE si tiene ID, INSERT si no.
            # Y eliminar los que ya no estén en la lista (si mov.id ya existía).
            
            if mov.id: # Si estamos editando un movimiento existente
                # Obtener IDs actuales en BD
                cursor.execute("SELECT id FROM movimientos_detalle WHERE movimiento_id = %s", (mov.id,))
                existing_ids = set(r[0] for r in cursor.fetchall())
                
                incoming_ids = set(d.id for d in mov.detalles if d.id)
                ids_to_delete = existing_ids - incoming_ids
                
                if ids_to_delete:
                    cursor.execute("DELETE FROM movimientos_detalle WHERE id = ANY(%s)", (list(ids_to_delete),))
            
            for d in mov.detalles:
                d.movimiento_id = mov.id # Asegurar link
                if d.id:
                    # Update
                    q_det = """
                        UPDATE movimientos_detalle
                        SET centro_costo_id=%s, ConceptoID=%s, TerceroID=%s, Valor=%s
                        WHERE id=%s
                    """
                    cursor.execute(q_det, (d.centro_costo_id, d.concepto_id, d.tercero_id, d.valor, d.id))
                else:
                    # Insert
                    q_det = """
                        INSERT INTO movimientos_detalle (movimiento_id, centro_costo_id, ConceptoID, TerceroID, Valor)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, created_at
                    """
                    cursor.execute(q_det, (d.movimiento_id, d.centro_costo_id, d.concepto_id, d.tercero_id, d.valor))
                    res_det = cursor.fetchone()
                    d.id = res_det[0]
                    d.created_at = res_det[1]

            self.conn.commit()
            
            # --- AUTO-RECONCILIATION HOOK ---
            try:
                # Solo recalculamos si hay cuenta asociada y fecha
                if mov.cuenta_id and mov.fecha:
                    year = mov.fecha.year
                    month = mov.fecha.month
                    self.conciliacion_repo.recalcular_sistema(mov.cuenta_id, year, month)
            except Exception as e:
                print(f"WARNING: Error al recalcular conciliacion: {e}")
                
            return mov
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, id: int) -> Optional[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            WHERE m.Id=%s
        """
        cursor.execute(query, (id,))
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            mov = self._row_to_movimiento(row)
            self._cargar_detalles_para_movimientos([mov])
            return mov
        return None

    def obtener_por_ids(self, ids: List[int]) -> List[Movimiento]:
        if not ids:
            return []
            
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            WHERE m.Id = ANY(%s)
            ORDER BY m.Fecha DESC
        """
        cursor.execute(query, (ids,))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def obtener_todos(self) -> List[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def buscar_por_fecha(self, fecha_inicio: date, fecha_fin: date) -> List[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            WHERE m.Fecha BETWEEN %s AND %s
            ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
        """
        cursor.execute(query, (fecha_inicio, fecha_fin))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def buscar_pendientes_clasificacion(
        self, 
        terceros_pendientes: List[int] = None,
        centros_costos_pendientes: List[int] = None,
        conceptos_pendientes: List[int] = None
    ) -> List[Movimiento]:
        cursor = self.conn.cursor()
        
        # Construir condiciones dinámicas
        tercero_conditions = ["m.terceroid IS NULL"]
        centro_costo_conditions = ["md.centro_costo_id IS NULL"]
        concepto_conditions = ["md.ConceptoID IS NULL"]
        params = []
        
        if terceros_pendientes and len(terceros_pendientes) > 0:
            tercero_conditions.append("m.terceroid IN %s")
            params.append(tuple(terceros_pendientes))
        
        if centros_costos_pendientes and len(centros_costos_pendientes) > 0:
            centro_costo_conditions.append("md.centro_costo_id IN %s")
            params.append(tuple(centros_costos_pendientes))
            
        if conceptos_pendientes and len(conceptos_pendientes) > 0:
            concepto_conditions.append("md.ConceptoID IN %s")
            params.append(tuple(conceptos_pendientes))
        
        # Condiciones combinadas
        where_or = f"""
            (({' OR '.join(tercero_conditions)})
            OR ({' OR '.join(centro_costo_conditions)})
            OR ({' OR '.join(concepto_conditions)}))
        """
        
        # Use GROUP BY m.Id to avoid duplicates due to details join
        query = f"""
            SELECT m.Id
            FROM movimientos_encabezado m
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            WHERE {where_or}
               OR md.id IS NULL
            GROUP BY m.Id
            ORDER BY MAX(m.Fecha) DESC, MAX(ABS(m.Valor)) DESC
        """
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        ids = [row[0] for row in rows]
        return self.obtener_por_ids(ids)
    
    def buscar_por_referencia(self, referencia: str) -> List[Movimiento]:
        cursor = self.conn.cursor()
        # Normalizar la referencia removiendo ceros iniciales para comparación
        referencia_normalizada = referencia.lstrip('0') if referencia else referencia
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            WHERE LTRIM(m.Referencia, '0') = %s
            ORDER BY m.Fecha DESC
        """
        cursor.execute(query, (referencia_normalizada,))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def existe_movimiento(self, fecha: date, valor: Decimal, referencia: str, cuenta_id: int, descripcion: str = None, usd: Decimal = None) -> bool:
        cursor = self.conn.cursor()
        
        # Base requirements: Account and Date must always match
        # AND check for uniqueness based on Reference OR (Value + Description)
        
        # 1. Scope query by Account AND Date
        query_base = "SELECT 1 FROM movimientos_encabezado WHERE CuentaID=%s AND Fecha=%s"
        params = [cuenta_id, fecha]
        
        if referencia and referencia.strip():
            # CAUTION: Even with reference, we must ensure it's not a different transaction
            # But the user trusts reference. We'll stick to Reference + Account + Date
            query = query_base + " AND Referencia=%s"
            params.append(referencia)
            
            # If USD is involved, we might want to check it too, but reference is usually strong enough.
            # Kept logic: If USD provided, check it.
            if usd is not None:
                query += " AND USD=%s"
                params.append(usd)
        else:
            # If NO reference, we MUST use Description to distinguish similar transactions
            # e.g. Two transfers of 500.000 on same day but different descriptions
            
            target_val = usd if usd is not None else valor
            col_val = "USD" if usd is not None else "Valor"
            
            # Add Value check
            query = query_base + f" AND {col_val}=%s"
            params.append(target_val)
            
            if descripcion:
                # CRITICAL FIX: Always check Description if Reference is missing
                # Use ILIKE for case-insensitive comparison
                query += " AND Descripcion ILIKE %s"
                params.append(descripcion)
            else:
                # If no description provided either, we are forced to check just by Value/Date
                # This is risky but standard fallback
                pass
            
        cursor.execute(query, tuple(params))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    def contar_movimientos_similares(self, fecha: date, valor: Decimal, referencia: str, cuenta_id: int, descripcion: str = None, usd: Decimal = None) -> int:
        cursor = self.conn.cursor()
        
        # 1. Scope query by Account AND Date
        query_base = "SELECT COUNT(*) FROM movimientos_encabezado WHERE CuentaID=%s AND Fecha=%s"
        params = [cuenta_id, fecha]
        
        if referencia and referencia.strip():
            query = query_base + " AND Referencia=%s"
            params.append(referencia)
            
            if usd is not None:
                query += " AND USD=%s"
                params.append(usd)
        else:
            target_val = usd if usd is not None else valor
            col_val = "USD" if usd is not None else "Valor"
            
            query = query_base + f" AND {col_val}=%s"
            params.append(target_val)
            
            if descripcion:
                query += " AND Descripcion ILIKE %s"
                params.append(descripcion)
            
        cursor.execute(query, tuple(params))
        count = cursor.fetchone()[0]
        cursor.close()
        return count

    def obtener_exacto(self, cuenta_id: int, fecha: date, valor: Decimal, referencia: Optional[str] = None, descripcion: Optional[str] = None) -> Optional[Movimiento]:
        cursor = self.conn.cursor()
        try:
            # Query base
            query = """
                SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                       m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                       c.cuenta AS cuenta_nombre,
                       mon.moneda AS moneda_nombre,
                       t.tercero AS tercero_nombre
                FROM movimientos_encabezado m
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
                LEFT JOIN terceros t ON m.terceroid = t.terceroid
                WHERE m.CuentaID = %s 
                  AND m.Fecha = %s
                  AND m.Valor = %s
            """
            params = [cuenta_id, fecha, valor]

            # Criterio adicional: Referencia O Descripción
            if referencia and referencia.strip():
                # Si tenemos referencia, la usamos como criterio fuerte
                # Normalizamos '000123' vs '123' usando LTRIM de ceros o simplemente string compare exacto si confiamos
                # El usuario prefiere exactitud, usaremos la referencia tal cual si existe
                query += " AND (m.Referencia = %s OR (m.Referencia IS NULL AND m.Descripcion = %s))"
                params.extend([referencia, descripcion or ''])
            elif descripcion:
                # Si no hay referencia, confiamos en la descripción exacta
                query += " AND m.Descripcion = %s"
                params.append(descripcion)
            
            # Limit 1
            query += " LIMIT 1"
            
            cursor.execute(query, tuple(params))
            row = cursor.fetchone()
            
            if row:
                mov = self._row_to_movimiento(row)
                self._cargar_detalles_para_movimientos([mov])
                return mov
            return None
            
        finally:
            cursor.close()

    def buscar_avanzado(self, 
                       fecha_inicio: Optional[date] = None, 
                       fecha_fin: Optional[date] = None,
                       cuenta_id: Optional[int] = None,
                       tercero_id: Optional[int] = None,
                       centro_costo_id: Optional[int] = None,
                       concepto_id: Optional[int] = None,
                       centros_costos_excluidos: Optional[List[int]] = None,
                       solo_pendientes: bool = False,
                       solo_clasificados: bool = False,
                       tipo_movimiento: Optional[str] = None,
                       descripcion_contiene: Optional[str] = None,
                       skip: int = 0,
                       limit: Optional[int] = None
    ) -> tuple[List[Movimiento], int]:
        cursor = self.conn.cursor()
        
        # Estrategia: Obtener IDs primero para evitar problemas con JOINs + Pagination
        # y para asegurar DISTINCT.
        
        # Base query for filtering
        query_base = """
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            centro_costo_id=centro_costo_id,
            concepto_id=concepto_id,
            centros_costos_excluidos=centros_costos_excluidos,
            solo_pendientes=solo_pendientes,
            solo_clasificados=solo_clasificados,
            tipo_movimiento=tipo_movimiento,
            descripcion_contiene=descripcion_contiene
        )
        
        query_full_where = query_base + where_clause
        
        # Count Query (Distinct Header IDs)
        count_query = "SELECT COUNT(DISTINCT m.Id) " + query_full_where
        
        cursor.execute(count_query, tuple(params))
        total_count = cursor.fetchone()[0]
        
        # Data Query (Get IDs first to handle Pagination + Sort + Distinct)
        # Using GROUP BY m.Id allows us to sort by aggregates like MAX(m.Fecha) or MAX(ABS(m.Valor))
        query_ids = "SELECT m.Id " + query_full_where + " GROUP BY m.Id"
        
        query_ids += " ORDER BY MAX(m.Fecha) DESC, MAX(ABS(m.Valor)) DESC, m.Id DESC"
        
        if limit is not None:
             query_ids += f" OFFSET {skip} LIMIT {limit}"
             
        cursor.execute(query_ids, tuple(params))
        id_rows = cursor.fetchall()
        
        ids = [row[0] for row in id_rows]
        cursor.close()
        
        if not ids:
            return [], total_count
            
        # Re-use obtener_por_ids to get full objects with details
        # Note: obtener_por_ids re-sorts by Fecha DESC, which is consistent.
        movimientos = self.obtener_por_ids(ids)
        return movimientos, total_count

    def resumir_por_clasificacion(self, 
                                 tipo_agrupacion: str,
                                 fecha_inicio: Optional[date] = None, 
                                 fecha_fin: Optional[date] = None,
                                 cuenta_id: Optional[int] = None,
                                 tercero_id: Optional[int] = None,
                                 centro_costo_id: Optional[int] = None,
                                 concepto_id: Optional[int] = None,
                                 centros_costos_excluidos: Optional[List[int]] = None,
                                 tipo_movimiento: Optional[str] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Determinar campo de agrupación y joins necesarios
        if tipo_agrupacion == 'centro_costo':
            group_field = "COALESCE(g.centro_costo, 'Sin Centro de Costo')"
        elif tipo_agrupacion == 'tercero':
            group_field = "COALESCE(t.tercero, 'Sin Tercero')"
        elif tipo_agrupacion == 'concepto':
            group_field = "COALESCE(con.concepto, 'Sin Concepto')"
        else:
             raise ValueError("Tipo de agrupación debe ser 'centro_costo', 'tercero' o 'concepto'")

        # Query principal sobre DETALLES
        # Usamos md.Valor para la suma por clasificación
        query = f"""
            SELECT 
                {group_field} as nombre,
                SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN md.Valor < 0 THEN ABS(md.Valor) ELSE 0 END) as egresos,
                SUM(md.Valor) as saldo
            FROM movimientos_encabezado m
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id
            LEFT JOIN conceptos con ON md.ConceptoID = con.conceptoid
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            centro_costo_id=centro_costo_id,
            concepto_id=concepto_id,
            centros_costos_excluidos=centros_costos_excluidos,
            tipo_movimiento=tipo_movimiento
        )
        
        query += where_clause
        query += f" GROUP BY {group_field} ORDER BY SUM(md.Valor) ASC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            {
                "nombre": row[0],
                "ingresos": float(row[1] or 0),
                "egresos": float(row[2] or 0),
                "saldo": float(row[3] or 0)
            }
            for row in rows
        ]

    def buscar_contexto_por_descripcion_similar(self, patron: str, limite: int = 5) -> List[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            WHERE m.Descripcion ILIKE %s
              AND m.terceroid IS NOT NULL
            ORDER BY m.Fecha DESC 
            LIMIT %s
        """
        cursor.execute(query, (patron, limite))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def actualizar_clasificacion_lote(self, patron: str, tercero_id: int, centro_costo_id: int, concepto_id: int) -> int:
        cursor = self.conn.cursor()
        try:
            # 1. Actualizar Encabezado (TerceroID)
            q_enc = """
                UPDATE movimientos_encabezado 
                SET terceroid = %s
                WHERE Descripcion ILIKE %s
                  AND terceroid IS NULL
            """
            like_pattern = f"%{patron}%"
            cursor.execute(q_enc, (tercero_id, like_pattern))
            affected_enc = cursor.rowcount

            # 2. Actualizar Detalle (Centro Costo, Concepto, y TerceroID por consistencia)
            query = """
                UPDATE movimientos_detalle md
                SET TerceroID = %s, centro_costo_id = %s, ConceptoID = %s
                FROM movimientos_encabezado m
                WHERE md.movimiento_id = m.Id
                  AND m.Descripcion ILIKE %s
                  AND (md.TerceroID IS NULL OR md.centro_costo_id IS NULL OR md.ConceptoID IS NULL)
            """
            cursor.execute(query, (tercero_id, centro_costo_id, concepto_id, like_pattern))
            
            affected_det = cursor.rowcount
            self.conn.commit()
            return max(affected_enc, affected_det) # Retornar el mayor impacto
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_datos_exportacion(self, limit: int = None, plain_format: bool = False) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Exportación debe incluir detalles
        if plain_format:
            query = """
                SELECT 
                    m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM,
                    m.MonedaID, m.CuentaID, m.terceroid as TerceroID, m.Detalle, m.created_at,
                    md.centro_costo_id, md.ConceptoID, md.Valor as ValorDetalle
                FROM movimientos_encabezado m
                LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
                ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
            """
        else:
            query = """
                SELECT 
                    m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM,
                    m.MonedaID, mon.moneda as Moneda,
                    m.CuentaID, c.cuenta as Cuenta,
                    m.terceroid as TerceroID, t.tercero as Tercero,
                    md.centro_costo_id, g.centro_costo as CentroCosto,
                    md.ConceptoID, con.concepto as Concepto,
                    m.Detalle, m.created_at,
                    md.Valor as ValorDetalle
                FROM movimientos_encabezado m
                LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
                LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                LEFT JOIN terceros t ON m.terceroid = t.terceroid
                LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id
                LEFT JOIN conceptos con ON md.ConceptoID = con.conceptoid
                ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
            """
            
        if limit:
            query += f" LIMIT {limit}"
            
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Get column names
        col_names = [desc[0] for desc in cursor.description]
        
        cursor.close()
        
        # Return list of dicts
        results = []
        for row in rows:
            results.append(dict(zip(col_names, row)))
            
        return results

    def resumir_ingresos_gastos_por_mes(self, 
                                 fecha_inicio: Optional[date] = None, 
                                 fecha_fin: Optional[date] = None,
                                 cuenta_id: Optional[int] = None,
                                 tercero_id: Optional[int] = None,
                                 centro_costo_id: Optional[int] = None,
                                 concepto_id: Optional[int] = None,
                                 centros_costos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Agregamos por Mes usando valores DE LOS DETALLES (md.Valor)
        # Esto permite filtrar correctamente gastos split.
        query = """
            SELECT 
                TO_CHAR(m.Fecha, 'YYYY-MM') as mes,
                SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN md.Valor < 0 THEN ABS(md.Valor) ELSE 0 END) as egresos,
                SUM(md.Valor) as saldo
            FROM movimientos_encabezado m
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.terceroid = t.terceroid
            LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id
            LEFT JOIN conceptos con ON md.ConceptoID = con.conceptoid
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            centro_costo_id=centro_costo_id,
            concepto_id=concepto_id,
            centros_costos_excluidos=centros_costos_excluidos
        )
        
        query += where_clause
        query += " GROUP BY TO_CHAR(m.Fecha, 'YYYY-MM') ORDER BY mes DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            {
                "mes": row[0],
                "ingresos": float(row[1] or 0),
                "egresos": float(row[2] or 0),
                "saldo": float(row[3] or 0)
            }
            for row in rows
        ]
    def obtener_sugerencias_reclasificacion(self, fecha_inicio: Optional[date] = None, fecha_fin: Optional[date] = None) -> List[dict]:
        """
        Agrupa movimientos por Tercero que NO sean traslados y que tengan Ingresos > 0.
        (Elimina los que tienen solo egresos, pues son gastos reales).
        """
        cursor = self.conn.cursor()
        
        # Query sobre DETALLES (md)
        query = """
            SELECT 
                md.TerceroID, t.tercero as TerceroNombre,
                COUNT(DISTINCT m.Id) as Cantidad,
                SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) as Ingresos,
                SUM(CASE WHEN md.Valor < 0 THEN ABS(md.Valor) ELSE 0 END) as Egresos,
                SUM(ABS(md.Valor)) as VolumenTotal
            FROM movimientos_encabezado m
            JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            JOIN terceros t ON m.terceroid = t.terceroid
            WHERE 1=1
        """
        params = []
        
        # Exclude traslados dynamically
        grupoid_t, _ = self._get_ids_traslados()
        if grupoid_t:
            query += " AND (md.centro_costo_id IS NULL OR md.centro_costo_id != %s)"
            params.append(grupoid_t)
        
        if fecha_inicio:
            query += " AND m.Fecha >= %s"
            params.append(fecha_inicio)
        if fecha_fin:
            query += " AND m.Fecha <= %s"
            params.append(fecha_fin)
 
        query += """
            GROUP BY md.TerceroID, t.tercero
            HAVING SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) > 0
            ORDER BY VolumenTotal DESC
            LIMIT 50
        """
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            {
                "tercero_id": row[0],
                "tercero_nombre": row[1],
                "centro_costo_id": None, 
                "centro_costo_nombre": "Varios",
                "concepto_id": None, 
                "concepto_nombre": "Varios",
                "cantidad": row[2],
                "ingresos": float(row[3] or 0),
                "egresos": float(row[4] or 0),
                "volumen_total": float(row[5] or 0)
            }
            for row in rows
        ]

    def eliminar(self, id: int) -> None:
        """
        Elimina físicamente un movimiento y recalcula la conciliación afectada.
        """
        cursor = self.conn.cursor()
        try:
            # 1. Obtener datos para recalculo antes de borrar
            query_get = "SELECT CuentaID, Fecha FROM movimientos_encabezado WHERE Id = %s"
            cursor.execute(query_get, (id,))
            row = cursor.fetchone()
            
            cuenta_id = row[0] if row else None
            fecha = row[1] if row else None
            
            if cuenta_id and fecha:
                self._validar_bloqueo(cuenta_id, fecha)
 
            # 2. Eliminar (Cascade elimina detalles)
            query = "DELETE FROM movimientos_encabezado WHERE Id = %s"
            cursor.execute(query, (id,))
            self.conn.commit()
            
            # 3. Recalcular Conciliación (Hook)
            if cuenta_id and fecha:
                try:
                    # Asumimos que fecha es date o datetime
                    self.conciliacion_repo.recalcular_sistema(cuenta_id, fecha.year, fecha.month)
                except Exception as e:
                    print(f"WARNING: Error al recalcular conciliacion tras eliminación: {e}")
                    
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()


    def obtener_movimientos_centro_costo(self, tercero_id: int, centro_costo_id: Optional[int] = None, concepto_id: Optional[int] = None, fecha_inicio: Optional[date] = None, fecha_fin: Optional[date] = None) -> List[Movimiento]:
        """
        Obtiene los movimientos de un Tercero sugerido (ignora centro_costo/concepto específicos).
        """
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.terceroid, m.Detalle, m.created_at,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            WHERE md.TerceroID = %s
        """
        params = [tercero_id]
        
        grupoid_t, _ = self._get_ids_traslados()
        if grupoid_t:
            query += " AND (md.centro_costo_id IS NULL OR md.centro_costo_id != %s)"
            params.append(grupoid_t)
        
        if fecha_inicio:
            query += " AND m.Fecha >= %s"
            params.append(fecha_inicio)
        if fecha_fin:
            query += " AND m.Fecha <= %s"
            params.append(fecha_fin)
            
        query += " ORDER BY m.Fecha DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        self._cargar_detalles_para_movimientos(movimientos)
        return movimientos

    def reclasificar_movimientos_centro_costo(self, tercero_id: int, centro_costo_id_anterior: Optional[int] = None, concepto_id_anterior: Optional[int] = None, fecha_inicio: Optional[date] = None, fecha_fin: Optional[date] = None, movimiento_ids: Optional[List[int]] = None) -> int:
        """
        Actualiza los movimientos de un Tercero para ser Traslado.
        Si se proporcionan movimiento_ids, solo actualiza esos.
        """
        cursor = self.conn.cursor()
        grupoid_t, conceptoid_t = self._get_ids_traslados()
        
        if not grupoid_t or not conceptoid_t:
            # Si no hay configuración, no podemos reclasificar dinámicamente
            raise ValueError("No se encontró la configuración del centro_costo/concepto de Traslados en la base de datos.")

        try:
            NEW_CENTRO_COSTO_ID = grupoid_t
            NEW_CONCEPTO_ID = conceptoid_t
            
            # Update DETALLES
            query = """
                UPDATE movimientos_detalle md
                SET centro_costo_id = %s, ConceptoID = %s
                FROM movimientos_encabezado m
                WHERE md.movimiento_id = m.Id
                  AND md.TerceroID = %s 
                  AND (md.centro_costo_id IS NULL OR md.centro_costo_id != %s)
            """
            params = [NEW_CENTRO_COSTO_ID, NEW_CONCEPTO_ID, tercero_id, NEW_CENTRO_COSTO_ID] # Evitar updates redundantes
            
            if movimiento_ids is not None:
                # Si se especifican IDs (Header), usamos esos
                # OJO: movimiento_ids son IDs de ENCABEZADO normalmente.
                query += " AND m.Id = ANY(%s)"
                params.append(movimiento_ids)
            else:
                # Si no, usamos los filtros de fecha
                if fecha_inicio:
                    query += " AND m.Fecha >= %s"
                    params.append(fecha_inicio)
                if fecha_fin:
                    query += " AND m.Fecha <= %s"
                    params.append(fecha_fin)
            
            cursor.execute(query, tuple(params))
            affected = cursor.rowcount
            self.conn.commit()
            return affected
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_desglose_gastos(self, 
                               nivel: str,
                               fecha_inicio: Optional[date] = None, 
                               fecha_fin: Optional[date] = None,
                               cuenta_id: Optional[int] = None,
                               tercero_id: Optional[int] = None,
                               centro_costo_id: Optional[int] = None,
                               concepto_id: Optional[int] = None,
                               centros_costos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Mapping level to columns
    def obtener_desglose_gastos(self, 
                               nivel: str,
                               fecha_inicio: Optional[date] = None, 
                               fecha_fin: Optional[date] = None,
                               cuenta_id: Optional[int] = None,
                               tercero_id: Optional[int] = None,
                               centro_costo_id: Optional[int] = None,
                               concepto_id: Optional[int] = None,
                               centros_costos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Mapping level to columns (Updated for DETAILS)
        if nivel == 'tercero':
            col_id = "md.TerceroID"
            col_name = "t.tercero"
            join_clause = "LEFT JOIN terceros t ON md.TerceroID = t.terceroid"
            order_clause = "ORDER BY egresos DESC"
        elif nivel == 'centro_costo':
            col_id = "md.centro_costo_id"
            col_name = "g.centro_costo"
            join_clause = "LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id"
            order_clause = "ORDER BY egresos ASC" 
        elif nivel == 'concepto':
            col_id = "md.ConceptoID"
            col_name = "con.concepto"
            join_clause = "LEFT JOIN conceptos con ON md.ConceptoID = con.conceptoid"
            order_clause = "ORDER BY egresos DESC"
        else:
            raise ValueError("Nivel inválido")

        # SOLUCION: Agregar el JOIN con centro_costos siempre para poder filtrar por ID de centro_costo.
        joins_extra = ""
        if 'JOIN centro_costos' not in join_clause:
            joins_extra = " LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id"
            
        query = f"""
            SELECT 
                {col_id} as id,
                COALESCE({col_name}, 'Sin Clasificar') as nombre,
                SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN md.Valor < 0 THEN ABS(md.Valor) ELSE 0 END) as egresos,
                SUM(md.Valor) as saldo
            FROM movimientos_encabezado m
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            {join_clause}
            {joins_extra}
            WHERE 1=1
        """

        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            centro_costo_id=centro_costo_id,
            concepto_id=concepto_id,
            centros_costos_excluidos=centros_costos_excluidos
        )
        
        query += where_clause
        query += f" GROUP BY {col_id}, {col_name} {order_clause}"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            {
                "id": row[0],
                "nombre": row[1],
                "ingresos": float(row[2] or 0),
                "egresos": float(row[3] or 0),
                "saldo": float(row[4] or 0)
            }
            for row in rows
        ]

    def obtener_estadisticas_dashboard(self,
                                      fecha_inicio: Optional[date] = None,
                                      fecha_fin: Optional[date] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        query = """
            SELECT 
                TO_CHAR(m.Fecha, 'YYYY-Mon') as periodo,
                m.CuentaID, c.cuenta as cuenta_nombre,
                md.centro_costo_id, g.centro_costo as centro_costo_nombre,
                COUNT(DISTINCT m.Id) as conteo,
                SUM(CASE WHEN md.Valor > 0 THEN md.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN md.Valor < 0 THEN ABS(md.Valor) ELSE 0 END) as egresos
            FROM movimientos_encabezado m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN movimientos_detalle md ON m.Id = md.movimiento_id
            LEFT JOIN centro_costos g ON md.centro_costo_id = g.centro_costo_id
            WHERE 1=1
        """
        params = []
        if fecha_inicio:
            query += " AND m.Fecha >= %s"
            params.append(fecha_inicio)
        if fecha_fin:
            query += " AND m.Fecha <= %s"
            params.append(fecha_fin)
            
        # Agrupar y Ordenar
        query += """
            GROUP BY TO_CHAR(m.Fecha, 'YYYY-Mon'), TO_CHAR(m.Fecha, 'YYYY-MM'), m.CuentaID, c.cuenta, md.centro_costo_id, g.centro_costo
            ORDER BY TO_CHAR(m.Fecha, 'YYYY-MM') DESC, c.cuenta, g.centro_costo
        """
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            {
                "periodo": row[0],
                "cuenta_id": row[1],
                "cuenta_nombre": row[2] or "Desconocida",
                "centro_costo_id": row[3],
                "centro_costo_nombre": row[4] or "Sin Clasificar",
                "conteo": int(row[5]),
                "ingresos": float(row[6] or 0),
                "egresos": float(row[7] or 0)
            }
            for row in rows
        ]

    def eliminar(self, id: int) -> None:
        if not id:
            return
            
        cursor = self.conn.cursor()
        try:
            # 1. Obtener info para validar bloqueo
            mov = self.obtener_por_id(id)
            if mov:
                self._validar_bloqueo(mov.cuenta_id, mov.fecha)

            # 2. Eliminar vinculaciones (match) donde este movimiento es el del sistema
            cursor.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (id,))
            
            # 3. Eliminar detalles
            cursor.execute("DELETE FROM movimientos_detalle WHERE movimiento_id = %s", (id,))
            
            # 4. Eliminar encabezado
            cursor.execute("DELETE FROM movimientos_encabezado WHERE Id = %s", (id,))
            
            self.conn.commit()
            
            # Hook conciliacion
            if mov:
                try:
                    self.conciliacion_repo.recalcular_sistema(mov.cuenta_id, mov.fecha.year, mov.fecha.month)
                except:
                    pass
                    
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def analizar_desvinculacion(self, fecha_inicio: date, fecha_fin: date, cuenta_id: Optional[int] = None) -> List[dict]:
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT 
                    m.CuentaID, 
                    c.cuenta,
                    COUNT(m.Id) as conteo,
                    SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as ingresos,
                    SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as egresos
                FROM movimientos_encabezado m
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                WHERE m.Fecha BETWEEN %s AND %s
            """
            params = [fecha_inicio, fecha_fin]
            
            if cuenta_id:
                query += " AND m.CuentaID = %s"
                params.append(cuenta_id)
                
            query += """
                GROUP BY m.CuentaID, c.cuenta
                ORDER BY c.cuenta
            """
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            
            return [
                {
                    "cuenta_id": row[0],
                    "cuenta_nombre": row[1] or "Desconocida",
                    "conteo": int(row[2]),
                    "ingresos": float(row[3] or 0),
                    "egresos": float(row[4] or 0)
                }
                for row in rows
            ]
        finally:
            cursor.close()

    def eliminar_rango(self, fecha_inicio: date, fecha_fin: date, cuenta_id: Optional[int] = None) -> int:
        cursor = self.conn.cursor()
        try:
            # 1. Obtener IDs a eliminar en el rango
            query_ids = "SELECT Id, CuentaID, Fecha FROM movimientos_encabezado WHERE Fecha BETWEEN %s AND %s"
            params = [fecha_inicio, fecha_fin]
            
            if cuenta_id:
                query_ids += " AND CuentaID = %s"
                params.append(cuenta_id)
            
            cursor.execute(query_ids, tuple(params))
            rows = cursor.fetchall()
            
            if not rows:
                return 0
                
            ids = [r[0] for r in rows]
            cuentas_afectadas = set((r[1], r[2].year, r[2].month) for r in rows)
            
            # 2. Validar bloqueos (ya debió validarse en servicio, pero doble check por seguridad DB)
            for c_id, y, m in cuentas_afectadas:
                self._validar_bloqueo(c_id, date(y, m, 1))

            # 3. Eliminar vinculaciones
            cursor.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = ANY(%s)", (ids,))
            
            # 4. Eliminar detalles
            cursor.execute("DELETE FROM movimientos_detalle WHERE movimiento_id = ANY(%s)", (ids,))
            
            # 5. Eliminar encabezados
            cursor.execute("DELETE FROM movimientos_encabezado WHERE Id = ANY(%s)", (ids,))
            count = cursor.rowcount
            
            self.conn.commit()
            
            # 6. Recalcular conciliaciones afectadas
            for c_id, y, m in cuentas_afectadas:
                try:
                    self.conciliacion_repo.recalcular_sistema(c_id, y, m)
                except Exception as e:
                    print(f"Warning: Error recalculando conciliacion {c_id}-{y}-{m}: {e}")
            
            return count
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def desvincular_por_ids(self, ids: List[int]) -> int:
        """
        Desvincula (reset) una lista específica de movimientos por sus IDs.
        """
        if not ids:
            return 0
            
        cursor = self.conn.cursor()
        try:
            # 1. Obtener info básica para validar bloqueos y regenerar detalles
            # [FIX] Incluir terceroid para no perderlo al regenerar detalle
            query_info = "SELECT Id, CuentaID, Fecha, Valor, terceroid FROM movimientos_encabezado WHERE Id = ANY(%s)"
            cursor.execute(query_info, (ids,))
            rows = cursor.fetchall()
            
            if not rows:
                return 0
                
            found_ids = [r[0] for r in rows]
            # Map id -> (valor, tercero_id)
            id_data_map = {r[0]: {'valor': r[3], 'tercero_id': r[4]} for r in rows}
            cuentas_afectadas = set((r[1], r[2].year, r[2].month) for r in rows)
            
            # 2. Validar bloqueos
            for c_id, y, m in cuentas_afectadas:
                self._validar_bloqueo(c_id, date(y, m, 1))

            # 3. Eliminar vinculaciones
            cursor.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = ANY(%s)", (found_ids,))
            
            # 4. Eliminar detalles actuales
            cursor.execute("DELETE FROM movimientos_detalle WHERE movimiento_id = ANY(%s)", (found_ids,))
            
            # 5. Insertar detalle por defecto (Reset) manteniendo tercero del encabezado
            insert_query = """
                INSERT INTO movimientos_detalle (movimiento_id, centro_costo_id, ConceptoID, TerceroID, Valor)
                VALUES (%s, NULL, NULL, %s, %s)
            """
            insert_data = [(m_id, d['tercero_id'], d['valor']) for m_id, d in id_data_map.items()]
            cursor.executemany(insert_query, insert_data)
            
            self.conn.commit()
            
            # 6. Recalcular conciliaciones
            for c_id, y, m in cuentas_afectadas:
                try:
                    self.conciliacion_repo.recalcular_sistema(c_id, y, m)
                except Exception as e:
                    print(f"Warning: Error recalculando conciliacion {c_id}-{y}-{m}: {e}")
            
            return len(found_ids)
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def desvincular_rango(self, fecha_inicio: date, fecha_fin: date, cuenta_id: Optional[int] = None) -> int:
        """
        Elimina detalles y desvincula (reset) los movimientos en el rango, 
        dejándolos en estado pendiente original (1 detalle sin clasificación).
        NO elimina los encabezados.
        """
        cursor = self.conn.cursor()
        try:
            # 1. Obtener IDs a resetear en el rango
            # [FIX] Incluir terceroid
            query_ids = "SELECT Id, CuentaID, Fecha, Valor, terceroid FROM movimientos_encabezado WHERE Fecha BETWEEN %s AND %s"
            params = [fecha_inicio, fecha_fin]
            
            if cuenta_id:
                query_ids += " AND CuentaID = %s"
                params.append(cuenta_id)
            
            cursor.execute(query_ids, tuple(params))
            rows = cursor.fetchall()
            
            if not rows:
                return 0
                
            ids = [r[0] for r in rows]
            # Map id -> (valor, tercero_id)
            id_data_map = {r[0]: {'valor': r[3], 'tercero_id': r[4]} for r in rows}
            cuentas_afectadas = set((r[1], r[2].year, r[2].month) for r in rows)
            
            # 2. Validar bloqueos
            for c_id, y, m in cuentas_afectadas:
                self._validar_bloqueo(c_id, date(y, m, 1))

            # 3. Eliminar vinculaciones (conciliaciones)
            cursor.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = ANY(%s)", (ids,))
            
            # 4. Eliminar detalles actuales (splits, clasificaciones)
            cursor.execute("DELETE FROM movimientos_detalle WHERE movimiento_id = ANY(%s)", (ids,))
            
            # 5. Insertar detalle por defecto (Reset)
            # Para cada movimiento, insertar un detalle con el valor total del encabezado y el tercero original
            insert_query = """
                INSERT INTO movimientos_detalle (movimiento_id, centro_costo_id, ConceptoID, TerceroID, Valor)
                VALUES (%s, NULL, NULL, %s, %s)
            """
            
            # Batch execute is cleaner
            insert_data = [(m_id, d['tercero_id'], d['valor']) for m_id, d in id_data_map.items()]
            cursor.executemany(insert_query, insert_data)
            
            count = len(ids)
            self.conn.commit()
            
            # 6. Recalcular conciliaciones afectadas
            for c_id, y, m in cuentas_afectadas:
                try:
                    self.conciliacion_repo.recalcular_sistema(c_id, y, m)
                except Exception as e:
                    print(f"Warning: Error recalculando conciliacion {c_id}-{y}-{m}: {e}")
            
            return count
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
