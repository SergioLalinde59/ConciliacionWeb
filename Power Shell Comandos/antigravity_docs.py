import os
import sys
import shutil
from datetime import datetime
from pathlib import Path

# Configurar codificación UTF-8 para Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stdin = codecs.getreader("utf-8")(sys.stdin.detach())

def listar_archivos_abiertos(directorio_base=None, conversacion_id=None):
    """
    Busca archivos .md en el directorio brain de Antigravity
    que corresponden a la conversación actual o a una específica
    """
    archivos_encontrados = []
    
    # Usar directamente F:\.gemini\antigravity\brain
    brain_dir = Path("F:/.gemini/antigravity/brain")
    
    if not brain_dir.exists():
        print(f"\n[!] No se encontro el directorio brain en: {brain_dir}")
        return []
    
    # Si se especifica un ID de conversación, buscar solo en ese directorio
    if conversacion_id:
        conv_dir = brain_dir / conversacion_id
        if conv_dir.exists() and conv_dir.is_dir():
            # Buscar todos los archivos .md en el directorio
            for archivo_path in conv_dir.glob("*.md"):
                if archivo_path.is_file():
                    archivos_encontrados.append(archivo_path)
    else:
        # Buscar en todas las conversaciones (solo archivos comunes conocidos)
        archivos_comunes = [
            "task.md",
            "walkthrough.md", 
            "implementation_plan.md"
        ]
        for conv_dir in brain_dir.iterdir():
            if conv_dir.is_dir():
                for archivo in archivos_comunes:
                    archivo_path = conv_dir / archivo
                    if archivo_path.exists():
                        archivos_encontrados.append(archivo_path)
    
    return archivos_encontrados

def mostrar_menu_seleccion(archivos):
    """Muestra un menú interactivo para seleccionar archivos"""
    if not archivos:
        print("\n[!] No se encontraron archivos de documentación abiertos.")
        return []
    
    print("\n" + "="*60)
    print("ARCHIVOS DISPONIBLES PARA COPIAR")
    print("="*60)
    
    for i, archivo in enumerate(archivos, 1):
        nombre = archivo.name
        tamaño = archivo.stat().st_size / 1024  # KB
        print(f"  [{i}] {nombre:<40} ({tamaño:.1f} KB)")
    
    print("="*60)
    print("\n[*] Ingresa los numeros separados por comas (ej: 1,2,3)")
    print("    O presiona ENTER para copiar todos\n")
    
    seleccion = input("Tu seleccion: ").strip()
    
    if not seleccion:
        return archivos
    
    try:
        indices = [int(x.strip()) - 1 for x in seleccion.split(",")]
        return [archivos[i] for i in indices if 0 <= i < len(archivos)]
    except (ValueError, IndexError):
        print("\n[X] Seleccion invalida. No se copiara ningun archivo.")
        return []

def crear_directorio_conversacion(nombre_conversacion=None):
    """Crea el directorio de destino para la conversación"""
    base_dir = Path("Documentos/Conversaciones")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    # Obtener fecha actual en formato yyyy-mm-dd
    fecha_actual = datetime.now().strftime("%Y-%m-%d")
    
    if nombre_conversacion:
        # Agregar prefijo de fecha si no lo tiene ya
        if not nombre_conversacion.startswith(fecha_actual):
            nombre_final = f"{fecha_actual} {nombre_conversacion}"
        else:
            nombre_final = nombre_conversacion
        conv_dir = base_dir / nombre_final
    else:
        # Si no se proporciona nombre, usar timestamp completo
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        conv_dir = base_dir / f"Conversacion_{timestamp}"
    
    conv_dir.mkdir(exist_ok=True)
    return conv_dir

def copiar_archivos(archivos_seleccionados, directorio_destino):
    """Copia los archivos seleccionados al directorio de destino"""
    if not archivos_seleccionados:
        print("\n[!] No hay archivos para copiar.")
        return
    
    print(f"\n[*] Copiando archivos a: {directorio_destino}")
    print("-" * 60)
    
    for archivo in archivos_seleccionados:
        destino = directorio_destino / archivo.name
        shutil.copy2(archivo, destino)
        print(f"  [OK] {archivo.name}")
    
    print("-" * 60)
    print(f"\n[OK] {len(archivos_seleccionados)} archivo(s) copiado(s) exitosamente!")
    print(f"[*] Ubicacion: {directorio_destino.absolute()}\n")

def main():
    print("\n" + "="*60)
    print("ANTIGRAVITY - GESTOR DE DOCUMENTACION")
    print("="*60)
    
    # Verificar si se pasó un ID de conversación como argumento
    conversacion_id = None
    if len(sys.argv) > 1:
        conversacion_id = sys.argv[1]
        print(f"\n[*] Buscando archivos de la conversacion: {conversacion_id}")
    
    # Solicitar nombre de la conversación
    print("\n[?] Ingresa el nombre para esta conversacion:")
    print("    (Presiona ENTER para usar timestamp automatico)\n")
    nombre_conv = input("Nombre: ").strip()
    
    # Buscar archivos abiertos
    archivos_disponibles = listar_archivos_abiertos(conversacion_id=conversacion_id)
    
    # Mostrar menú y obtener selección
    archivos_seleccionados = mostrar_menu_seleccion(archivos_disponibles)
    
    if not archivos_seleccionados:
        return
    
    # Crear directorio de destino
    directorio_destino = crear_directorio_conversacion(nombre_conv if nombre_conv else None)
    
    # Copiar archivos
    copiar_archivos(archivos_seleccionados, directorio_destino)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] Operacion cancelada por el usuario.\n")
    except Exception as e:
        print(f"\n[X] Error: {e}\n")
