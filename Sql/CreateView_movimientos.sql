-- Vista para compatibilidad con código legado que busca la tabla 'movimientos'
-- Mapea 1-a-1 con movimientos_encabezado para preservar la cardinalidad en los joins
CREATE OR REPLACE VIEW movimientos AS
SELECT 
    Id,
    Fecha,
    Descripcion,
    Referencia,
    Valor,
    USD,
    TRM,
    MonedaID,
    CuentaID,
    created_at,
    Detalle
FROM movimientos_encabezado;
