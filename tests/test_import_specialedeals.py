import datetime as dt
import importlib.util
import pathlib
import unittest
from zoneinfo import ZoneInfo

FILE=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"import_specialedeals.py"
SPEC=importlib.util.spec_from_file_location("import_specialedeals",FILE)
M=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW=dt.datetime(2026,11,1,13,0,tzinfo=ZoneInfo("Europe/Amsterdam"))

def row(idx,chain,begin="2026-10-26",end="2026-11-08"):
    return {"id":f"p:{idx}","winkel":chain,"product":f"Rundergehakt {idx}",
            "categorie":"vlees-vis","prijs":4.5,"van":begin,"tot":end,
            "korting":0.25,"verpakking":"500g","url":"https://www.prijsprofeet.nl/"}

class SpecialeDealsImportTest(unittest.TestCase):
    def test_five_chain_filter_and_promotion_conversion(self):
        today=NOW.date().isoformat()
        self.assertIsNone(M.normalize(row(1,"Aldi"),today))
        p=M.normalize(row(2,"Jumbo"),today)
        self.assertEqual(p["retailer"],"jumbo")
        self.assertEqual(p["promotion_status"],"active")
        self.assertEqual(p["savings_percentage"],25)
        self.assertEqual(p["category"],"vlees-vis")
        self.assertEqual(p["price"],4.5)

    def test_next_week_offers_kept_for_planning(self):
        item=M.normalize(row(3,"Lidl","2026-11-02","2026-11-08"),NOW.date().isoformat())
        self.assertEqual(item["promotion_status"],"upcoming")

    def test_future_from_wrong_chain_expired_and_uncertain_date_excluded(self):
        today=NOW.date().isoformat()
        self.assertIsNone(M.normalize(row(2,"Aldi"),today))
        self.assertIsNone(M.normalize(row(2,"Dirk",end="2026-10-31"),today))
        self.assertIsNone(M.normalize({**row(2,"Dirk"),"einddatum_geschat":True},today))

    def test_complete_source_and_freshness_guards(self):
        rows=[row(n,"Dirk" if n%2 else "Albert Heijn") for n in range(120)]
        data={"schema_version":2,"source":"PrijsProfeet","updated_at":NOW.isoformat(),
              "deals":rows}
        result=M.make_payload(data,NOW)
        self.assertEqual(len(result["offers"]),120)
        self.assertEqual(result["sourceCount"],120)
        self.assertTrue(all(o["retailer"] in M.NAMES.values() for o in result["offers"]))
        old={**data,"updated_at":"2026-10-20T10:00:00+02:00"}
        with self.assertRaises(ValueError):M.make_payload(old,NOW)

    def test_bundle_and_loyalty_not_misrepresented_as_simple_discount(self):
        p=M.normalize({**row(2,"Hoogvliet"),"bundelaantal":2,"bundelprijs":6,
                       "ledenprijs":3.5},NOW.date().isoformat())
        self.assertEqual(p["multi_buy_quantity"],2)
        self.assertEqual(p["multi_buy_price"],6)
        self.assertEqual(p["loyalty_price"],3.5)
        self.assertNotIn("original_price",p)

if __name__=="__main__":
    unittest.main()
