-- =====================================================
-- Tabla de Vinculaciones de Movimientos
-- =====================================================
-- Almacena las relaciones entre movimientos del extracto
-- y movimientos del sistema para auditoría y trazabilidad
-- =====================================================

CREATE TABLE movimiento_vinculaciones (
    id SERIAL PRIMARY KEY,
    
    -- Relaciones
    movimiento_extracto_id INTEGER NOT NULL REFERENCES movimientos_extracto(id) ON DELETE CASCADE,
    movimiento_sistema_id INTEGER REFERENCES movimientos(id) ON DELETE SET NULL,  -- Puede ser NULL si es SIN_MATCH
    
    -- Estado del Match
    estado VARCHAR(20) NOT NULL CHECK (estado IN (
        'EXACTO',           -- Match perfecto automático
        'PROBABLE',         -- Match sugerido por algoritmo
        'MANUAL',           -- Vinculado manualmente por usuario
        'TRASLADO',         -- Detectado como traslado entre cuentas
        'SIN_MATCH',        -- Sin coincidencia encontrada
        'IGNORADO'          -- Usuario marcó como no relevante
    )),
    
    -- Scoring del Algoritmo
    score_similitud NUMERIC(3, 2),  -- 0.00 a 1.00
    score_fecha NUMERIC(3, 2),
    score_valor NUMERIC(3, 2),
    score_descripcion NUMERIC(3, 2),
    
    -- Información de Traslados
    es_traslado BOOLEAN DEFAULT FALSE,
    cuenta_contraparte_id INTEGER REFERENCES cuentas(cuentaid),  -- Si es traslado, a qué cuenta
    vinculacion_contraparte_id INTEGER REFERENCES movimiento_vinculaciones(id),  -- El otro lado del traslado
    
    -- Confirmación del Usuario
    confirmado_por_usuario BOOLEAN DEFAULT FALSE,
    fecha_confirmacion TIMESTAMP,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),  -- Usuario que creó/confirmó
    notas TEXT,  -- Notas del usuario sobre la vinculación
    
    -- Constraint: Si es SIN_MATCH o IGNORADO, no debe tener movimiento_sistema_id
    CONSTRAINT check_sin_match_sin_sistema CHECK (
        (estado IN ('SIN_MATCH', 'IGNORADO') AND movimiento_sistema_id IS NULL) OR
        (estado NOT IN ('SIN_MATCH', 'IGNORADO'))
    ),
    
    -- Constraint: Si es TRASLADO, debe tener cuenta_contraparte_id
    CONSTRAINT check_traslado_tiene_contraparte CHECK (
        (es_traslado = TRUE AND cuenta_contraparte_id IS NOT NULL) OR
        (es_traslado = FALSE)
    )
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_vinculaciones_extracto 
    ON movimiento_vinculaciones(movimiento_extracto_id);

CREATE INDEX idx_vinculaciones_sistema 
    ON movimiento_vinculaciones(movimiento_sistema_id) 
    WHERE movimiento_sistema_id IS NOT NULL;

CREATE INDEX idx_vinculaciones_estado 
    ON movimiento_vinculaciones(estado);

CREATE INDEX idx_vinculaciones_traslado 
    ON movimiento_vinculaciones(es_traslado, cuenta_contraparte_id) 
    WHERE es_traslado = TRUE;

-- Índice único: Un movimiento del extracto solo puede tener una vinculación activa
CREATE UNIQUE INDEX idx_vinculaciones_extracto_unico 
    ON movimiento_vinculaciones(movimiento_extracto_id);

-- Comentarios
COMMENT ON TABLE movimiento_vinculaciones IS 'Vinculaciones entre movimientos del extracto y sistema para conciliación';
COMMENT ON COLUMN movimiento_vinculaciones.estado IS 'Estado del matching: EXACTO, PROBABLE, MANUAL, TRASLADO, SIN_MATCH, IGNORADO';
COMMENT ON COLUMN movimiento_vinculaciones.score_similitud IS 'Score total de similitud calculado por el algoritmo (0.00 a 1.00)';
COMMENT ON COLUMN movimiento_vinculaciones.es_traslado IS 'Indica si el movimiento es un traslado entre cuentas propias';
COMMENT ON COLUMN movimiento_vinculaciones.confirmado_por_usuario IS 'Indica si el usuario confirmó/revisó esta vinculación';
COMMENT ON COLUMN movimiento_vinculaciones.vinculacion_contraparte_id IS 'ID de la vinculación del otro lado del traslado';

-- Trigger para actualizar updated_at en configuracion_matching
CREATE OR REPLACE FUNCTION update_configuracion_matching_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracion_matching_timestamp
    BEFORE UPDATE ON configuracion_matching
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracion_matching_timestamp();
