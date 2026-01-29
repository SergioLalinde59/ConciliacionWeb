
import os
import psycopg2
from typing import List, Optional
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

# --- MOCK DOMAIN MODELS ---
@dataclass
class MovimientoDetalle:
    valor: Decimal
    centro_costo_id: Optional[int]
    concepto_id: Optional[int]
    tercero_id: Optional[int]
    id: Optional[int] = None
    movimiento_id: Optional[int] = None
    created_at: Optional[datetime] = None
    centro_costo_nombre: Optional[str] = None
    concepto_nombre: Optional[str] = None
    tercero_nombre: Optional[str] = None

@dataclass
class Movimiento:
    moneda_id: int
    cuenta_id: int
    fecha: date
    valor: Decimal
    descripcion: str
    id: Optional[int] = None
    tercero_id: Optional[int] = None
    referencia: str = ""
    usd: Optional[Decimal] = None
    trm: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    detalle: Optional[str] = None
    detalles: List[MovimientoDetalle] = field(default_factory=list)
    cuenta_nombre: Optional[str] = None
    moneda_nombre: Optional[str] = None
    _tercero_nombre: Optional[str] = None

    @property
    def centro_costo_id(self) -> Optional[int]:
        return self.detalles[0].centro_costo_id if self.detalles else None
    
    @property
    def centro_costo_nombre(self) -> Optional[str]:
        return self.detalles[0].centro_costo_nombre if self.detalles else None

# --- REPO LOGIC EXTRACT ---
def _row_to_movimiento(row) -> Movimiento:
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
    
    mov = Movimiento(
        id=_id, fecha=fecha, descripcion=desc, referencia=ref, valor=valor,
        usd=usd, trm=trm, moneda_id=moneda_id, cuenta_id=cuenta_id,
        created_at=created_at, detalle=detalle_texto, tercero_id=tercero_id,
        cuenta_nombre=cuenta_nombre, moneda_nombre=moneda_nombre, _tercero_nombre=tercero_nombre
    )
    return mov

def _cargar_detalles_para_movimientos(conn, movimientos: List[Movimiento]):
    if not movimientos: return
    ids = [m.id for m in movimientos if m.id]
    if not ids: return

    cursor = conn.cursor()
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

    detalles_map = {}
    for row in rows:
        mov_id = row[1]
        detalle = MovimientoDetalle(
            id=row[0], movimiento_id=mov_id, centro_costo_id=row[2], concepto_id=row[3], tercero_id=row[4],
            valor=row[5], created_at=row[6], centro_costo_nombre=row[7], concepto_nombre=row[8], tercero_nombre=row[9]
        )
        if mov_id not in detalles_map:
            detalles_map[mov_id] = []
        detalles_map[mov_id].append(detalle)

    for mov in movimientos:
        if mov.id in detalles_map:
            mov.detalles = detalles_map[mov.id]

def test_fetch_2232():
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")

    conn = psycopg2.connect(host=host, database=dbname, user=user, password=password, port=port)
    cursor = conn.cursor()
    
    print("Fetching 2232 with Repo Logic...")
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
        WHERE m.Id = 2232
    """
    cursor.execute(query)
    row = cursor.fetchone()
    cursor.close()
    
    mov = _row_to_movimiento(row)
    _cargar_detalles_para_movimientos(conn, [mov])
    
    print("\n--- RESULT ---")
    print(f"Movimiento ID: {mov.id}")
    print(f"Encabezado TerceroID: {mov.tercero_id}")
    print(f"Encabezado Tercero Nombre: {mov._tercero_nombre}")
    
    print(f"Detalles Count: {len(mov.detalles)}")
    if mov.detalles:
        d = mov.detalles[0]
        print(f"Detalle 0 CC ID: {d.centro_costo_id}")
        print(f"Detalle 0 CC Name: {d.centro_costo_nombre}")
        print(f"Detalle 0 Tercero ID: {d.tercero_id}")
    
    print(f"Property Centro Cosoto ID: {mov.centro_costo_id}")
    print(f"Property Centro Cosoto Name: {mov.centro_costo_nombre}")
    
    conn.close()

if __name__ == "__main__":
    test_fetch_2232()
