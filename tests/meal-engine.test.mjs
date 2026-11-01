import test from "node:test";
import assert from "node:assert/strict";
import {buildActionMeals,isWholeIngredientOffer,isOfferInPeriod} from "../src/meal-engine.js";

const day="2026-11-02";
const deal=(id,name,retailer="jumbo",extra={})=>({
  id,name,retailer,price:1.75,original:2.50,savings:30,status:"active",
  valid_from:"2026-11-02",valid_until:"2026-11-08",...extra
});

test("empty or unrelated actions produce zero recipes, not fillers",()=>{
  assert.deepEqual(buildActionMeals([],"jumbo",day),[]);
  assert.deepEqual(buildActionMeals([deal("x","Jumbo chocopasta"),deal("y","Jumbo cola")],"jumbo",day),[]);
  assert.deepEqual(buildActionMeals([deal("x","Jumbo broccoli"),deal("y","Jumbo rode paprika")],"aldi",day),[]);
});
test("multiple promotions take precedence and a single offer is never double-counted",()=>{
  const offers=[deal("a","Jumbo broccoli 500 gram"),deal("b","Jumbo courgette 1 stuk")];
  const menu=buildActionMeals(offers,"jumbo",day);
  assert.ok(menu.length>=1);
  assert.equal(menu[0].matches.length,2);
  for(const entry of menu){
    assert.ok(entry.matches.length>=1);
    assert.equal(new Set(entry.matches.map(m=>m.offer.id)).size,entry.matches.length);
    assert.ok(entry.recipe.ingredients.length>=4);
    assert.ok(entry.recipe.steps.length>=4);
    assert.ok(entry.matches.every(m=>m.offer.retailer==="jumbo"));
  }
});
test("recipes are genuinely tailored: swap promotional ingredients, change meal title and shopping list",()=>{
  const a=buildActionMeals([deal("a","Jumbo broccoli"),deal("b","Jumbo courgette")],"jumbo",day);
  const b=buildActionMeals([deal("a","Jumbo broccoli"),deal("c","Jumbo rode paprika")],"jumbo",day);
  assert.notEqual(a[0].recipe.title,b[0].recipe.title);
  assert.notDeepEqual(a[0].recipe.ingredients.slice(0,2),b[0].recipe.ingredients.slice(0,2));
});
test("expired, future, missing, off-store deals never count",()=>{
  const menu=buildActionMeals([
    deal("a","Jumbo broccoli"),
    deal("b","Jumbo courgette","jumbo",{status:"upcoming"}),
    deal("c","Jumbo spinazie","lidl"),
    deal("d","Jumbo rode paprika","jumbo",{valid_until:"2026-11-01"})
  ],"jumbo",day);
  assert.ok(menu.length>0);
  assert.ok(menu.every(e=>e.matches.every(m=>m.offer.id==="a")));
});
test("one offer matching two aliases is counted once, not twice",()=>{
  const offers=[deal("same","Jumbo paprika mix rode gele paprika")];
  const menu=buildActionMeals(offers,"jumbo",day);
  assert.ok(menu.every(e=>e.matches.length===1));
});
test("does not match ready meals, soup or shampoo as vegetables",()=>{
  const offers=[
    deal("a","Jumbo broccoli soep"),
    deal("b","Jumbo courgette maaltijd salade"),
    deal("c","Jumbo spinazie shampoo")
  ];
  assert.deepEqual(buildActionMeals(offers,"jumbo",day),[]);
});
test("deterministic, diverse and no more than 7 recipes",()=>{
  const offers=[
    deal("a","Jumbo broccoli"),deal("b","Jumbo courgette"),deal("c","Jumbo rode paprika"),
    deal("d","Jumbo cherrytomaten"),deal("e","Jumbo verse spinazie"),deal("f","Jumbo wortel"),
    deal("g","Jumbo pompoenblokjes"),deal("h","Jumbo kastanjechampignons"),
    deal("i","Jumbo prei"),deal("j","Jumbo komkommer"),
  ];
  const a=buildActionMeals(offers,"jumbo",day),b=buildActionMeals(offers,"jumbo",day);
  assert.deepEqual(a,b);
  assert.ok(a.length>2 && a.length<=7);
  assert.equal(new Set(a.map(e=>e.method)).size,a.length);
});
test("chicken or fish must itself be on offer alongside a matching vegetable",()=>{
  const offers=[
    deal("a","Jumbo verse zalmfilet 200 g"),
    deal("b","Jumbo broccoli 500g"),
  ];
  const plan=buildActionMeals(offers,"jumbo",day);
  const fish=plan.find(p=>p.recipe.diet==="vis");
  assert.ok(fish);
  assert.equal(fish.matches[0].offer.id,"a");
  assert.ok(fish.recipe.steps.some(step=>step.includes("vis")));
});

