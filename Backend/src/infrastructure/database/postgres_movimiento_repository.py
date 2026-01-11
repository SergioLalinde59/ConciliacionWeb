from typing import List, Optional
from datetime import date
from decimal import Decimal
import psycopg2
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository

class PostgresMovimientoRepository(MovimientoRepository):
    """
    Adaptador de Base de Datos para Movimientos en PostgreSQL.
    """
    
    def __init__(self, connection):
        self.conn = connection

    def _get_ids_traslados(self) -> tuple[Optional[int], Optional[int]]:
        """Busca dinámicamente el ID de grupo y concepto para 'Traslados'"""
        cursor = self.conn.cursor()
        try:
            # 1. Buscar grupo en config_filtros_grupos (label 'Excluir Traslados')
            cursor.execute("SELECT grupo_id FROM config_filtros_grupos WHERE etiqueta ILIKE %s LIMIT 1", ('%traslado%',))
            row_grupo = cursor.fetchone()
            grupoid = row_grupo[0] if row_grupo else None
            
            if not grupoid:
                return None, None
                
            # 2. Buscar concepto 'Traslado' en ese grupo
            cursor.execute("SELECT conceptoid FROM conceptos WHERE grupoid_fk = %s AND concepto ILIKE %s LIMIT 1", (grupoid, '%traslado%'))
            row_concepto = cursor.fetchone()
            conceptoid = row_concepto[0] if row_concepto else None
            
            return grupoid, conceptoid
        finally:
            cursor.close()

    def _construir_filtros(self, 
                           fecha_inicio: Optional[date] = None, 
                           fecha_fin: Optional[date] = None,
                           cuenta_id: Optional[int] = None,
                           tercero_id: Optional[int] = None,
                           grupo_id: Optional[int] = None,
                           concepto_id: Optional[int] = None,
                           grupos_excluidos: Optional[List[int]] = None
    ) -> tuple[str, list]:
        """
        Construye la cláusula WHERE y los parámetros para los filtros comunes.
        Asume que la consulta base tiene JOINs con los alias:
        m (movimientos), g (grupos)
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
        if tercero_id:
            conditions.append("m.TerceroID = %s")
            params.append(tercero_id)
        if grupo_id:
            conditions.append("m.GrupoID = %s")
            params.append(grupo_id)
        if concepto_id:
            conditions.append("m.ConceptoID = %s")
            params.append(concepto_id)
             
        if grupos_excluidos and len(grupos_excluidos) > 0:
            conditions.append("(m.GrupoID IS NULL OR m.GrupoID NOT IN %s)")
            params.append(tuple(grupos_excluidos))
             
        if solo_pendientes:
            conditions.append("(m.TerceroID IS NULL OR m.GrupoID IS NULL OR m.ConceptoID IS NULL)")
            
        if tipo_movimiento:
            if tipo_movimiento == 'ingresos':
                conditions.append("m.Valor > 0")
            elif tipo_movimiento == 'egresos':
                conditions.append("m.Valor < 0")
        
        if not conditions:
            return "", []
            
        return " AND " + " AND ".join(conditions), params

    def _row_to_movimiento(self, row) -> Movimiento:
        """Helper para convertir fila de BD a objeto Movimiento"""
        # Orden esperado con JOINs: id, fecha, descripcion, referencia, valor, usd, trm, 
        # moneda_id, cuenta_id, tercero_id, grupo_id, concepto_id, created_at,
        # cuenta_nombre, moneda_nombre, tercero_nombre, grupo_nombre, concepto_nombre
        
        # Asegurar que valor no sea None
        valor = row[4] if row[4] is not None else Decimal('0')
        
        return Movimiento(
            id=row[0],
            fecha=row[1],
            descripcion=row[2] or "",
            referencia=row[3] if row[3] else "",
            valor=valor,
            usd=row[5] if row[5] is not None else None,
            trm=row[6] if row[6] is not None else None,
            moneda_id=row[7],
            cuenta_id=row[8],
            tercero_id=row[9] if row[9] is not None else None,
            grupo_id=row[10] if row[10] is not None else None,
            concepto_id=row[11] if row[11] is not None else None,
            created_at=row[12] if row[12] is not None else None,
            detalle=row[13] if row[13] else None, # New field
            cuenta_nombre=row[14] if len(row) > 14 and row[14] else None,
            moneda_nombre=row[15] if len(row) > 15 and row[15] else None,
            tercero_nombre=row[16] if len(row) > 16 and row[16] else None,
            grupo_nombre=row[17] if len(row) > 17 and row[17] else None,
            concepto_nombre=row[18] if len(row) > 18 and row[18] else None
        )

    def guardar(self, mov: Movimiento) -> Movimiento:
        cursor = self.conn.cursor()
        try:
            if mov.id:
                # Update
                query = """
                    UPDATE movimientos 
                    SET Fecha=%s, Descripcion=%s, Referencia=%s, Valor=%s, USD=%s, TRM=%s,
                        MonedaID=%s, CuentaID=%s, TerceroID=%s, GrupoID=%s, ConceptoID=%s, Detalle=%s
                    WHERE Id=%s
                """
                cursor.execute(query, (
                    mov.fecha, mov.descripcion, mov.referencia, mov.valor, mov.usd, mov.trm,
                    mov.moneda_id, mov.cuenta_id, mov.tercero_id, mov.grupo_id, mov.concepto_id, mov.detalle,
                    mov.id
                ))
            else:
                # Insert
                query = """
                    INSERT INTO movimientos (
                        Fecha, Descripcion, Referencia, Valor, USD, TRM,
                        MonedaID, CuentaID, TerceroID, GrupoID, ConceptoID, Detalle
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING Id, created_at
                """
                cursor.execute(query, (
                    mov.fecha, mov.descripcion, mov.referencia, mov.valor, mov.usd, mov.trm,
                    mov.moneda_id, mov.cuenta_id, mov.tercero_id, mov.grupo_id, mov.concepto_id, mov.detalle
                ))
                result = cursor.fetchone()
                mov.id = result[0]
                mov.created_at = result[1]
            
            self.conn.commit()
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
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE m.Id=%s
        """
        cursor.execute(query, (id,))
        row = cursor.fetchone()
        cursor.close()
        return self._row_to_movimiento(row) if row else None

    def obtener_todos(self) -> List[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        return [self._row_to_movimiento(row) for row in rows]

    def buscar_por_fecha(self, fecha_inicio: date, fecha_fin: date) -> List[Movimiento]:
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE m.Fecha BETWEEN %s AND %s
            ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
        """
        cursor.execute(query, (fecha_inicio, fecha_fin))
        rows = cursor.fetchall()
        cursor.close()
        return [self._row_to_movimiento(row) for row in rows]

    def buscar_pendientes_clasificacion(
        self, 
        terceros_pendientes: List[int] = None,
        grupos_pendientes: List[int] = None,
        conceptos_pendientes: List[int] = None
    ) -> List[Movimiento]:
        """
        Busca movimientos pendientes de clasificación.
        
        Un movimiento está pendiente si:
        - TerceroID, GrupoID o ConceptoID son NULL
        - O si tienen valores que semánticamente significan "pendiente" (ej: "Por identificar")
        
        Args:
            terceros_pendientes: IDs de terceros que significan "pendiente"
            grupos_pendientes: IDs de grupos que significan "pendiente"
            conceptos_pendientes: IDs de conceptos que significan "pendiente"
        """
        cursor = self.conn.cursor()
        
        # Construir condiciones dinámicas
        tercero_conditions = ["m.TerceroID IS NULL"]
        grupo_conditions = ["m.GrupoID IS NULL"]
        concepto_conditions = ["m.ConceptoID IS NULL"]
        params = []
        
        if terceros_pendientes and len(terceros_pendientes) > 0:
            tercero_conditions.append("m.TerceroID IN %s")
            params.append(tuple(terceros_pendientes))
        
        if grupos_pendientes and len(grupos_pendientes) > 0:
            grupo_conditions.append("m.GrupoID IN %s")
            params.append(tuple(grupos_pendientes))
            
        if conceptos_pendientes and len(conceptos_pendientes) > 0:
            concepto_conditions.append("m.ConceptoID IN %s")
            params.append(tuple(conceptos_pendientes))
        
        # Combinar condiciones: cualquier campo pendiente hace que el movimiento sea pendiente
        where_clause = f"""
            (({' OR '.join(tercero_conditions)})
            OR ({' OR '.join(grupo_conditions)})
            OR ({' OR '.join(concepto_conditions)}))
        """
        
        query = f"""
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE {where_clause}
            ORDER BY m.Fecha DESC, ABS(m.Valor) DESC
        """
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        return [self._row_to_movimiento(row) for row in rows]
    
    def buscar_por_referencia(self, referencia: str) -> List[Movimiento]:
        cursor = self.conn.cursor()
        # Normalizar la referencia removiendo ceros iniciales para comparación
        referencia_normalizada = referencia.lstrip('0') if referencia else referencia
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE LTRIM(m.Referencia, '0') = %s
            ORDER BY m.Fecha DESC
        """
        cursor.execute(query, (referencia_normalizada,))
        rows = cursor.fetchall()
        cursor.close()
        return [self._row_to_movimiento(row) for row in rows]

    def existe_movimiento(self, fecha: date, valor: Decimal, referencia: str, descripcion: str = None, usd: Decimal = None) -> bool:
        cursor = self.conn.cursor()
        if referencia and referencia.strip():
            # Si hay referencia unívoca, confiamos en ella (y valor/fecha por seguridad)
            # Nota: Si es USD, igual el valor podría ser 0 en BD, así que tendríamos cuidado.
            # Pero normalmente la referencia mata todo.
            query = "SELECT 1 FROM movimientos WHERE Referencia=%s AND Fecha=%s"
            # Si hay USD, validamos por USD, sino por Valor
            if usd is not None:
                query += " AND USD=%s"
                cursor.execute(query, (referencia, fecha, usd))
            else:
                 query += " AND Valor=%s"
                 cursor.execute(query, (referencia, fecha, valor))
        else:
            # Si no hay referencia, debemos ser más estrictos: validar también Descripción
            target_val = usd if usd is not None else valor
            col_val = "USD" if usd is not None else "Valor"
            
            if descripcion:
                # Usamos LOWER o ILIKE para que la comparación sea insensible a mayúsculas
                query = f"SELECT 1 FROM movimientos WHERE {col_val}=%s AND Fecha=%s AND LOWER(Descripcion) = LOWER(%s)"
                cursor.execute(query, (target_val, fecha, descripcion))
            else:
                # Fallback peligroso, pero necesario si no hay nada más
                # NOTA: Si usd es None (es COP) y pasamos valor, y en BD guardamos valor, todo bien.
                query = f"SELECT 1 FROM movimientos WHERE {col_val}=%s AND Fecha=%s"
                cursor.execute(query, (target_val, fecha))
            
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    def buscar_avanzado(self, 
                       fecha_inicio: Optional[date] = None, 
                       fecha_fin: Optional[date] = None,
                       cuenta_id: Optional[int] = None,
                       tercero_id: Optional[int] = None,
                       grupo_id: Optional[int] = None,
                       concepto_id: Optional[int] = None,
                       grupos_excluidos: Optional[List[int]] = None,
                       solo_pendientes: bool = False,
                       tipo_movimiento: Optional[str] = None,
                       skip: int = 0,
                       limit: Optional[int] = None
    ) -> tuple[List[Movimiento], int]:
        """
        Busca movimientos con filtros avanzados y paginación.
        
        Returns:
            tuple: (lista de movimientos, total de registros que cumplen los filtros)
        """
        cursor = self.conn.cursor()
        
        # Query base para los datos
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos,
            solo_pendientes=solo_pendientes,
            tipo_movimiento=tipo_movimiento
        )
        
        query += where_clause
        query += " ORDER BY m.Fecha DESC, ABS(m.Valor) DESC"
        
        # Obtener el total de registros (sin paginación)
        count_query = """
            SELECT COUNT(*)
            FROM movimientos m
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            WHERE 1=1
        """ + where_clause
        
        cursor.execute(count_query, tuple(params))
        total_count = cursor.fetchone()[0]
        
        # Aplicar paginación si se especifica limit
        if limit is not None:
            query += f" OFFSET {skip} LIMIT {limit}"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        
        movimientos = [self._row_to_movimiento(row) for row in rows]
        return movimientos, total_count

    def resumir_por_clasificacion(self, 
                                 tipo_agrupacion: str,
                                 fecha_inicio: Optional[date] = None, 
                                 fecha_fin: Optional[date] = None,
                                 cuenta_id: Optional[int] = None,
                                 tercero_id: Optional[int] = None,
                                 grupo_id: Optional[int] = None,
                                 concepto_id: Optional[int] = None,
                                 grupos_excluidos: Optional[List[int]] = None,
                                 tipo_movimiento: Optional[str] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Determinar campo de agrupación
        if tipo_agrupacion == 'grupo':
            group_field = "COALESCE(g.grupo, 'Sin Grupo')"
        elif tipo_agrupacion == 'tercero':
            group_field = "COALESCE(t.tercero, 'Sin Tercero')"
        elif tipo_agrupacion == 'concepto':
            group_field = "COALESCE(con.concepto, 'Sin Concepto')"
        else:
             raise ValueError("Tipo de agrupación debe ser 'grupo', 'tercero' o 'concepto'")

        query = f"""
            SELECT 
                {group_field} as nombre,
                SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as egresos,
                SUM(m.Valor) as saldo
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos,
            tipo_movimiento=tipo_movimiento
        )
        
        query += where_clause
        query += f" GROUP BY {group_field} ORDER BY SUM(m.Valor) ASC"
        
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
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE m.Descripcion ILIKE %s
              AND m.TerceroID IS NOT NULL
            ORDER BY m.Fecha DESC 
            LIMIT %s
        """
        cursor.execute(query, (patron, limite))
        rows = cursor.fetchall()
        cursor.close()
        return [self._row_to_movimiento(row) for row in rows]

    def actualizar_clasificacion_lote(self, patron: str, tercero_id: int, grupo_id: int, concepto_id: int) -> int:
        cursor = self.conn.cursor()
        try:
            # Seguridad: update solo donde hay campos vacíos para no sobrescribir trabajo manual previo
            query = """
                UPDATE movimientos
                SET TerceroID = %s, GrupoID = %s, ConceptoID = %s
                WHERE Descripcion ILIKE %s
                  AND (TerceroID IS NULL OR GrupoID IS NULL OR ConceptoID IS NULL)
            """
            # Usar %patron%
            like_pattern = f"%{patron}%"
            cursor.execute(query, (tercero_id, grupo_id, concepto_id, like_pattern))
            
            affected = cursor.rowcount
            self.conn.commit()
            return affected
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_datos_exportacion(self, limit: int = None, plain_format: bool = False) -> List[dict]:
        cursor = self.conn.cursor()
        
        if plain_format:
            query = """
                SELECT 
                    Id, Fecha, Descripcion, Referencia, Valor, USD, TRM,
                    MonedaID, CuentaID, TerceroID, GrupoID, ConceptoID, created_at
                FROM movimientos
                ORDER BY Fecha DESC, ABS(Valor) DESC
            """
        else:
            query = """
                SELECT 
                    m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM,
                    m.MonedaID, mon.moneda as Moneda,
                    m.CuentaID, c.cuenta as Cuenta,
                    m.TerceroID, t.tercero as Tercero,
                    m.GrupoID, g.grupo as Grupo,
                    m.ConceptoID, con.concepto as Concepto,
                    m.created_at, m.Detalle
                FROM movimientos m
                LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                LEFT JOIN terceros t ON m.TerceroID = t.terceroid
                LEFT JOIN grupos g ON m.GrupoID = g.grupoid
                LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
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
                                 grupo_id: Optional[int] = None,
                                 concepto_id: Optional[int] = None,
                                 grupos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        query = """
            SELECT 
                TO_CHAR(m.Fecha, 'YYYY-MM') as mes,
                SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as egresos,
                SUM(m.Valor) as saldo
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE 1=1
        """
        
        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos
        )
        
        query += where_clause
        query += " GROUP BY TO_CHAR(m.Fecha, 'YYYY-MM') ORDER BY mes ASC"
        
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
        
        query = """
            SELECT 
                m.TerceroID, t.tercero as TerceroNombre,
                COUNT(*) as Cantidad,
                SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as Ingresos,
                SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as Egresos,
                SUM(ABS(m.Valor)) as VolumenTotal
            FROM movimientos m
            JOIN terceros t ON m.TerceroID = t.terceroid
            WHERE 1=1
        """
        params = []
        
        # Exclude traslados dynamically
        grupoid_t, _ = self._get_ids_traslados()
        if grupoid_t:
            query += " AND (m.GrupoID IS NULL OR m.GrupoID != %s)"
            params.append(grupoid_t)
        
        if fecha_inicio:
            query += " AND m.Fecha >= %s"
            params.append(fecha_inicio)
        if fecha_fin:
            query += " AND m.Fecha <= %s"
            params.append(fecha_fin)

        query += """
            GROUP BY m.TerceroID, t.tercero
            HAVING SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) > 0
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
                "grupo_id": None, # Ya no agrupamos por esto
                "grupo_nombre": "Varios",
                "concepto_id": None, # Ya no agrupamos por esto
                "concepto_nombre": "Varios",
                "cantidad": row[2],
                "ingresos": float(row[3] or 0),
                "egresos": float(row[4] or 0),
                "volumen_total": float(row[5] or 0)
            }
            for row in rows
        ]

    def obtener_movimientos_grupo(self, tercero_id: int, grupo_id: Optional[int] = None, concepto_id: Optional[int] = None, fecha_inicio: Optional[date] = None, fecha_fin: Optional[date] = None) -> List[Movimiento]:
        """
        Obtiene los movimientos de un Tercero sugerido (ignora grupo/concepto específicos).
        """
        cursor = self.conn.cursor()
        query = """
            SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                   m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                   c.cuenta AS cuenta_nombre,
                   mon.moneda AS moneda_nombre,
                   t.tercero AS tercero_nombre,
                   g.grupo AS grupo_nombre,
                   con.concepto AS concepto_nombre
            FROM movimientos m
            LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
            LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
            LEFT JOIN terceros t ON m.TerceroID = t.terceroid
            LEFT JOIN grupos g ON m.GrupoID = g.grupoid
            LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
            WHERE m.TerceroID = %s
        """
        params = [tercero_id]
        
        grupoid_t, _ = self._get_ids_traslados()
        if grupoid_t:
            query += " AND (m.GrupoID IS NULL OR m.GrupoID != %s)"
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
        return [self._row_to_movimiento(row) for row in rows]

    def reclasificar_movimientos_grupo(self, tercero_id: int, grupo_id_anterior: Optional[int] = None, concepto_id_anterior: Optional[int] = None, fecha_inicio: Optional[date] = None, fecha_fin: Optional[date] = None, movimiento_ids: Optional[List[int]] = None) -> int:
        """
        Actualiza los movimientos de un Tercero para ser Traslado.
        Si se proporcionan movimiento_ids, solo actualiza esos.
        """
        cursor = self.conn.cursor()
        grupoid_t, conceptoid_t = self._get_ids_traslados()
        
        if not grupoid_t or not conceptoid_t:
            # Si no hay configuración, no podemos reclasificar dinámicamente
            # Podríamos lanzar error o usar fallback hardcoded (no recomendado por el usuario)
            raise ValueError("No se encontró la configuración del grupo/concepto de Traslados en la base de datos.")

        try:
            NEW_GRUPO_ID = grupoid_t
            NEW_CONCEPTO_ID = conceptoid_t
            
            query = """
                UPDATE movimientos
                SET GrupoID = %s, ConceptoID = %s
                WHERE TerceroID = %s 
                  AND (GrupoID IS NULL OR GrupoID != %s)
            """
            params = [NEW_GRUPO_ID, NEW_CONCEPTO_ID, tercero_id, NEW_GRUPO_ID] # Evitar updates redundantes
            
            if movimiento_ids is not None:
                # Si se especifican IDs (incluso vacio), usamos esos especificamente
                query += " AND Id = ANY(%s)"
                params.append(movimiento_ids)
            else:
                # Si no, usamos los filtros de fecha
                if fecha_inicio:
                    query += " AND Fecha >= %s"
                    params.append(fecha_inicio)
                if fecha_fin:
                    query += " AND Fecha <= %s"
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
                               grupo_id: Optional[int] = None,
                               concepto_id: Optional[int] = None,
                               grupos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        cursor = self.conn.cursor()
        
        # Mapping level to columns
        if nivel == 'tercero':
            col_id = "m.TerceroID"
            col_name = "t.tercero"
            join_clause = "LEFT JOIN terceros t ON m.TerceroID = t.terceroid"
            order_clause = "ORDER BY egresos DESC"
        elif nivel == 'grupo':
            col_id = "m.GrupoID"
            col_name = "g.grupo"
            join_clause = "LEFT JOIN grupos g ON m.GrupoID = g.grupoid"
            order_clause = "ORDER BY egresos ASC" # Requested: menor a mayor
        elif nivel == 'concepto':
            col_id = "m.ConceptoID"
            col_name = "con.concepto"
            join_clause = "LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid"
            order_clause = "ORDER BY egresos DESC"
        else:
            raise ValueError("Nivel inválido")

        query = f"""
            SELECT 
                {col_id} as id,
                COALESCE({col_name}, 'Sin Clasificar') as nombre,
                SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as egresos,
                SUM(m.Valor) as saldo
            FROM movimientos m
            {join_clause}
            WHERE 1=1
        """
        
        # SOLUCION: Agregar el JOIN con grupos siempre para poder filtrar por ID de grupo.
        joins_extra = ""
        if 'JOIN grupos' not in join_clause:
            joins_extra = " LEFT JOIN grupos g ON m.GrupoID = g.grupoid"
            
        query = f"""
            SELECT 
                {col_id} as id,
                COALESCE({col_name}, 'Sin Clasificar') as nombre,
                SUM(CASE WHEN m.Valor > 0 THEN m.Valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN m.Valor < 0 THEN ABS(m.Valor) ELSE 0 END) as egresos,
                SUM(m.Valor) as saldo
            FROM movimientos m
            {join_clause}
            {joins_extra}
            WHERE 1=1
        """

        where_clause, params = self._construir_filtros(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos
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
