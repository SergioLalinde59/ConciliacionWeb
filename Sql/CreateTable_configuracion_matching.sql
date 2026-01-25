-- =====================================================
-- Tabla de Configuración de Matching
-- =====================================================
-- Almacena parámetros configurables para el algoritmo
-- de matching entre movimientos del extracto y sistema
-- =====================================================

CREATE TABLE configuracion_matching (
    id SERIAL PRIMARY KEY,
    
    -- Parámetros de Tolerancia
    tolerancia_valor NUMERIC(16, 2) NOT NULL DEFAULT 100.00,  -- Tolerancia en pesos para considerar valores "iguales"
    similitud_descripcion_minima NUMERIC(3, 2) NOT NULL DEFAULT 0.75,  -- 0.75 = 75%
    
    -- Pesos para Scoring (deben sumar 1.00)
    peso_fecha NUMERIC(3, 2) NOT NULL DEFAULT 0.40,  -- 40%
    peso_valor NUMERIC(3, 2) NOT NULL DEFAULT 0.40,  -- 40%
    peso_descripcion NUMERIC(3, 2) NOT NULL DEFAULT 0.20,  -- 20%
    
    -- Umbral para Auto-vinculación
    score_minimo_exacto NUMERIC(3, 2) NOT NULL DEFAULT 0.95,  -- 95% para considerar EXACTO
    score_minimo_probable NUMERIC(3, 2) NOT NULL DEFAULT 0.70,  -- 70% para considerar PROBABLE
    
    -- Configuración de Traslados
    palabras_clave_traslado TEXT[] DEFAULT ARRAY[
        'TRANSFERENCIA', 
        'TRASLADO', 
        'CTA', 
        'VIRTUAL', 
        'FONDO',
        'INVERSION'
    ],
    
    -- Metadata
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Solo puede haber una configuración activa
    CONSTRAINT check_pesos_suman_uno CHECK (
        peso_fecha + peso_valor + peso_descripcion = 1.00
    ),
    CONSTRAINT check_scores_validos CHECK (
        score_minimo_exacto >= score_minimo_probable AND
        score_minimo_exacto <= 1.00 AND
        score_minimo_probable >= 0.00
    )
);

-- Índice para búsqueda rápida de configuración activa
CREATE INDEX idx_configuracion_matching_activo 
    ON configuracion_matching(activo) 
    WHERE activo = TRUE;

-- Comentarios
COMMENT ON TABLE configuracion_matching IS 'Parámetros configurables para el algoritmo de matching de conciliación';
COMMENT ON COLUMN configuracion_matching.tolerancia_valor IS 'Margen de error aceptable en pesos para considerar valores iguales';
COMMENT ON COLUMN configuracion_matching.similitud_descripcion_minima IS 'Porcentaje mínimo de similitud en descripción (0.00 a 1.00)';
COMMENT ON COLUMN configuracion_matching.score_minimo_exacto IS 'Score mínimo para considerar un match como OK';
COMMENT ON COLUMN configuracion_matching.score_minimo_probable IS 'Score mínimo para considerar un match como PROBABLE';

-- Insertar configuración inicial
INSERT INTO configuracion_matching (
    tolerancia_valor,
    similitud_descripcion_minima,
    peso_fecha,
    peso_valor,
    peso_descripcion,
    score_minimo_exacto,
    score_minimo_probable,
    palabras_clave_traslado
) VALUES (
    100.00,  -- Tolerancia de $100 COP
    0.75,    -- 75% similitud mínima
    0.40,    -- 40% peso fecha
    0.40,    -- 40% peso valor
    0.20,    -- 20% peso descripción
    0.95,    -- 95% para EXACTO
    0.70,    -- 70% para PROBABLE
    ARRAY['TRANSFERENCIA', 'TRASLADO', 'CTA', 'VIRTUAL', 'FONDO', 'INVERSION']
);
