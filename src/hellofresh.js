/**
 * HelloFresh recipe-bank discovery, always gated by real supermarket offers.
 * Only factual recipe titles/ingredient names and direct links are kept.
 * No copying of protected cooking steps, recipe cards or food photography.
 */
import {isWholeIngredientOffer,isOfferInPeriod} from "./meal-engine.js";
import {RECIPE_RETAILERS} from "./weekly.js";
import {clean,todayNL} from "./pricing.js";

const SAFE_KEYS=new Set([
 "kipfilet","kipdijfilet","kipdrumsticks","rundergehakt","biefstuk",
 "runderreepjes","varkenshaas","varkensfiletlapjes","zalmfilet",
 "kabeljauwfilet","broccoli","kastanjechampignons","courgette",
 "rode paprika","gele paprika","verse spinazie","kikkererwten",
 "tomatenblokjes","komkommer","rode ui","tomaten","pompoenblokjes",
 "avocado","prei","wortel","cherrytomaten","aubergine",
 "volkoren pasta","zilvervliesrijst","kidneybonen","eieren"
]);
const PATTERNS=[
 ["kipdrumsticks",/\b(kipdrumsticks?|kippenpoten|kippenpoot)\b/],
 ["kipdijfilet",/\bkipdijfilet\b/],
 ["kipfilet",/\b(kipfilethaasjes|kipfilet|kipborstfilet)\b/],
 ["rundergehakt",/\b(rundergehakt|rund gehakt)\b/],
 ["runderreepjes",/\b(runderreepjes|rundvleesreepjes)\b/],
 ["biefstuk",/\b(kogelbiefstuk|biefstuk)\b/],
 ["varkenshaas",/\bvarkenshaas(puntjes|medaillons)?\b/],
 ["varkensfiletlapjes",/\bvarkensfiletlapjes\b/],
 ["zalmfilet",/\b(zalmfilet|verse zalm)\b/],
 ["kabeljauwfilet",/\bkabeljauwfilet\b/],
 ["kastanjechampignons",/\b(kastanjechampignons|kastanje champignons)\b/],
 ["broccoli",/\bbroccoli\b/],
 ["courgette",/\bcourgettes?\b/],
 ["rode paprika",/\b(ro(de)? paprika|paprika)\b/],
 ["verse spinazie",/\bspinazie\b/],
 ["kikkererwten",/\bkikkererwten\b/],
 ["tomatenblokjes",/\btomatenblokjes\b/],
 ["komkommer",/\bkomkommer\b/],
 ["rode ui",/\brode ui\b/],
 ["tomaten",/\b(tomaat|tomaten)\b/],
 ["pompoenblokjes",/\bpompoen\b/],
 ["avocado",/\bavocados?\b/],
 ["prei",/\bprei\b/],
 ["wortel",/\bwortels?\b/],
 ["cherrytomaten",/\bcherrytomaten\b/],
 ["aubergine",/\baubergines?\b/],
 ["volkoren pasta",/\bvolkoren (pasta|penne|spaghetti)\b/],
 ["zilvervliesrijst",/\bzilvervliesrijst\b/],
 ["kidneybonen",/\bkidneybonen\b/],
 ["eieren",/\b(scharreleieren|eieren)\b/]
];
export function recognizedHelloFreshIngredient(value) {
 const name=clean(value);
 if(!name || /\b(vega|vegetarisch|plantaardig|burger|worst|saus|mix|soep|gehaktballetjes)\b/.test(name)) return null;
 return PATTERNS.find(([key,regex])=>regex.test(name))?.[0]||null;
}
export function validHelloFreshUrl(value) {
 try {
  const u=new URL(value);
  return u.protocol==="https:" && (
    (u.hostname==="www.hellofresh.nl" && u.pathname.startsWith("/recipes/")) ||
    (u.hostname==="hfresh.info" && u.pathname.startsWith("/nl-nl/recipes/"))
  ) ? u.href:null;
 }catch{return null;}
}
export function sanitizeHelloFreshEntries(records) {
 if(!Array.isArray(records))return [];
 const seen=new Set();
 return records.slice(0,3000).flatMap(rec=>{
   if(!rec || typeof rec.title!=="string" || rec.title.length>170 || !rec.title.trim())return [];
   const url=validHelloFreshUrl(rec.url);
   if(!url || seen.has(url))return [];
   const ingredients=(Array.isArray(rec.ingredients)?rec.ingredients:[]).slice(0,50)
     .map(i=>{
       if(!i || typeof i.name!=="string" || i.name.length>90)return null;
       const key=typeof i.key==="string"&&SAFE_KEYS.has(i.key)?i.key:
         recognizedHelloFreshIngredient(i.name);
       return {name:i.name.trim(),key:key||null};
     }).filter(Boolean);
   if(!ingredients.some(i=>i.key))return [];
   seen.add(url);
   return [{id:String(rec.id||url).slice(0,160),title:rec.title.trim(),
     url,minutes:Number.isFinite(Number(rec.minutes))&&Number(rec.minutes)>0?Number(rec.minutes):null,
     diet:["kip","rund","varken","vis","vegan","vegetarisch"].includes(rec.diet)?rec.diet:"onbekend",
     ingredients}];
 });
}
export function matchHelloFreshRecipes(entries,offers,retailer,today=todayNL(),period="now",limit=12) {
 if(!RECIPE_RETAILERS.some(r=>r.code===retailer))return [];
 const live=(Array.isArray(offers)?offers:[]).filter(o=>o.retailer===retailer && isOfferInPeriod(o,period,today));
 const matches=[];
 for(const recipe of sanitizeHelloFreshEntries(entries)) {
   const hits=[],used=new Set();
   for(const ingr of recipe.ingredients){
     if(!ingr.key)continue;
     const options=live.filter(o=>!used.has(o.id)&&isWholeIngredientOffer(o,{key:ingr.key}))
       .sort((a,b)=>(Number(b.savings)||0)-(Number(a.savings)||0) ||
         String(a.name).localeCompare(String(b.name),"nl"));
     if(!options.length)continue;
     const offer=options[0];used.add(offer.id);
     hits.push({ingredient:ingr.name,key:ingr.key,offer});
   }
   if(!hits.length)continue;
   matches.push({recipe,matches:hits,score:hits.length*100+
     hits.reduce((sum,h)=>sum+(Number(h.offer.savings)||0),0)});
 }
 return matches.sort((a,b)=>b.score-a.score||a.recipe.title.localeCompare(b.recipe.title,"nl"))
   .slice(0,Math.max(1,Math.min(Number(limit)||12,30)));
}
