/**
 * Actiegestuurde recepten voor vijf Nederlandse supermarktketens.
 *
 * Recepten zijn origineel en redactioneel vastgesteld in recipes.js.
 * Dit bestand verzint geen recept, actie, prijs of filialebeschikbaarheid.
 * Een recept komt alleen in de planner met een controleerbare actieve
 * aanbieding voor een daadwerkelijk gebruikt hoofdingrediënt.
 */
import { recipes } from "./recipes.js";
import { clean, isActiveOffer, todayNL } from "./pricing.js";

export const RECIPE_RETAILERS = Object.freeze([
  { code: "albert_heijn", name: "Albert Heijn", finder: "https://www.ah.nl/winkels" },
  { code: "lidl", name: "Lidl", finder: "https://www.lidl.nl/c/winkels/s10008788" },
  { code: "jumbo", name: "Jumbo", finder: "https://www.jumbo.com/winkels" },
  { code: "hoogvliet", name: "Hoogvliet", finder: "https://www.hoogvliet.com/winkels" },
  { code: "dirk", name: "Dirk", finder: "https://www.dirk.nl/winkels" }
]);

const SIMPLE_ALIASES = Object.freeze({
  "kikkererwten": ["kikkererwten"],
  "bulgur volkoren": ["bulgur", "volkoren bulgur"],
  "komkommer": ["komkommer"],
  "cherrytomaten": ["cherrytomaten", "cherry tomaten", "snoeptomaten"],
  "rode paprika": ["rode paprika", "paprika rood", "paprika"],
  "magere yoghurt": ["magere yoghurt", "yoghurt mager"],
  "citroen": ["citroen", "citroenen"],
  "olijfolie": ["olijfolie"],
  "komijnpoeder": ["komijnpoeder", "gemalen komijn"],
  "volkoren pasta": ["volkoren pasta", "volkoren penne", "volkoren spaghetti", "volkoren macaroni", "volkoren fusilli"],
  "verse spinazie": ["verse spinazie", "spinazie"],
  "spinazie": ["verse spinazie", "spinazie"],
  "kastanjechampignons": ["kastanjechampignons", "kastanje champignons"],
  "ricotta": ["ricotta"],
  "knoflook": ["knoflook"],
  "zalmfilet": ["zalmfilet", "zalm filet", "verse zalm"],
  "broccoli": ["broccoli"],
  "wortel": ["wortelen", "wortel", "winterpeen", "bospeen"],
  "zilvervliesrijst": ["zilvervliesrijst", "zilvervlies rijst"],
  "dille": ["dille"],
  "rode linzen": ["rode linzen"],
  "pompoenblokjes": ["pompoenblokjes", "pompoen"],
  "tomatenblokjes": ["tomatenblokjes", "tomaten blokjes", "tomaten in blokjes"],
  "ui": ["uien", "gele uien", "ui"],
  "currypoeder": ["currypoeder"],
  "eieren": ["eieren", "scharreleieren", "vrije uitloop eieren"],
  "gele paprika": ["gele paprika", "paprika geel"],
  "volkorenbrood": ["volkoren brood", "volkorenbrood"],
  "paprikapoeder": ["paprikapoeder"],
  "kipfilet": ["kipfilet", "kip filet", "kipborstfilet"],
  "kipdijfilet": ["kipdijfilet", "kip dijfilet", "kipdij filet", "kip dij filet"],
  "kipdrumsticks": ["kipdrumsticks", "kip drumsticks", "kippenpoten", "kippenpoot", "kip drumstick"],
  "rundergehakt": ["rundergehakt", "mager rundergehakt", "rund gehakt"],
  "biefstuk": ["biefstuk", "kogelbiefstuk", "runderbiefstuk"],
  "runderreepjes": ["runderreepjes", "rundvleesreepjes", "runder wokreepjes", "rund reepjes"],
  "varkenshaas": ["varkenshaas", "varkenshaasmedaillons"],
  "varkensfiletlapjes": ["varkensfiletlapjes", "varkens filet lapjes", "varkensfilet lapjes"],
  "courgette": ["courgette", "courgettes"],
  "rode ui": ["rode ui", "rode uien"],
  "vastkokende aardappelen": ["vastkokende aardappelen", "aardappelen vastkokend"],
  "aardappelen": ["aardappelen", "vastkokende aardappelen", "kruimige aardappelen"],
  "rozemarijn": ["rozemarijn"],
  "volkoren wraps": ["volkoren wraps", "volkoren tortilla", "volkoren tortillas"],
  "kidneybonen": ["kidneybonen", "rode kidneybonen"],
  "tomaten": ["tomaten", "tomaat", "trostomaten"],
  "romainesla": ["romainesla", "romaine sla"],
  "avocado": ["avocado", "avocados"],
  "limoen": ["limoen", "limoenen"],
  "volkoren couscous": ["volkoren couscous"],
  "feta": ["feta"],
  "peterselie": ["peterselie"],
  "stevige tofu": ["tofu", "stevige tofu"],
  "paksoi": ["paksoi", "pak choi"],
  "gember": ["gember", "verse gember"],
  "natriumarme sojasaus": ["sojasaus minder zout", "zoutarme sojasaus"],
  "zonnebloemolie": ["zonnebloemolie"],
  "kabeljauwfilet": ["kabeljauwfilet", "kabeljauw filet"],
  "prei": ["prei"],
  "diepvriesdoperwten": ["diepvries doperwten", "doperwten"],
  "bleekselderij": ["bleekselderij"],
  "linzen uit blik": ["linzen in blik", "linzen"],
  "aubergine": ["aubergine", "aubergines"],
  "bruine linzen": ["bruine linzen", "linzen"],
  "tomatenpassata zonder zout": ["tomatenpassata", "passata"],
  "mozzarella": ["mozzarella"],
  "oregano": ["oregano"]
});

