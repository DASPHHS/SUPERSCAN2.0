import test from "node:test";
import assert from "node:assert/strict";
import {
  quantityOf,findProduct,matchStore,compareProduct,compareBasket,
  optimizeTwoStores,isActiveOffer,normalizeOffer,safeUrl
} from "../src/pricing.js";

const stores=[
  {n:"ah",c:"Albert Heijn",u:"https://www.ah.nl",d:[
    {n:"AH Halfvolle melk",s:"1 l",p:1.25,l:"/producten/melk"},
    {n:"AH Volkoren pasta",s:"500 g",p:1.49,l:"/pasta"}]},
  {n:"jumbo",c:"Jumbo",u:"https://www.jumbo.com",d:[
    {n:"Jumbo Halfvolle melk",s:"1 l",p:1.19,l:"/melk"},
    {n:"Jumbo Volkoren pasta",s:"500 g",p:1.65,l:"/pasta"}]},
  {n:"dirk",c:"Dirk",u:"https://www.dirk.nl",d:[
    {n:"Volle melk",s:"1 l",p:1.00,l:"/volle-melk"}]}
];
test("normalizes g, kg, ml and liter into base units",()=>{
  assert.deepEqual(quantityOf("1,5 liter"),{amount:1500,dimension:"ml"});
  assert.deepEqual(quantityOf("500 gr"),{amount:500,dimension:"g"});
  assert.deepEqual(quantityOf("2 x 250 g"),{amount:500,dimension:"g"});
});
test("only matches product tokens and requested quantities",()=>{
  assert.equal(findProduct(stores[0].d,"halfvolle melk 1 liter")?.p,1.25);
  assert.equal(findProduct(stores[0].d,"halfvolle melk 2 liter"),null);
  assert.equal(findProduct(stores[2].d,"halfvolle melk 1 liter"),null);
  assert.equal(findProduct(stores[0].d,"melk")?.p,1.25);
});
test("compares actual matches without invented fallback prices",()=>{
  const rows=compareProduct(stores,"halfvolle melk 1 liter");
  assert.equal(rows[0].store,"Jumbo");
  assert.equal(rows[0].price,1.19);
  assert.equal(rows[2].price,null);
  assert.equal(matchStore(stores[2],"halfvolle melk 1 liter").matched,false);
});
test("shows incomplete baskets as partial, never full totals",()=>{
  const rows=compareBasket(stores,[
    {name:"halfvolle melk",amount:"1 liter",count:2,checked:false},
    {name:"volkoren pasta",amount:"500 g",count:1,checked:false},
    {name:"bananen",amount:"1 kilo",count:1,checked:true}
  ]);
  assert.equal(rows[0].covered,2);
  assert.equal(rows[0].complete,true);
  assert.equal(rows[2].complete,false);
  assert.equal(Number(rows[0].subtotal.toFixed(2)),3.99);
});
test("two-store optimizer chooses only a complete combination",()=>{
  const opt=optimizeTwoStores(stores,[
    {name:"halfvolle melk",amount:"1 liter",count:2},
    {name:"volkoren pasta",amount:"500 g",count:1}
  ]);
  assert.deepEqual(opt.stores.sort(),["Albert Heijn","Jumbo"].sort());
  assert.equal(opt.total,3.87);
  assert.equal(optimizeTwoStores(stores,[{name:"product dat niet bestaat"}]),null);
});
test("only active and in-date promotions are shown",()=>{
  const base={name:"Product",price:2,promotion_status:"active",valid_from:"2026-10-26",valid_until:"2026-11-02"};
  assert.equal(isActiveOffer(base,"2026-11-01"),true);
  assert.equal(isActiveOffer({...base,promotion_status:"upcoming"},"2026-11-01"),false);
  assert.equal(isActiveOffer({...base,promotion_status:"historical"},"2026-11-01"),false);
  assert.equal(isActiveOffer({...base,valid_until:"2026-10-31"},"2026-11-01"),false);
  assert.equal(isActiveOffer({...base,valid_from:"2026-11-02"},"2026-11-01"),false);
});
test("offer normalization and URL sanitation",()=>{
  assert.equal(normalizeOffer({name:"Pasta",retailer:"ah",price:1,original_price:2}).savings,50);
  assert.equal(safeUrl("javascript:alert(1)"),null);
  assert.equal(safeUrl("https://example.org"),"https://example.org/");
});
