import test from "node:test";
import assert from "node:assert/strict";
import {
  RECIPE_RETAILERS, matchesRecipeIngredient, dealMatchedRecipes, weekBounds
} from "../src/weekly.js";

const date="2026-11-02";
const offer=(id,name,retailer="jumbo",extra={})=>({
  id,name,retailer,price:1.5,savings:35,status:"active",
  valid_from:"2026-11-02",valid_until:"2026-11-08",...extra
});

test("exact five requested supermarket chains, no other chain",()=>{
  assert.deepEqual(RECIPE_RETAILERS.map(r=>r.code),
    ["albert_heijn","lidl","jumbo","hoogvliet","dirk"]);
});
test("no promotions, no recipes, never random",()=>{
  assert.deepEqual(dealMatchedRecipes([],"jumbo",date),[]);
  assert.deepEqual(dealMatchedRecipes([offer("a","Verse spinazie")],"aldi",date),[]);
});
test("a real vegetable action triggers a matching dinner with traceable product",()=>{
  const actions=[
    offer("s","Jumbo verse spinazie 400g"),
    offer("c","Jumbo kastanjechampignons 250g"),
    offer("p","Jumbo volkoren penne 500g")
  ];
  const menu=dealMatchedRecipes(actions,"jumbo",date);
  const pasta=menu.find(e=>e.recipe.id==="pasta-spinazie");
  assert.ok(pasta,"Pasta must be chosen due to verified action ingredients");
  assert.equal(pasta.matches.length,3);
  assert.deepEqual(pasta.matches.map(x=>x.offer.id).sort(),["c","p","s"]);
});
test("other chain deals never trigger the selected chain",()=>{
  const actions=[offer("s","Jumbo verse spinazie"),offer("t","Lidl broccoli", "lidl")];
  const fromJumbo=dealMatchedRecipes(actions,"jumbo",date);
  assert.ok(fromJumbo.length>0);
  assert.ok(fromJumbo.every(e=>e.matches.every(m=>m.offer.retailer==="jumbo")));
  const fromAH=dealMatchedRecipes(actions,"albert_heijn",date);
  assert.equal(fromAH.length,0);
});
test("must offer substantial food ingredient; oil alone is insufficient",()=>{
  assert.deepEqual(dealMatchedRecipes([offer("o","Olijfolie 500ml")],"jumbo",date),[]);
});
test("no future, expired or historical promotions and no fallback recipes",()=>{
  const deals=[
    offer("s","Jumbo verse spinazie", "jumbo",{status:"upcoming"}),
    offer("c","Jumbo courgette", "jumbo",{valid_until:"2026-11-01"}),
    offer("b","Jumbo broccoli", "jumbo",{status:"historical"}),
  ];
  assert.deepEqual(dealMatchedRecipes(deals,"jumbo",date),[]);
});
test("reject shampoo, soup and ready-meals despite food words",()=>{
  assert.equal(matchesRecipeIngredient(offer("a","Spinazie shampoo 250 ml"),"verse spinazie"),false);
  assert.equal(matchesRecipeIngredient(offer("b","Broccoli soep"),"broccoli"),false);
  assert.equal(matchesRecipeIngredient(offer("c","Courgette maaltijd salade"),"courgette"),false);
});
test("weekly picks are deterministic, not shuffled, and capped at 7",()=>{
  const deals=[
    offer("a","Jumbo broccoli 500 g"),
    offer("b","Jumbo verse spinazie"),
    offer("c","Jumbo paprika rood"),
    offer("d","Jumbo kastanje champignons"),
    offer("e","Jumbo kidneybonen"),
    offer("f","Jumbo rode linzen"),
    offer("g","Jumbo courgettes")
  ];
  const one=dealMatchedRecipes(deals,"jumbo",date);
  const two=dealMatchedRecipes(deals,"jumbo",date);
  assert.deepEqual(one,two);
  assert.ok(one.length<=7);
  assert.ok(one.every(e=>e.matches.length>0 && e.matches.some(m=>m.major)));
});
test("correct Monday-Sunday week for late weekend and year transition",()=>{
  assert.deepEqual(weekBounds("2026-11-01"),{start:"2026-10-26",end:"2026-11-01"});
  assert.deepEqual(weekBounds("2027-01-01"),{start:"2026-12-28",end:"2027-01-03"});
});
