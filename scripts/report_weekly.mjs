#!/usr/bin/env node
/** Verify published offers can produce evidence-backed dinner suggestions. */
import { readFileSync } from "node:fs";
import { normalizeOffer, todayNL } from "../src/pricing.js";
import { dealMatchedRecipes, RECIPE_RETAILERS } from "../src/weekly.js";

const raw = JSON.parse(readFileSync(new URL("../data/deals.json", import.meta.url), "utf8"));
const offers=(raw.offers||[]).map(normalizeOffer);
const today=todayNL();
console.log("SuperScan actiegerichte weekrecepten, bron:",raw.source,"dag:",today);
for(const retailer of RECIPE_RETAILERS) {
  const live = offers.filter(o=>o.retailer===retailer.code);
  const menu=dealMatchedRecipes(offers,retailer.code,today);
  console.log(
    retailer.name.padEnd(15),
    String(live.length).padStart(4),"gevonden productacties,",
    menu.length,"geschikte weekrecepten"
  );
  menu.forEach(entry=>{
    const productNames=entry.matches.map(m=>m.offer.name).slice(0,3).join(", ");
    console.log("  •",entry.recipe.title,"|",entry.matches.length,"relevante acties |",productNames);
  });
  if(menu.length===0)console.warn("  Geen bewezen actierecepten: de site toont bewust geen generieke gerechten.");
}
