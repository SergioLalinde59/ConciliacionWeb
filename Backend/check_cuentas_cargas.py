import asyncio
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.postgres_cuenta_repository import PostgresCuentaRepository

async def check_cuentas():
    # Consume generator to get connection
    gen = get_db_connection()
    conn = next(gen)
    try:
        repo = PostgresCuentaRepository(conn)
        cuentas = repo.obtener_todos()
        print(f"Total cuentas: {len(cuentas)}")
        print("-" * 60)
        print(f"{'ID':<10} | {'Nombre':<30} | {'Carga':<10} | {'Conciliar':<10}")
        print("-" * 60)
        for c in cuentas:
            print(f"{c.cuentaid:<10} | {c.cuenta:<30} | {str(c.permite_carga):<10} | {str(c.permite_conciliar):<10}")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(check_cuentas())
