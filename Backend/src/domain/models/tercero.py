from dataclasses import dataclass
from typing import Optional

@dataclass
class Tercero:
    """
    Entidad de Dominio que representa a un Tercero (antes Contacto).
    En arquitectura hexagonal, este objeto NO sabe de SQL, ni de Tkinter.
    Es puro Python.
    
    Nota: Después de la normalización 3NF, los campos 'descripcion' y 'referencia'
    ahora residen en la tabla tercero_descripciones.
    """
    terceroid: Optional[int]  # Puede ser None si aún no se ha guardado en BD
    tercero: str
    activa: bool = True

    def __post_init__(self):
        """Validaciones de lógica de negocio al instanciar"""
        if not self.tercero:
            raise ValueError("El campo 'tercero' es obligatorio.")
