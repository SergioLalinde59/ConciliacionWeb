import sys
import os
import json
from dataclasses import asdict

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import domain model
from src.domain.models.grupo import Grupo

# Import Pydantic models
from src.infrastructure.api.routers.grupos import GrupoResponse, GrupoDTO

def verify():
    print("Verifying Backend Changes...")
    
    # 1. Verify Domain Model
    g = Grupo(grupoid=1, grupo="Test")
    print(f"Domain Model: {g}")
    if hasattr(g, 'es_traslado'):
        print("FAIL: Domain model still has 'es_traslado'")
        sys.exit(1)
    else:
        print("PASS: Domain model clean")

    # 2. Verify Pydantic Response Model
    schema = GrupoResponse.model_json_schema()
    props = schema.get('properties', {})
    if 'es_traslado' in props:
        print("FAIL: GrupoResponse schema still has 'es_traslado'")
        sys.exit(1)
    else:
        print("PASS: GrupoResponse schema clean")

    # 3. Verify Pydantic DTO
    dto_schema = GrupoDTO.model_json_schema()
    dto_props = dto_schema.get('properties', {})
    if 'es_traslado' in dto_props:
        print("FAIL: GrupoDTO schema still has 'es_traslado'")
        sys.exit(1)
    else:
        print("PASS: GrupoDTO schema clean")

    print("\nSUCCESS: All checks passed.")

if __name__ == "__main__":
    verify()
