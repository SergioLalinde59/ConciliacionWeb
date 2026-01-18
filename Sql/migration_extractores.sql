-- Create table
CREATE TABLE IF NOT EXISTS cuenta_extractores (
    id SERIAL PRIMARY KEY,
    cuenta_id INTEGER REFERENCES cuentas(cuentaid),
    tipo VARCHAR(20) CHECK (tipo IN ('MOVIMIENTOS', 'RESUMEN')),
    modulo VARCHAR(100) NOT NULL,
    orden INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cuenta_extractores_cuenta_tipo ON cuenta_extractores(cuenta_id, tipo);

-- Data Population
-- Clear existing to avoid dupes (idempotency)
TRUNCATE TABLE cuenta_extractores RESTART IDENTITY;

-- Ahorros (ID 1)
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (1, 'MOVIMIENTOS', 'ahorros_extracto_movimientos', 1);
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (1, 'RESUMEN', 'ahorros_extracto', 1);

-- FondoRenta (ID 3)
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (3, 'MOVIMIENTOS', 'fondorenta_extracto_movimientos', 1);
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (3, 'RESUMEN', 'fondorenta_extracto', 1);

-- MasterCardPesos (ID 6)
-- New Format (Priority 1)
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (6, 'MOVIMIENTOS', 'mastercard_pesos_extracto_movimientos', 1);
-- Resumen
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (6, 'RESUMEN', 'mastercard_pesos_extracto', 1);
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (6, 'RESUMEN', 'mastercard_pesos_extracto_anterior', 2);

-- MasterCardUSD (ID 7)
-- New Format
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (7, 'MOVIMIENTOS', 'mastercard_usd_extracto_movimientos', 1);
-- Resumen
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (7, 'RESUMEN', 'mastercard_usd_extracto', 1);
INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden) VALUES (7, 'RESUMEN', 'mastercard_usd_extracto_anterior', 2);
