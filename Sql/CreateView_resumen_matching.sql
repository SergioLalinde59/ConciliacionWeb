-- =====================================================
-- Vista Materializada: Resumen de Matching por Periodo
-- =====================================================
-- Opcional: Para mejorar performance en consultas frecuentes
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS vista_resumen_matching AS
SELECT 
    me.cuenta_id,
    me.year,
    me.month,
    COUNT(DISTINCT me.id) as total_extracto,
    COUNT(DISTINCT v.movimiento_sistema_id) as total_vinculados,
    COUNT(DISTINCT CASE WHEN v.estado = 'EXACTO' THEN v.id END) as total_exactos,
    COUNT(DISTINCT CASE WHEN v.estado = 'PROBABLE' THEN v.id END) as total_probables,
    COUNT(DISTINCT CASE WHEN v.estado = 'MANUAL' THEN v.id END) as total_manuales,
    COUNT(DISTINCT CASE WHEN v.estado = 'TRASLADO' THEN v.id END) as total_traslados,
    COUNT(DISTINCT CASE WHEN v.estado = 'SIN_MATCH' THEN v.id END) as total_sin_match,
    COUNT(DISTINCT CASE WHEN v.estado = 'IGNORADO' THEN v.id END) as total_ignorados,
    AVG(v.score_similitud) as score_promedio,
    MAX(v.created_at) as ultima_actualizacion
FROM movimientos_extracto me
LEFT JOIN movimiento_vinculaciones v ON me.id = v.movimiento_extracto_id
GROUP BY me.cuenta_id, me.year, me.month;

-- Índice en la vista materializada
CREATE UNIQUE INDEX idx_resumen_matching_periodo 
    ON vista_resumen_matching(cuenta_id, year, month);

-- Comentario
COMMENT ON MATERIALIZED VIEW vista_resumen_matching IS 'Resumen de estadísticas de matching por periodo para consultas rápidas';

-- Para refrescar la vista (ejecutar después de cambios en vinculaciones):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY vista_resumen_matching;
