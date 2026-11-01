import { RECIPE_RETAILERS, weekBounds } from "./weekly.js";
import { buildActionMeals } from "./meal-engine.js";
import { euro, clean, compareProduct, compareBasket, optimizeTwoStores, isActiveOffer, normalizeOffer, safeUrl, todayNL } from "./pricing.js";

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "superscan-v2-shopping-list";
const RECIPE_STORE_KEY = "superscan-v2-recipe-store";
const RECIPE_BRANCH_KEY = "superscan-v2-recipe-branch";
function savedPreference(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function storePreference(key,value){try{localStorage.setItem(key,value);}catch{}}
const STORES = {
  albert_heijn:"Albert Heijn",ah:"Albert Heijn",jumbo:"Jumbo",aldi:"Aldi",lidl:"Lidl",
  plus:"PLUS",dirk:"Dirk",dekamarkt:"DekaMarkt",hoogvliet:"Hoogvliet",vomar:"Vomar",
  nettorama:"Nettorama",ekoplaza:"Ekoplaza",poiesz:"Poiesz",spar:"SPAR",
  boons_markt:"Boon's Markt",gewoon_coop:"Coop",mcd:"MCD",picnic:"Picnic"
};
const state = {
  offers:[],stores:[],list:readList(),dealQuery:"",dealStore:"all",dealSort:"discount",
  diet:"alles",recipeQuery:"",activeRecipe:null,activeWeeklyEntry:null,weekMenu:[],servings:2,
  recipeWeek:"now",offerType:"all",sourceUpdatedAt:null,
  recipeStore:savedPreference(RECIPE_STORE_KEY,"albert_heijn"),
  recipeBranch:savedPreference(RECIPE_BRANCH_KEY,"")
};
let toastTimer;
function html(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function storeLabel(value){return STORES[value] || String(value||"Onbekend").replaceAll("_"," ");}
function updateStamp(raw){
  if(!raw)return "Nog geen bronupdate";
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return "Brondatum onbekend";
  return new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(d);
}
function msg(title,body) {
  return '<div class="empty-state"><span aria-hidden="true">◎</span><strong>'+html(title)+'</strong><p>'+html(body)+'</p></div>';
}
function showToast(message) {
  const el=$("#toast");el.textContent=message;el.classList.add("visible");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("visible"),3400);
}
function readList(){
  try{
    const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    if(!Array.isArray(arr))return [];
    return arr.slice(0,300).filter(v=>v && typeof v.name==="string" && v.name.trim()).map(v=>({
      id:String(v.id||Math.random().toString(36).slice(2)),name:v.name.trim().slice(0,120),
      amount:typeof v.amount==="string"?v.amount.slice(0,40):"",
      count:Math.min(50,Math.max(1,Number(v.count)||1)),checked:Boolean(v.checked)
    }));
  }catch{return [];}
}
function saveList(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.list));$("#list-storage-status").textContent="Op dit apparaat opgeslagen";}
  catch{$("#list-storage-status").textContent="Opslag niet beschikbaar — exporteer je lijst";showToast("Lokaal bewaren lukt niet. Maak een export als back-up.");}
  renderList();
}
function splitItem(raw) {
  const value=String(raw||"").trim();
  const comma=value.match(/^(.+?),\s*(\d+(?:[.,]\d+)?\s*(?:kg|g|gram|liter|l|ml|stuks?|pakken?))$/i);
  if(comma)return {name:comma[1].trim(),amount:comma[2].trim()};
  const leading=value.match(/^(\d+(?:[.,]\d+)?\s*(?:kg|g|gram|liter|l|ml|stuks?|pakken?))\s+(.+)$/i);
  if(leading)return {name:leading[2].trim(),amount:leading[1].trim()};
  return {name:value,amount:""};
}
function addItem(name,amount="",announce=true) {
  const text=String(name||"").trim();
  if(!text)return;
  const p=amount?{name:text,amount:String(amount)}:splitItem(text);
  if(!p.name)return;
  const old=state.list.find(x=>clean(x.name)===clean(p.name) && clean(x.amount)===clean(p.amount) && !x.checked);
  if(old){old.count=Math.min(50,old.count+1);}
  else if(state.list.length<300)state.list.push({id:String(Date.now())+Math.random().toString(36).slice(2),name:p.name.slice(0,120),amount:p.amount.slice(0,40),count:1,checked:false});
  else{showToast("Maximaal 300 producten per lijst.");return;}
  saveList();if(announce)showToast(p.name+" toegevoegd aan je lijst.");
}
function listForComparison(){return state.list.filter(x=>!x.checked);}
function updateCheckjebonLink(){
  const lines=listForComparison().map(i=>(i.name+" "+i.amount).trim());
  $("#checkjebon-link").href="https://www.checkjebon.nl/#"+encodeURIComponent(lines.join("\n"));
}
function renderList(){
  $("#nav-count").textContent=String(state.list.filter(x=>!x.checked).reduce((n,x)=>n+x.count,0));
  const done=state.list.filter(x=>x.checked).length;
  $("#list-progress").textContent=state.list.length ? done+" van "+state.list.length+" afgevinkt" : "Je lijst is nog leeg";
  const el=$("#shopping-items");
  if(!state.list.length)el.innerHTML='<li class="list-empty">Nog geen boodschappen. Voeg een product toe of kies ingrediënten uit een recept.</li>';
  else el.innerHTML=state.list.map(i=>
    '<li class="shopping-item'+(i.checked?' is-done':'')+'">'+
    '<label><input type="checkbox" data-check="'+html(i.id)+'" '+(i.checked?'checked':'')+' aria-label="'+html(i.name)+' afvinken"><span class="item-name">'+html(i.name)+(i.count>1?" ×"+i.count:"")+'</span></label>'+
    (i.amount?'<span class="item-qty">'+html(i.amount)+'</span>':"")+
    '<button type="button" class="remove-item" data-remove="'+html(i.id)+'" aria-label="'+html(i.name)+' verwijderen">×</button></li>').join("");
  updateCheckjebonLink();
}
function iconForOffer(o) {
  const c=clean(o.name+" "+o.category);
  if(/koffie|espresso|thee/.test(c))return "☕";
  if(/melk|yoghurt|kwark|kaas/.test(c))return "🥛";
  if(/brood|bolletje|crackers/.test(c))return "🍞";
  if(/pasta|spaghetti|macaroni/.test(c))return "🍝";
  if(/banaan|appel|fruit|aardbei/.test(c))return "🍎";
  if(/tomaat|broccoli|groente|paprika/.test(c))return "🥦";
  if(/kip|vlees|filet/.test(c))return "🍗";
  if(/rijst|havermout|muesli/.test(c))return "🌾";
  if(/chocolade|koek|snoep/.test(c))return "🍫";
  if(/wasmiddel|shampoo|zeep/.test(c))return "🧴";
  return "🛒";
}
function renderStoreFilter(){
  const values=[...new Set(state.offers.map(o=>o.retailer).filter(Boolean))].sort((a,b)=>storeLabel(a).localeCompare(storeLabel(b),"nl"));
  $("#store-filter").innerHTML='<option value="all">Alle supermarkten</option>'+values.map(v=>'<option value="'+html(v)+'">'+html(storeLabel(v))+'</option>').join("");
}
function renderDeals(){
  const el=$("#deals-grid"),q=clean(state.dealQuery);
  let offers=state.offers.filter(o=>isActiveOffer({...o,price:o.price,promotion_status:o.status},todayNL()) && o.name);
  if(state.dealStore!=="all")offers=offers.filter(o=>o.retailer===state.dealStore);
  if(q)offers=offers.filter(o=>clean(o.name+" "+o.category+" "+storeLabel(o.retailer)).includes(q));
  if(state.offerType==="bundle")offers=offers.filter(o=>Number(o.bundleQty)>=2);
  else if(state.offerType==="loyalty")offers=offers.filter(o=>Number(o.loyalty)>0);
  else if(state.offerType==="single")offers=offers.filter(o=>!(Number(o.bundleQty)>=2)&&!(Number(o.loyalty)>0));
  if(state.dealSort==="discount")offers.sort((a,b)=>b.savings-a.savings || a.price-b.price);
  else if(state.dealSort==="price")offers.sort((a,b)=>a.price-b.price);
  else offers.sort((a,b)=>String(a.valid_until||"9999").localeCompare(String(b.valid_until||"9999")));
  $("#deals-count").textContent=offers.length+" lopende aanbiedingen getoond · Niet iedere winkelactie is in de bron beschikbaar.";
  if(!state.offers.length){
    el.innerHTML=msg("Nog geen aanbiedingen beschikbaar","De automatische bronsynchronisatie heeft nog geen actuele data aangeleverd. Probeer het later opnieuw of bezoek PrijsProfeet.");
    return;
  }
  if(!offers.length){el.innerHTML=msg("Geen lopende deals gevonden","Probeer een andere zoekterm of supermarkt. Verlopen en toekomstige acties worden verborgen.");return;}
  el.innerHTML=offers.slice(0,72).map((o,index)=>{
    const bundle=o.bundleQty && o.bundlePrice ? " · "+o.bundleQty+" voor "+euro(Number(o.bundlePrice)) : "";
    const until=o.valid_until?"Geldig t/m "+html(String(o.valid_until).slice(0,10)):"Actie bevestigd";
    const note=o.loyalty?" · Ledenprijs apart": "";
    const tone=["","pink","blue","lavender"][index%4];
    return '<article class="deal-card"><div class="deal-art" data-tone="'+tone+'">'+
      (o.savings>0?'<span class="discount-badge">-'+o.savings+'%</span>':'')+
      '<span class="deal-store">'+html(storeLabel(o.retailer))+'</span><span class="deal-symbol" aria-hidden="true">'+iconForOffer(o)+'</span></div>'+
      '<div class="deal-body"><div class="deal-category">'+html(o.category||"Aanbieding")+'</div>'+
      '<h3>'+html(o.name)+'</h3><div class="deal-price"><strong>'+euro(o.price)+'</strong>'+
      (o.original?'<span class="old-price">'+euro(o.original)+'</span>':'')+'</div>'+
      '<p class="deal-meta">'+until+html(bundle+note)+'</p>'+
      '<button class="deal-add" data-add-offer="'+html(o.id)+'" type="button">+ Voeg toe aan mijn lijst</button></div></article>';
  }).join("");
}
function renderCompare(query) {
  const el=$("#compare-results");const q=String(query||"").trim();
  if(!q){el.innerHTML=msg("Voer een product in","Zoek op een productnaam en eventueel de hoeveelheid.");return;}
  if(!state.stores.length){
    el.innerHTML=msg("Prijsgegevens niet beschikbaar","De dagelijkse Checkjebon-dataset is nog niet geladen. Je kunt je lijst wel extern vergelijken.");
    return;
  }
  const rows=compareProduct(state.stores,q), found=rows.filter(r=>r.matched), best=found[0];
  if(!found.length){el.innerHTML=msg("Geen passende producten gevonden","Maak de zoekterm specifieker of probeer een andere hoeveelheid. Er worden geen prijzen geschat.");return;}
  el.innerHTML='<p class="price-notice">'+found.length+' winkel(s) met een naam- en eventueel verpakkingsmatch. Vergelijk productnaam en inhoud zelf voordat je koopt.</p>'+
    '<div class="price-list">'+rows.map(r=>'<div class="price-row'+(r===best?' best':'')+'">'+
    '<div class="price-row-head"><strong>'+html(r.store)+'</strong>'+(r===best?'<span class="best-tag">Laagste gevonden prijs</span>':'')+'</div>'+
    '<div class="price-row-price'+(!r.matched?' empty':'')+'">'+(r.matched?euro(r.price):"Niet gevonden")+'</div>'+
    (r.matched?'<small>'+html(r.name)+(r.amount?' · '+html(r.amount):'')+'</small>':'<small>Geen betrouwbare match bij deze winkel</small>')+
    (safeUrl(r.link)?'<a href="'+html(safeUrl(r.link))+'" target="_blank" rel="noopener noreferrer">Bekijk product ↗</a>':"")+'</div>').join("")+'</div>'+
    '<p class="price-notice">Bron: Checkjebon. Prijs per gevonden verpakking, geen gegarandeerd identiek product. Filiaalprijzen kunnen afwijken; eventuele kortingen uit PrijsProfeet zijn hier niet automatisch meegerekend.</p>';
}
function renderBasket(){
  const el=$("#basket-results"),pending=listForComparison();
  if(!pending.length){el.innerHTML="<p>Voeg niet-afgevinkte producten toe om je mandje te vergelijken.</p>";return;}
  if(!state.stores.length){el.innerHTML='<p>De prijsdataset is nog niet beschikbaar. Exporteer je lijst of open hem bij Checkjebon via de link hieronder.</p>';return;}
  const rows=compareBasket(state.stores,pending);
  const full=rows.filter(r=>r.complete);
  const selection=full.length?full.slice(0,5):rows.slice(0,5);
  if(!selection.length){el.innerHTML="<p>Er zijn nog geen winkelprijzen gevonden.</p>";return;}
  el.innerHTML='<p class="coverage">'+(full.length?"Volledig gevonden bij "+full.length+" winkel(s).":"Geen winkel heeft voor alle producten een passende match; hieronder staan alleen deelsommen.")+'</p>'+
  selection.map(r=>'<div class="basket-row"><span>'+html(r.store)+' <small>('+r.covered+'/'+r.expected+')</small></span><strong>'+(r.complete?euro(r.subtotal):'Deelsom '+euro(r.subtotal))+'</strong></div>').join("");
  const optimum=optimizeTwoStores(state.stores,pending);
  if(optimum && full.length && optimum.stores.length===2 && optimum.total<full[0].subtotal-.01){
    el.innerHTML+='<p class="coverage">Indicatief bij 2 winkels: <strong>'+euro(optimum.total)+'</strong> ('+html(optimum.stores.join(" + "))+'). Mogelijk verschil: '+euro(full[0].subtotal-optimum.total)+'. Geen reis- of tijdkosten inbegrepen.</p>';
  }
  el.innerHTML+='<p class="coverage">Naam-matches en kassaprijzen kunnen afwijken. Alleen gevonden producten tellen mee, nooit kunstmatig geschatte prijzen.</p>';
}
function filteredRecipes(){
  const q=clean(state.recipeQuery);
  return state.weekMenu.filter(entry=>{
    const r=entry.recipe, diet=state.diet;
    if(diet==="vegetarisch" && !["vegetarisch","vegan"].includes(r.diet))return false;
    if(diet==="vegan" && !r.vegan)return false;
    if(["vis","kip","rund","varken"].includes(diet) && r.diet!==diet)return false;
    if(diet==="snel" && r.minutes>30)return false;
    const description=r.title+" "+r.description+" "+r.category+" "+
      r.ingredients.map(i=>i[0]).join(" ")+" "+
      entry.matches.map(m=>m.offer.name).join(" ");
    return !q || clean(description).includes(q);
  });
}
function weeklyStoreLabel(){
  return RECIPE_RETAILERS.find(x=>x.code===state.recipeStore)?.name || "de gekozen supermarkt";
}
function showBranchNotice(){
  const chain=RECIPE_RETAILERS.find(x=>x.code===state.recipeStore);
  const location=state.recipeBranch.trim();
  $("#weekly-branch-notice").textContent=(location?
    "Voorkeursvestiging: "+location+". ":"")+
    "Deze aanbiedingen gelden volgens de bron op ketenniveau voor "+chain.name+
    ". Specifieke filiaalprijzen en beschikbaarheid zijn niet gecontroleerd. Controleer ze bij jouw vestiging.";
}
function renderRecipes(){
  const el=$("#recipes-grid");
  const list=filteredRecipes();
  const range=weekBounds();
  if(state.recipeWeek==="next"){
    const shift=s=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10);};
    range.start=shift(range.start);range.end=shift(range.end);
  }
  const fmtDate=s=>new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",timeZone:"UTC"})
    .format(new Date(s+"T12:00:00Z"));
  $("#weekly-range").textContent=(state.recipeWeek==="next"?"Volgende week ":"Deze week ")+fmtDate(range.start)+" – "+fmtDate(range.end);
  document.querySelectorAll("[data-recipe-week]").forEach(b=>{
    const active=b.dataset.recipeWeek===state.recipeWeek;
    b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));
  });
  $("#recipe-source-stamp").textContent=state.sourceUpdatedAt
    ?"Aanbiedingen via PrijsProfeet (SpecialeDeals) · bron bijgewerkt "+updateStamp(state.sourceUpdatedAt)+" · ketenaanbiedingen"
    :"Nog geen bijgewerkte aanbiedingsgegevens beschikbaar";
  $("#recipe-store").value=state.recipeStore;
  $("#recipe-branch").value=state.recipeBranch;
  showBranchNotice();
  $("#add-week-to-list").disabled=!list.length;
  const chain=weeklyStoreLabel();
  $("#weekly-status").textContent=state.offers.length
    ? state.weekMenu.length+" maaltijden op basis van "+(state.recipeWeek==="next"?"aangekondigde":"lopende")+" acties bij "+chain+" · "+list.length+" na filters"
    : "Nog geen actuele aanbiedingsdata geladen: er worden geen willekeurige recepten getoond.";
  if(!state.weekMenu.length){
    el.innerHTML=msg("Geen bewezen actierecepten voor "+chain,
      "Er is voor deze week geen passend, gecontroleerd hoofdingrediënt gevonden. Probeer een andere supermarkt of week. We tonen geen willekeurige recepten.");
    return;
  }
  if(!list.length){
    el.innerHTML=msg("Geen actierecepten binnen deze filters",
      "Verwijder een filter om de andere bewezen actie-recepten te bekijken.");
    return;
  }
  el.innerHTML=list.map(entry=>{
    const r=entry.recipe;
    const promo=entry.matches.slice(0,2).map(match=>
      '<div class="weekly-deal-line"><span class="weekly-deal-check">✓</span>'+
      '<span><strong>'+html(match.ingredient)+'</strong> · '+html(match.offer.name)+'</span>'+
      '<b>'+euro(match.offer.price)+'</b></div>').join("");
    const extra=entry.matches.length>2?'<small>+ '+(entry.matches.length-2)+' andere actie-ingrediënten</small>':"";
    return '<article class="recipe-card weekly-recipe-card"><div class="recipe-art '+html(r.tone)+
      '"><span class="plate" aria-hidden="true">'+r.emoji+
      '</span><span class="time-tag">◷ '+r.minutes+' min</span></div>'+
      '<div class="recipe-body"><div class="recipe-kicker">'+html(chain)+' · '+html(r.category)+'</div>'+
      '<h3>'+html(r.title)+'</h3><p>'+html(r.description)+'</p>'+
      '<div class="weekly-match-count">'+entry.matches.length+' gecontroleerde actie'+
      (entry.matches.length===1?"-ingrediënt":"-ingrediënten")+'</div>'+
      '<div class="weekly-deal-list">'+promo+extra+'</div>'+
      '<div class="recipe-footer"><span>2 personen · data volgens bron</span>'+
      '<button data-recipe="'+html(r.id)+'" type="button">Bekijk actie & recept ↗</button></div>'+
      '</div></article>';
  }).join("");
}
function updateWeeklyMenu(){
  state.weekMenu=buildActionMeals(state.offers,state.recipeStore,todayNL(),7,state.recipeWeek);
  renderRecipes();
}
function qtyText(q) {return new Intl.NumberFormat("nl-NL",{maximumFractionDigits:1}).format(q);}
function openRecipe(id) {
  const entry=state.weekMenu.find(item=>item.recipe.id===id);
  if(!entry)return; // Never open a recipe without verified active offer evidence.
  state.activeWeeklyEntry=entry;
  state.activeRecipe=entry.recipe;state.servings=2;renderRecipeDialog();
  const dialog=$("#recipe-dialog");
  if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
}
function addWeeklyIngredients(){
  const chosen=filteredRecipes();
  if(!chosen.length){showToast("Geen bewezen recepten geselecteerd.");return;}
  const aggregated=new Map();
  for(const entry of chosen)for(const [name,amount,unit] of entry.recipe.ingredients){
    const key=clean(name)+"|"+unit;
    if(!aggregated.has(key))aggregated.set(key,{name,amount:0,unit});
    aggregated.get(key).amount+=amount;
  }
  for(const ingredient of aggregated.values()){
    addItem(ingredient.name,qtyText(ingredient.amount)+" "+ingredient.unit,false);
  }
  showToast(aggregated.size+" gecombineerde ingrediënten voor "+chosen.length+" actierecepten toegevoegd.");
}
function renderRecipeDialog(){
  const r=state.activeRecipe,entry=state.activeWeeklyEntry;
  if(!r||!entry)return;
  const factor=state.servings/r.servings;
  const dealLines=entry.matches.map(m=>{
    const o=m.offer;
    const link=safeUrl(o.source);
    return '<li><strong>'+html(m.ingredient)+'</strong>: '+html(o.name)+
      ' — <b>'+euro(o.price)+'</b>'+
      (o.savings?(' ('+Math.round(o.savings)+'% korting)'):'')+
      (o.valid_from?' · vanaf '+html(String(o.valid_from).slice(0,10)):'')+
      (o.valid_until?' · t/m '+html(String(o.valid_until).slice(0,10)):'')+
      (o.bundleQty&&o.bundlePrice?' · '+html(String(o.bundleQty))+' voor '+euro(Number(o.bundlePrice)):'')+
      (o.loyalty?' · eventuele ledenprijs geldt apart':'')+
      (link?' <a target="_blank" rel="noopener noreferrer" href="'+html(link)+'">Bekijk product ↗</a>':'')+
      '</li>';
  }).join("");
  $("#recipe-dialog-content").innerHTML='<div class="dialog-top"><span class="recipe-icon">'+r.emoji+'</span>'+
    '<div class="eyebrow">ACTIERECEPT · '+html(weeklyStoreLabel())+'</div>'+
    '<h2 id="recipe-dialog-title">'+html(r.title)+'</h2>'+
    '<p>◷ '+r.minutes+' min · '+html(r.description)+'</p></div>'+
    '<div class="dialog-content"><div class="servings-bar"><span>Hoeveel personen?</span>'+
    '<div class="servings-picker"><button type="button" data-serve="-2" aria-label="Minder personen">−</button>'+
    '<strong>'+state.servings+' personen</strong>'+
    '<button type="button" data-serve="2" aria-label="Meer personen">+</button></div></div>'+
    '<div class="weekly-evidence"><h3>Deze ingrediënten zijn écht in de aanbieding</h3>'+
    '<ul>'+dealLines+'</ul><small>Bron: <a href="https://www.prijsprofeet.nl" target="_blank" rel="noopener noreferrer">PrijsProfeet ↗</a>. Prijzen zijn per aangeboden verpakking, niet per benodigde recepthoeveelheid. Ketenacties zijn niet op filiaalniveau bevestigd.</small></div>'+
    '<h3>Alle ingrediënten ('+state.servings+' personen)</h3><ul class="ingredient-list">'+r.ingredients.map(i=>
      '<li><span>'+qtyText(i[1]*factor)+' '+html(i[2])+'</span> '+html(i[0])+'</li>').join("")+'</ul>'+
    '<h3>Zo maak je het</h3><ol class="method-list">'+r.steps.map(s=>'<li>'+html(s)+'</li>').join("")+'</ol>'+
    '<div class="dialog-bottom"><button type="button" class="btn btn-lime" id="add-recipe-ingredients">+ Voeg alle ingrediënten toe</button>'+
    '<p>Allergenen: '+html(r.allergens)+' Controleer etiketten, verpakkingsmaten en jouw dieetbehoeften.</p></div></div>';
}
async function loadData(){
  const load=async path=>{
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)throw Error("HTTP "+response.status);
    return response.json();
  };
  await Promise.allSettled([
    (async()=>{
      try{
        const x=await load("./data/deals.json");
        state.offers=(Array.isArray(x.offers)?x.offers:[]).map(normalizeOffer)
          .filter(o=>o.name && o.retailer && Number.isFinite(o.price));
        state.sourceUpdatedAt=x.sourceUpdatedAt||x.generatedAt||null;
        $("#deals-updated").textContent=state.sourceUpdatedAt?"Bijgewerkt "+updateStamp(state.sourceUpdatedAt):"Wacht op eerste datasynchronisatie";
        renderStoreFilter();renderDeals();updateWeeklyMenu();
      }catch(e){$("#deals-updated").textContent="Bron tijdelijk niet bereikbaar";renderDeals();updateWeeklyMenu();}
    })(),
    (async()=>{
      try{
        const x=await load("./data/prices.json");
        state.stores=(Array.isArray(x)?x:x.stores||[]).filter(s=>s && s.n && s.c && Array.isArray(s.d));
        $("#prices-updated").textContent=state.stores.length?
          "Checkjebon-prijsdata opgehaald "+updateStamp(x.fetchedAt)+" · Zoekresultaten zijn indicatieve productmatches; eventuele aanbiedingen worden niet verrekend.":
          "Wacht op de eerste prijssynchronisatie. Je kunt al wel een lijst maken en exporteren.";
        if($("#compare-query").value.trim())renderCompare($("#compare-query").value);
      }catch(e){$("#prices-updated").textContent="Prijssynchronisatie tijdelijk niet beschikbaar; bestaande lijsten en recepten blijven werken.";}
    })()
  ]);
}
function setupEvents(){
  $("#deals-search").addEventListener("input",e=>{state.dealQuery=e.target.value;renderDeals();});
  $("#store-filter").addEventListener("change",e=>{state.dealStore=e.target.value;renderDeals();});
  $("#deals-sort").addEventListener("change",e=>{state.dealSort=e.target.value;renderDeals();});
  $("#offer-type").addEventListener("change",e=>{state.offerType=e.target.value;renderDeals();});
  $("#compare-form").addEventListener("submit",e=>{e.preventDefault();renderCompare($("#compare-query").value);});
  document.querySelectorAll("[data-diet]").forEach(b=>b.addEventListener("click",()=>{
    state.diet=b.dataset.diet;
    document.querySelectorAll("[data-diet]").forEach(x=>{x.classList.toggle("is-active",x===b);x.setAttribute("aria-pressed",String(x===b));});
    renderRecipes();
  }));
  $("#recipe-search").addEventListener("input",e=>{state.recipeQuery=e.target.value;renderRecipes();});
  document.querySelectorAll("[data-recipe-week]").forEach(b=>b.addEventListener("click",()=>{
    state.recipeWeek=b.dataset.recipeWeek;
    updateWeeklyMenu();
  }));
  $("#recipe-store").addEventListener("change",e=>{
    if(!RECIPE_RETAILERS.some(x=>x.code===e.target.value))return;
    state.recipeStore=e.target.value;state.recipeBranch="";storePreference(RECIPE_STORE_KEY,state.recipeStore);
    storePreference(RECIPE_BRANCH_KEY,"");updateWeeklyMenu();
  });
  $("#recipe-branch").addEventListener("change",e=>{
    state.recipeBranch=e.target.value.trim().slice(0,110);
    storePreference(RECIPE_BRANCH_KEY,state.recipeBranch);
    showBranchNotice();
  });
  $("#add-week-to-list").addEventListener("click",addWeeklyIngredients);
  $("#add-item-form").addEventListener("submit",e=>{e.preventDefault();addItem($("#list-item-input").value);$("#list-item-input").value="";$("#list-item-input").focus();});
  $("#shopping-items").addEventListener("change",e=>{
    const id=e.target.dataset.check;if(!id)return;
    const i=state.list.find(x=>x.id===id);if(i){i.checked=e.target.checked;saveList();}
  });
  $("#shopping-items").addEventListener("click",e=>{
    const b=e.target.closest("[data-remove]");if(!b)return;
    state.list=state.list.filter(x=>x.id!==b.dataset.remove);saveList();
  });
  $("#clear-checked").addEventListener("click",()=>{
    const before=state.list.length;state.list=state.list.filter(x=>!x.checked);saveList();
    showToast((before-state.list.length)+" afgevinkte producten verwijderd.");
  });
  $("#reset-list").addEventListener("click",()=>{
    if(!state.list.length)return;
    if(confirm("Weet je zeker dat je de hele boodschappenlijst wilt wissen?")){state.list=[];saveList();showToast("Lijst leeggemaakt.");}
  });
  $("#basket-compare").addEventListener("click",()=>renderBasket());
  $("#export-list").addEventListener("click",()=>{
    const payload=JSON.stringify({version:2,exportedAt:new Date().toISOString(),items:state.list},null,2);
    const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="superscan-boodschappenlijst.json";
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast("Je boodschappenlijst is geëxporteerd.");
  });
  $("#import-list").addEventListener("click",()=>$("#import-file").click());
  $("#import-file").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>200000)throw Error("Bestand is te groot");
      const value=JSON.parse(await file.text());
      const items=Array.isArray(value)?value:value.items;
      if(!Array.isArray(items))throw Error("Geen geldige boodschappenlijst");
      if(state.list.length && !confirm("Vervang de huidige boodschappenlijst door de geïmporteerde lijst?"))return;
      const valid=items.slice(0,300).filter(i=>i&&typeof i.name==="string"&&i.name.trim()).map(i=>({
        id:String(Date.now())+Math.random().toString(36).slice(2),name:i.name.slice(0,120),
        amount:typeof i.amount==="string"?i.amount.slice(0,40):"",count:Math.min(50,Math.max(1,Math.floor(Number(i.count)||1))),checked:Boolean(i.checked)
      }));
      state.list=valid;saveList();showToast(valid.length+" producten geïmporteerd.");
    }catch{showToast("Dit bestand is geen geldige SuperScan-boodschappenlijst.");}
    finally{e.target.value="";}
  });
  $("#deals-grid").addEventListener("click",e=>{
    const b=e.target.closest("[data-add-offer]");if(!b)return;
    const o=state.offers.find(x=>x.id===b.dataset.addOffer);
    if(o)addItem(o.name);
  });
  $("#recipes-grid").addEventListener("click",e=>{
    const b=e.target.closest("[data-recipe]");if(b)openRecipe(b.dataset.recipe);
  });
  $("#recipe-dialog-content").addEventListener("click",e=>{
    const s=e.target.closest("[data-serve]");
    if(s){state.servings=Math.min(8,Math.max(2,state.servings+Number(s.dataset.serve)));renderRecipeDialog();return;}
    if(e.target.closest("#add-recipe-ingredients") && state.activeRecipe){
      const multiplier=state.servings/state.activeRecipe.servings;
      for(const i of state.activeRecipe.ingredients)addItem(i[0],qtyText(i[1]*multiplier)+" "+i[2],false);
      showToast(state.activeRecipe.ingredients.length+" ingrediënten toegevoegd.");
      $("#recipe-dialog").close();
    }
  });
  $("#recipe-close").addEventListener("click",()=>$("#recipe-dialog").close());
  $("#recipe-dialog").addEventListener("click",e=>{if(e.target===$("#recipe-dialog"))$("#recipe-dialog").close();});
}
function boot(){
  $("#year").textContent=new Date().getFullYear();
  if(!RECIPE_RETAILERS.some(x=>x.code===state.recipeStore))state.recipeStore="albert_heijn";
  renderList();renderRecipes();setupEvents();loadData();
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
boot();
