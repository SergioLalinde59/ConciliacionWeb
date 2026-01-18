CREATE TABLE movimientos_extracto (
    id SERIAL PRIMARY KEY,
    
    -- Relación con cuenta (viene del parámetro al cargar el extracto)
    cuenta_id INTEGER NOT NULL REFERENCES cuentas(cuentaid),
    
    -- Periodo de conciliación
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Datos del movimiento del extracto
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    referencia VARCHAR(255),
    valor NUMERIC(16, 2) NOT NULL,  -- Positivo=entrada, Negativo=salida
    
    -- Metadata de origen
    numero_linea INTEGER,        -- Línea en el extracto PDF
    raw_text TEXT,               -- Texto original del PDF (para debugging)
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint de FK a conciliaciones
    CONSTRAINT fk_conciliacion 
        FOREIGN KEY (cuenta_id, year, month) 
        REFERENCES conciliaciones(cuenta_id, year, month)
        ON DELETE CASCADE
);
-- Índices para performance
CREATE INDEX idx_mov_extracto_cuenta_periodo 
    ON movimientos_extracto(cuenta_id, year, month);
    
CREATE INDEX idx_mov_extracto_fecha 
    ON movimientos_extracto(fecha);
    
CREATE INDEX idx_mov_extracto_valor 
    ON movimientos_extracto(valor);
    
CREATE INDEX idx_mov_extracto_referencia 
    ON movimientos_extracto(referencia) 
    WHERE referencia IS NOT NULL;
-- Comentarios para documentación
COMMENT ON TABLE movimientos_extracto IS 'Movimientos individuales extraídos de PDFs de extractos bancarios';
COMMENT ON COLUMN movimientos_extracto.cuenta_id IS 'ID de cuenta - viene del parámetro al cargar extracto en frontend';
COMMENT ON COLUMN movimientos_extracto.year IS 'Año del periodo - extraído del PDF';
COMMENT ON COLUMN movimientos_extracto.month IS 'Mes del periodo - extraído del PDF';
COMMENT ON COLUMN movimientos_extracto.numero_linea IS 'Número de línea en el extracto PDF (para ordenamiento)';
COMMENT ON COLUMN movimientos_extracto.raw_text IS 'Texto original de la línea en el PDF (para debugging)';