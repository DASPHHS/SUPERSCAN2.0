import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {matchHelloFreshRecipes,validHelloFreshUrl,sanitizeHelloFreshEntries,recognizedHelloFreshIngredient} from "../src/hellofresh.js";

const data=JSON.parse(readFileSync(new URL("../data/hellofresh.json",import.meta.url),"utf8"));
const t="2026-11-02";
const offer=(id,name,retailer="jumbo",extra={})=>({
 id,name,retailer,price:3.5,savings:30,status:"active",
 valid_from:"2026-11-02",valid_until:"2026-11-08",category:"vlees-vis",...extra
});
test("verified official HelloFresh NL recipe links have factual ingredients, no instructions or image mirrors",()=>{
 assert.ok(data.recipes.length>=5);
 for(const r of data.recipes){
  assert.equal(validHelloFreshUrl(r.url),r.url);
  assert.ok(r.ingredients.length>=2);
  assert.equal(r.steps,undefined);
  assert.equal(r.image,undefined);
 }
});
test("HelloFresh bank never shows arbitrary recipes when there are no actual offers",()=>{
 assert.deepEqual(matchHelloFreshRecipes(data.recipes,[],"jumbo",t),[]);
 assert.deepEqual(matchHelloFreshRecipes(data.recipes,[offer("k","Jumbo kipfilet")],"aldi",t),[]);
});
test("actual discount on chicken makes matching original HelloFresh chicken recipe discoverable",()=>{
 const matching=matchHelloFreshRecipes(data.recipes,[offer("ch","Jumbo Scharrel kipfilet 300 g")],"jumbo",t);
 const chicken=matching.find(x=>x.recipe.title.includes("Kipfilet"));
 assert.ok(chicken);
 assert.ok(chicken.matches.some(m=>m.offer.id==="ch"));
 assert.ok(chicken.recipe.url.startsWith("https://www.hellofresh.nl/recipes/"));
});
test("meat and vegetables can independently match only existing ingredient list",()=>{
 const offers=[
  offer("p","Jumbo Varkenshaas 400 g","jumbo",{category:"vlees-vis"}),
  offer("v","Jumbo kastanjechampignons 250 g","jumbo",{category:"groente-fruit"})
 ];
 const entries=matchHelloFreshRecipes(data.recipes,offers,"jumbo",t);
 const pork=entries.find(e=>e.recipe.diet==="varken");
 assert.ok(pork);
 assert.deepEqual(pork.matches.map(x=>x.offer.id).sort(),["p","v"]);
});
test("wrong retailer, expired or future cannot trigger current HelloFresh recipes",()=>{
 const offers=[
  offer("a","Jumbo Kipfilet 300 g","jumbo",{valid_until:"2026-11-01"}),
  offer("b","Jumbo Kipfilet 300 g","lidl"),
  offer("c","Jumbo Kipfilet 300 g","jumbo",{status:"upcoming"})
 ];
 assert.equal(matchHelloFreshRecipes(data.recipes,offers,"jumbo",t).length,0);
});
test("next-week HelloFresh matching requires dates overlapping following Monday-Sunday",()=>{
 const future=[offer("a","Jumbo Kipfilet 300 g","jumbo",{
  status:"upcoming",valid_from:"2026-11-09",valid_until:"2026-11-15"
 })];
 assert.equal(matchHelloFreshRecipes(data.recipes,future,"jumbo",t,"now").length,0);
 assert.ok(matchHelloFreshRecipes(data.recipes,future,"jumbo",t,"next").length>0);
});
test("untrusted bad URLs never become external hyperlinks",()=>{
 assert.equal(validHelloFreshUrl("javascript:alert(1)"),null);
 assert.equal(validHelloFreshUrl("https://hfresh.info.evil.com/nl-nl/recipes/1"),null);
 assert.equal(validHelloFreshUrl("https://www.hellofresh.nl.evil.com/recipes/1"),null);
 assert.deepEqual(sanitizeHelloFreshEntries([{title:"Fake",url:"https://evil.example",ingredients:[{name:"kipfilet"}]}]),[]);
});
test("prepared meat and ingredients without recognized names are not assigned fake deal proof",()=>{
 assert.equal(recognizedHelloFreshIngredient("Vegetarische gehaktballetjes"),null);
 assert.equal(recognizedHelloFreshIngredient("Kipfilethaasjes"),"kipfilet");
 const recipes=[{id:"x",title:"Test maaltijd",url:"https://www.hellofresh.nl/recipes/test",
 ingredients:[{name:"Vegetarische gehaktballetjes"},{name:"Paprikachips"}]}];
 assert.deepEqual(matchHelloFreshRecipes(recipes,[offer("a","Jumbo kipfilet")],"jumbo",t),[]);
});

test("expanded official HelloFresh archive includes verified poultry, pork, beef and vegan links",()=>{
 assert.ok(data.recipes.length>=20,"Official linked catalogue must include at least twenty verified entries");
 assert.equal(new Set(data.recipes.map(r=>r.url)).size,data.recipes.length);
 for(const diet of ["kip","rund","varken","vegan","vegetarisch"]){
   assert.ok(data.recipes.some(r=>r.diet===diet),"Missing official recipes in "+diet);
 }
 assert.ok(data.recipes.every(r=>r.url.startsWith("https://www.hellofresh.nl/recipes/")));
 assert.equal(data.sourceUrl,"https://www.hellofresh.nl/recipes");
});
test("official archive matching shows real deal-specific choices, never all catalogue entries",()=>{
 const promo=[offer("broccoli","Jumbo Verse broccoli 500g","jumbo",{category:"groente-fruit"})];
 const matched=matchHelloFreshRecipes(data.recipes,promo,"jumbo",t);
 assert.ok(matched.length>=5,"Many real HelloFresh dishes include broccoli");
 assert.ok(matched.length<data.recipes.length);
 for(const e of matched){
   assert.ok(e.matches.length>=1);
   assert.ok(e.matches.every(x=>x.offer.id==="broccoli"));
   assert.ok(e.recipe.ingredients.some(i=>i.key==="broccoli"));
 }
});
