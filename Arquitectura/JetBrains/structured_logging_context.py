# Logs estructurados con contexto
logger.info("movimiento_creado", extra={
    "movimiento_id": mov_id,
    "cuenta_id": cuenta_id,
    "monto": monto,
    "usuario": user_id
})