test("discounted staple plus actual vegetable can generate a dinner",()=>{
  const menu=buildActionMeals([
    deal("a","Jumbo broccoli 500g"),
    deal("b","Jumbo volkoren pasta 500g")
  ],"jumbo",day);
  const pasta=menu.find(e=>e.recipe.category==="Volkoren pasta");
  assert.ok(pasta);
  assert.deepEqual(pasta.matches.map(m=>m.offer.id).sort(),["a","b"]);
  assert.ok(pasta.recipe.ingredients.some(i=>i[0]==="volkoren pasta"));
  assert.ok(pasta.recipe.ingredients.some(i=>i[0]==="broccoli"));
});

test("real-world grocery provider false-positive titles are never cooking ingredients",()=>{
  const bad=[
    ["Unox Paprika tomatensoep","rode paprika"],
    ["NIVEA Care shower orange & avocado oil","avocado"],
    ["AH Ovenschotel kipfilet champignon room","kipfilet"],
    ["Knorr Good potatoes broccoli en kaas","broccoli"],
    ["Knorr Wortel wraps met 35% wortel","wortel"],
    ["Olvarit Courgette witvis rijst 8m+","courgette"],
    ["AH Pastasaus spinazie roomkaas","verse spinazie"],
    ["AH Rauwkost komkommer","komkommer"],
    ["DORITOS pure paprika","rode paprika"],
    ["Honig Bakplaat Mix Aardappel, Broccoli & Rundervink","broccoli"],
    ["Vivera Vegetarische Spinazie Kaas Filet","verse spinazie"],
    ["Falafel Tomaat/Paprika","rode paprika"],
    ["Iglo Roerbak Sensatie Pasta Kipfilet Boursin","kipfilet"],
    ["Lay's Wokkels Paprika","rode paprika"],
    ["Maggi Dagschotel broccoli kaas","broccoli"],
    ["Lu Tuc paprika","rode paprika"],
    ["Bieze Rauwkost komkommer","komkommer"],
    ["AH Vers geperste smoothie wortel mango","wortel"],
    ["AH Bakaardappeltjes paprika en knoflook","rode paprika"],
    ["AH 75% Groentesmoothie spinazie komkommer","komkommer"],
    ["Jumbo Gevulde Eieren Kerrie 4 Stuks","eieren"],
    ["Aviko Wavy blends paprika","rode paprika"]
  ];
  for(const [name,key] of bad){
    assert.equal(isWholeIngredientOffer({name,category:""}, {key}),false,name);
  }
});
test("whole produce, raw proteins and legumes remain eligible",()=>{
  const good=[
    ["AH Broccoli 500 g","broccoli","groente-fruit"],
    ["Jumbo Biologische Pompoen","pompoenblokjes","groente-fruit"],
    ["Verse zalmfilet op huid","zalmfilet","vlees-vis"],
    ["Bonduelle Kikkererwten 2 mini's","kikkererwten","conserven"],
    ["Jumbo Avocado Eetrijp 2 Stuks","avocado","groente-fruit"],
    ["Jumbo Volkoren pasta 500 g","volkoren pasta","pasta-rijst"]
  ];
  for(const [name,key,category] of good){
    assert.equal(isWholeIngredientOffer({name,category}, {key}),true,name);
  }
});
test("ready foods cannot create false two-offer recipes",()=>{
  const bad=[
    deal("a","Lay's Wokkels Paprika"),
    deal("b","Unox Pompoen rode linzensoep"),
    deal("c","NIVEA Care shower orange & avocado oil"),
    deal("d","Honig Bakplaat Mix Aardappel, Broccoli & Rundervink"),
    deal("e","Vivera Vegetarische Spinazie Kaas Filet")
  ];
  assert.deepEqual(buildActionMeals(bad,"jumbo",day),[]);
});

