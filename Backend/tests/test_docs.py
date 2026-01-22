"""Script de prueba para antigravity_docs.py"""
import subprocess
import sys

# ID de la conversación de Fase 1 y 2
conversacion_id = "3e2b0708-3c8a-46e5-b5b2-9bbb55b79dfc"
nombre_conversacion = "Fase 1 y 2 - Matching Inteligente"
seleccion = ""  # ENTER para copiar todos

# Preparar el input
input_data = f"{nombre_conversacion}\n{seleccion}\n"

# Ejecutar el script
process = subprocess.Popen(
    [sys.executable, "antigravity_docs.py", conversacion_id],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Enviar el input y capturar la salida
stdout, stderr = process.communicate(input=input_data)

print(stdout)
if stderr:
    print(f"\nErrores:\n{stderr}")