const MAJOR_INGREDIENTS = new Set([
  "kikkererwten", "komkommer", "cherrytomaten", "rode paprika",
  "verse spinazie", "spinazie", "kastanjechampignons", "zalmfilet",
  "broccoli", "wortel", "rode linzen", "pompoenblokjes",
  "tomatenblokjes", "eieren", "gele paprika", "kipfilet", "courgette",
  "vastkokende aardappelen", "kidneybonen", "tomaten", "romainesla",
  "volkoren couscous", "stevige tofu", "paksoi", "kabeljauwfilet",
  "prei", "diepvriesdoperwten", "bleekselderij", "linzen uit blik",
  "aubergine", "bruine linzen", "mozzarella", "volkoren pasta"
]);

// Vermijd ongerelateerde producten met een ingrediëntnaam (sauzen,
// kant-en-klare gerechten, diervoeding of verzorgingsproducten).
const BAD_WORDS = new Set([
  "saus", "soep", "soup", "salade", "pizza", "chips", "koekjes",
  "crackers", "shampoo", "conditioner", "zeep", "deo", "babyvoeding",
  "hondenvoer", "kattenvoer", "kattensnack", "diepvriespizza", "maaltijd",
  "maaltijdsalade", "smaak", "aroma", "drink", "drank", "snoep",
  "bouillon", "extract", "dressing", "pesto", "kruidenmix"
]);

const PRODUCT_EXCEPTIONS = new Set(["tomatenblokjes", "rode linzen", "bruine linzen", "linzen uit blik"]);

function canonicalIngredient(name) {
  return clean(String(name).replace(/\([^)]*\)/g, ""));
}
function phraseContains(haystack, needle) {
  return (" " + haystack + " ").includes(" " + needle + " ");
}
function isPlausibleIngredient(offerName, ingredientKey) {
  const product = clean(offerName);
  if (!product) return false;
  const aliases = SIMPLE_ALIASES[ingredientKey] || [ingredientKey];
  if (!aliases.some(alias => phraseContains(product, clean(alias)))) return false;
  const words = new Set(product.split(" "));
  if ([...BAD_WORDS].some(word => words.has(word))) {
    // Tomato cubes in a can or lentils in a can are fine; unrelated dishes are not.
    if (!PRODUCT_EXCEPTIONS.has(ingredientKey)) return false;
    if (["soep", "saus", "pizza", "shampoo", "maaltijd", "smaak"].some(w => words.has(w))) return false;
  }
  if (ingredientKey === "tomaten" && ["tomatenblokjes", "passata"].some(w => words.has(w))) return false;
  if (ingredientKey === "rode paprika" && product.includes(" paprikapoeder")) return false;
  if (ingredientKey === "wortel" && product.includes(" worteltaart")) return false;
  return true;
}

export function matchesRecipeIngredient(offer, ingredient) {
  if (!offer || !ingredient || typeof offer.name !== "string") return false;
  return isPlausibleIngredient(offer.name, canonicalIngredient(ingredient));
}

export function dealMatchedRecipes(offers, retailer, today = todayNL(), limit = 7) {
  if (!RECIPE_RETAILERS.some(x => x.code === retailer)) return [];
  const live = (Array.isArray(offers) ? offers : []).filter(
    o => o.retailer === retailer &&
      isActiveOffer({ ...o, promotion_status: o.status || o.promotion_status }, today)
  );
  const candidates = recipes.map(recipe => {
    const matches = [];
    const usedOffers = new Set();
    for (const ingredient of recipe.ingredients) {
      const ingredientName = ingredient[0];
      const key = canonicalIngredient(ingredientName);
      const options = live.filter(o => !usedOffers.has(o.id) && matchesRecipeIngredient(o, ingredientName));
      if (!options.length) continue;
      // Lowest actual offer price is not equivalent to lowest unit price, so
      // prefer discounts, then deterministic product names for ties.
      options.sort((a, b) =>
        (Number(b.savings) || 0) - (Number(a.savings) || 0) ||
        String(a.name).localeCompare(String(b.name), "nl")
      );
      const deal = options[0];
      usedOffers.add(deal.id);
      matches.push({ ingredient: ingredientName, offer: deal, major: MAJOR_INGREDIENTS.has(key) });
    }
    // No unsupported recipe is ever shown. The key ingredient MUST be on offer.
    if (!matches.some(x => x.major)) return null;
    const main = matches.filter(x => x.major).length;
    const evidence = matches.length;
    const discount = matches.reduce((sum, x) => sum + (Number(x.offer.savings) || 0), 0);
    return { recipe, matches, main, score: evidence * 100 + main * 25 + Math.min(discount, 150) };
  }).filter(Boolean);
  candidates.sort((a, b) =>
    b.score - a.score || a.recipe.title.localeCompare(b.recipe.title, "nl")
  );
  return candidates.slice(0, Math.max(1, Math.min(Number(limit) || 7, 12)));
}

export function weekBounds(today = todayNL()) {
  const d = new Date(today + "T12:00:00Z");
  const offset = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - offset * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
}