test("single real central offer creates relevant dinner without fake second discount",()=>{
  const plan=buildActionMeals([deal("a","Lidl Verse zalmfilet op huid","lidl")],"lidl",day);
  assert.ok(plan.length>0);
  assert.ok(plan.every(e=>e.matches.length===1 && e.matches[0].offer.id==="a"));
  assert.ok(plan.some(e=>e.recipe.diet==="vis" && e.recipe.title.includes("aardappeltjes")));
});


test("raw chicken cuts, beef and pork trigger complete offers-based dinners",()=>{
  const cases=[
    ["Jumbo Kipdijfilet 500 g","kipdijfilet","kip"],
    ["Jumbo Kipdrumsticks 1 kg","kipdrumsticks","kip"],
    ["Jumbo Mager rundergehakt 500 g","rundergehakt","rund"],
    ["Jumbo Kogelbiefstuk 2 stuks","biefstuk","rund"],
    ["Jumbo Runderreepjes 350 g","runderreepjes","rund"],
    ["Jumbo Varkenshaas 400 g","varkenshaas","varken"],
    ["Jumbo Varkensfiletlapjes 350 g","varkensfiletlapjes","varken"],
  ];
  for(const [name,ingredient,diet] of cases){
    const offers=[deal("meat",name,"jumbo",{category:"vlees-vis"})];
    const menu=buildActionMeals(offers,"jumbo",day);
    const dish=menu.find(r=>r.recipe.diet===diet);
    assert.ok(dish,name+" must trigger an action-based meat recipe");
    assert.ok(dish.recipe.ingredients.some(([n])=>n===ingredient),name+" must be on shopping list");
    assert.equal(dish.matches[0].offer.id,"meat");
    assert.ok(dish.recipe.steps.length>=4);
    if(diet==="kip")assert.ok(dish.recipe.steps.some(step=>step.includes("75 °C")));
  }
});
test("multiple types of meat can appear in the same week without being suppressed",()=>{
  const deals=[
    deal("chicken","Jumbo Kipfilet 500g"),
    deal("beef","Jumbo Rundergehakt 500g"),
    deal("pork","Jumbo Varkenshaas 350g"),
    deal("fish","Jumbo Zalmfilet 2 stuks"),
    deal("vegetable","Jumbo Broccoli 500g")
  ];
  const menu=buildActionMeals(deals,"jumbo",day);
  const diets=new Set(menu.map(e=>e.recipe.diet));
  for(const diet of ["kip","rund","varken","vis"])assert.ok(diets.has(diet),diet+" not included");
  assert.ok(menu.every(e=>e.matches.every(m=>deals.some(d=>d.id===m.offer.id))));
});
test("ready meals, vegetarian alternatives and deli meats never count as uncooked meat",()=>{
  const bad=[
    ["Vegetarische kipfilet 200g","kipfilet"],
    ["Gerookte kipfilet broodbeleg","kipfilet"],
    ["Kipfilet in champignon roomsaus kant en klaar","kipfilet"],
    ["Rundergehakt vegetarisch 350g","rundergehakt"],
    ["Biefstuk burger in saus","biefstuk"],
    ["Varkenshaas schnitzel gepaneerd","varkenshaas"]
  ];
  for(const [name,key] of bad)
    assert.equal(isWholeIngredientOffer({name,category:"vlees-vis"},{key}),false,name);
});
test("next-week meal matching considers announced dates, not today's offers",()=>{
  const thisWeek=deal("now","Jumbo Kipfilet 500g","jumbo",{valid_from:"2026-11-02",valid_until:"2026-11-08"});
  const nextWeek=deal("next","Jumbo Rundergehakt 500g","jumbo",{status:"upcoming",valid_from:"2026-11-09",valid_until:"2026-11-15"});
  assert.equal(isOfferInPeriod(thisWeek,"now",day),true);
  assert.equal(isOfferInPeriod(nextWeek,"now",day),false);
  assert.equal(isOfferInPeriod(thisWeek,"next",day),false);
  assert.equal(isOfferInPeriod(nextWeek,"next",day),true);
  const menu=buildActionMeals([thisWeek,nextWeek],"jumbo",day,7,"next");
  assert.ok(menu.length>0);
  assert.ok(menu.every(m=>m.matches.every(x=>x.offer.id==="next")));
  assert.ok(menu.some(m=>m.recipe.diet==="rund"));
});
