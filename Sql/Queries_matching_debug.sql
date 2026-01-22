-- =====================================================
-- Consultas Útiles para Debugging y Análisis
-- =====================================================

-- 1. Ver configuración actual de matching
SELECT 
    tolerancia_valor,
    similitud_descripcion_minima,
    score_minimo_exacto,
    score_minimo_probable,
    palabras_clave_traslado
FROM configuracion_matching
WHERE activo = TRUE;

-- 2. Estadísticas de matching por periodo
SELECT 
    c.nombre as cuenta,
    me.year,
    me.month,
    COUNT(DISTINCT me.id) as total_extracto,
    COUNT(DISTINCT v.id) as total_vinculados,
    COUNT(DISTINCT CASE WHEN v.estado = 'EXACTO' THEN v.id END) as exactos,
    COUNT(DISTINCT CASE WHEN v.estado = 'PROBABLE' THEN v.id END) as probables,
    COUNT(DISTINCT CASE WHEN v.estado = 'SIN_MATCH' THEN v.id END) as sin_match,
    ROUND(AVG(v.score_similitud)::numeric, 2) as score_promedio
FROM movimientos_extracto me
LEFT JOIN movimiento_vinculaciones v ON me.id = v.movimiento_extracto_id
LEFT JOIN cuentas c ON me.cuenta_id = c.cuentaid
WHERE me.year = 2025 AND me.month = 12
GROUP BY c.nombre, me.year, me.month
ORDER BY c.nombre;

-- 3. Ver movimientos del extracto sin match
SELECT 
    me.fecha,
    me.descripcion,
    me.valor,
    v.estado
FROM movimientos_extracto me
LEFT JOIN movimiento_vinculaciones v ON me.id = v.movimiento_extracto_id
WHERE me.cuenta_id = 1 
  AND me.year = 2025 
  AND me.month = 12
  AND (v.estado = 'SIN_MATCH' OR v.id IS NULL)
ORDER BY me.fecha DESC;

-- 4. Ver matches probables que requieren revisión
SELECT 
    me.fecha,
    me.descripcion as desc_extracto,
    me.valor as valor_extracto,
    m.descripcion as desc_sistema,
    m.valor as valor_sistema,
    v.score_similitud,
    v.confirmado_por_usuario
FROM movimiento_vinculaciones v
JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
JOIN movimientos m ON v.movimiento_sistema_id = m.id
WHERE v.estado = 'PROBABLE'
  AND v.confirmado_por_usuario = FALSE
  AND me.cuenta_id = 1
  AND me.year = 2025
  AND me.month = 12
ORDER BY v.score_similitud DESC;

-- 5. Detectar posibles traslados sin vincular
SELECT 
    me.fecha,
    me.descripcion,
    me.valor,
    c.nombre as cuenta
FROM movimientos_extracto me
JOIN cuentas c ON me.cuenta_id = c.cuentaid
LEFT JOIN movimiento_vinculaciones v ON me.id = v.movimiento_extracto_id
WHERE (
    UPPER(me.descripcion) LIKE '%TRANSFERENCIA%' OR
    UPPER(me.descripcion) LIKE '%TRASLADO%' OR
    UPPER(me.descripcion) LIKE '%CTA%VIRTUAL%'
)
AND (v.estado IS NULL OR v.estado != 'TRASLADO')
AND me.year = 2025
AND me.month = 12
ORDER BY me.fecha, me.valor;

-- 6. Auditoría: Ver historial de vinculaciones manuales
SELECT 
    v.created_at,
    c.nombre as cuenta,
    me.fecha,
    me.descripcion as extracto,
    m.descripcion as sistema,
    v.estado,
    v.score_similitud,
    v.created_by,
    v.notas
FROM movimiento_vinculaciones v
JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
JOIN movimientos m ON v.movimiento_sistema_id = m.id
JOIN cuentas c ON me.cuenta_id = c.cuentaid
WHERE v.estado = 'MANUAL'
ORDER BY v.created_at DESC
LIMIT 50;

-- 7. Encontrar discrepancias en scores (debugging)
SELECT 
    v.id,
    me.descripcion as extracto,
    m.descripcion as sistema,
    v.score_fecha,
    v.score_valor,
    v.score_descripcion,
    v.score_similitud,
    (v.score_fecha * 0.4 + v.score_valor * 0.4 + v.score_descripcion * 0.2) as score_calculado
FROM movimiento_vinculaciones v
JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
LEFT JOIN movimientos m ON v.movimiento_sistema_id = m.id
WHERE ABS(v.score_similitud - (v.score_fecha * 0.4 + v.score_valor * 0.4 + v.score_descripcion * 0.2)) > 0.01
LIMIT 20;

-- 8. Performance: Movimientos más difíciles de matchear
SELECT 
    me.descripcion,
    COUNT(*) as veces_aparece,
    AVG(v.score_similitud) as score_promedio,
    COUNT(CASE WHEN v.estado = 'SIN_MATCH' THEN 1 END) as veces_sin_match
FROM movimientos_extracto me
LEFT JOIN movimiento_vinculaciones v ON me.id = v.movimiento_extracto_id
GROUP BY me.descripcion
HAVING COUNT(*) > 1
ORDER BY veces_sin_match DESC, score_promedio ASC
LIMIT 20;
