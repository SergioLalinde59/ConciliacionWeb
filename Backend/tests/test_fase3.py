"""Script para copiar archivos de Fase 3"""
import subprocess
import sys

# ID de la conversación de Fase 3 (API Endpoints)
conversacion_id = "99aad868-d1df-4450-ba05-c7d2255004aa"
nombre_conversacion = "Fase 3 - API Endpoints"
seleccion = ""  # ENTER para copiar todos

# Preparar el input
input_data = f"{nombre_conversacion}\n{seleccion}\n"

# Ejecutar el script
process = subprocess.Popen(
    [sys.executable, "antigravity_docs.py", conversacion_id],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding='utf-8'
)

# Enviar el input y capturar la salida
stdout, stderr = process.communicate(input=input_data)

print(stdout)
if stderr:
    print(f"\nErrores:\n{stderr}")
