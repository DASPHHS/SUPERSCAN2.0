import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "scripts" / "sync_sources.py"
spec = importlib.util.spec_from_file_location("sync_sources", SCRIPT)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SyncTests(unittest.TestCase):
    def test_only_valid_shelf_prices(self):
        self.assertTrue(sync.valid_price(1.25))
        self.assertFalse(sync.valid_price(-1))
        self.assertFalse(sync.valid_price(None))
        self.assertFalse(sync.valid_price(True))

    def test_product_page_structure(self):
        products, total = sync.products_in_page({"products": [{"name": "appel"}], "total": 1})
        self.assertEqual(len(products), 1)
        self.assertEqual(total, 1)

    def test_filters_not_current(self):
        running = {"price": 2.5, "promotion_status": "active",
                   "valid_from": "2020-01-01", "valid_until": "2099-12-31"}
        self.assertTrue(sync.is_running(running))
        self.assertFalse(sync.is_running({**running, "promotion_status": "upcoming"}))
        self.assertFalse(sync.is_running({**running, "promotion_status": "historical"}))
        self.assertFalse(sync.is_running({**running, "valid_until": "2020-01-02"}))
        self.assertFalse(sync.is_running({**running, "price": 0}))

    def test_derived_discount(self):
        self.assertEqual(sync.percentage({"price": 3, "original_price": 6}), 50)
        self.assertEqual(sync.percentage({"price": 6, "original_price": 3}), 0)


if __name__ == "__main__":
    unittest.main()
