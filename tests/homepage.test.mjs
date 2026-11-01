import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url),"utf8");
const app = readFileSync(new URL("../src/app.js", import.meta.url),"utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url),"utf8");

test("user lands on recipes before deals or product comparison",()=>{
  const hero=html.indexOf('id="home"');
  const recipes=html.indexOf('id="recepten"');
  const offers=html.indexOf('id="aanbiedingen"');
  const prices=html.indexOf('id="vergelijken"');
  assert.ok(hero>0 && recipes>hero && offers>recipes && prices>offers);
  assert.ok(html.includes("Actie als basis, geen willekeur"));
});
test("all authored static DOM ids unique",()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,"duplicate element ID present");
});
test("recipe-first controls available and old hero handlers removed",()=>{
  for (const id of ["recipe-store","recipe-branch","recipe-search","recipes-grid","recipe-dialog",
    "weekly-status","weekly-range","add-week-to-list","deals-grid","shopping-items"]) {
    assert.ok(html.includes('id="'+id+'"'),"Missing UI control "+id);
  }
  assert.ok(app.includes('buildActionMeals(state.offers,state.recipeStore'));
  assert.ok(!app.includes("hero-search"));
  assert.ok(sw.includes("./src/meal-engine.js"));
});
