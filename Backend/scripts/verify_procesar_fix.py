import unittest
from unittest.mock import MagicMock
from datetime import date
from decimal import Decimal
import sys
import os

# Add BackEnd to path
sys.path.append(os.path.abspath("f:/1. Cloud/4. AI/1. Antigravity/ConciliacionWeb/BackEnd"))

from src.application.services.cargar_movimientos_service import CargarMovimientosService
from src.domain.models.movimiento import Movimiento

class TestProcesarArchivo(unittest.TestCase):
    def setUp(self):
        self.mock_repo = MagicMock()
        self.mock_moneda_repo = MagicMock()
        # Mock existe_movimiento to return False (so it tries to save)
        self.mock_repo.existe_movimiento.return_value = False
        self.mock_repo.obtener_exacto.return_value = None
        
        self.service = CargarMovimientosService(self.mock_repo, self.mock_moneda_repo)
        
        # Mock _extraer_movimientos to return data similar to logs
        self.service._extraer_movimientos = MagicMock(return_value=[
            {
                'fecha': '2026-01-19', 
                'descripcion': 'TRASLADO HACIA CUENTA', 
                'referencia': '', 
                'valor': Decimal('-13355015.00'),
                'moneda': 'COP'
            }
        ])
        
        # Mock moneda repo to return 1 for COP
        self.service._obtener_id_moneda = MagicMock(return_value=1)

    def test_procesar_archivo_converts_date(self):
        print("Testing procesar_archivo with string date...")
        
        # Call procesar_archivo
        result = self.service.procesar_archivo(
            file_obj=None, 
            filename="test.pdf", 
            tipo_cuenta="FondoRenta", 
            cuenta_id=3
        )
        
        print("Result:", result)
        
        # Check assertions
        self.assertEqual(result['errores'], 0, "Should have 0 errors")
        self.assertEqual(result['nuevos_insertados'], 1, "Should have 1 inserted")
        self.assertEqual(result['periodo'], "2026-ENE", "Period should be 2026-ENE")
        
        # Verify repo.guardar was called with a Movimiento object containing a DATE object
        self.mock_repo.guardar.assert_called_once()
        args = self.mock_repo.guardar.call_args[0]
        movimiento = args[0]
        
        self.assertIsInstance(movimiento, Movimiento)
        self.assertIsInstance(movimiento.fecha, date, "movimiento.fecha should be a date object")
        self.assertEqual(movimiento.fecha, date(2026, 1, 19))
        print("✓ Verification passed: procesar_archivo correctly converts string date to date object.")

if __name__ == '__main__':
    unittest.main()
