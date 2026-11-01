/** Conservative client-side pricing helpers.
 *  Checkjebon original fields: stores {n,c,d,u}, products {n,s,p,l}.
 *  Nothing is inferred when a product or price is absent. */
export function euro(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(value) : "Geen prijs";
}
export function clean(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
const unitRegex = /(\d+(?:[,.]\d+)?)\s*(kilogram|kg|gram|gr|g|milliliter|ml|liter|l)\b/i;
const stopWords = new Set(["de","het","een","van","voor","en","met","per","ongeveer","pak","stuks","stuk","x"]);
export function quantityOf(value) {
  const text = String(value || "").toLowerCase().replace(",",".");
  const m = text.match(unitRegex);
  if (!m) return null;
  let valueNum = Number(m[1]);
  const u = m[2];
  const factor = {kilogram:1000,kg:1000,gram:1,gr:1,g:1,milliliter:1,ml:1,liter:1000,l:1000}[u];
  const dimension = ["kg","kilogram","gram","gr","g"].includes(u) ? "g" : "ml";
  const mult = text.match(new RegExp("(\\d+)\\s*[x×]\\s*"+m[1].replace(".","\\.")+"\\s*"+u+"\\b","i"));
  if(mult) valueNum *= Number(mult[1]);
  return {amount:valueNum * factor,dimension};
}
function tokens(value) {
  const withoutQty = String(value || "").replace(unitRegex," ");
  return clean(withoutQty).split(/\s+/).filter(w=>w && !stopWords.has(w));
}
function sameTerm(candidate,query) {
  if (candidate === query) return true;
  if (query.length>=4 && candidate.startsWith(query)) return true;
  if (query.length>=5 && candidate.startsWith(query.slice(0,-1))) return true; // simple plural
  return false;
}
export function findProduct(products, query) {
  if(!Array.isArray(products) || !query) return null;
  const terms = tokens(query);
  if(!terms.length) return null;
  const requiredQty = quantityOf(query);
  let selected=null, selectedScore=-Infinity;
  for (const p of products) {
    if(!p || typeof p.n!=="string" || !Number.isFinite(p.p) || p.p<=0) continue;
    const names = clean(p.n).split(" ");
    if(!terms.every(t=>names.some(w=>sameTerm(w,t)))) continue;
    const productQty = quantityOf(p.s) || quantityOf(p.n);
    if(requiredQty) {
      if(!productQty || requiredQty.dimension!==productQty.dimension) continue;
      const ratio = productQty.amount/requiredQty.amount;
      if(ratio<.92 || ratio>1.12) continue;
    }
    const n=clean(p.n);
    let score = 100 - Math.abs(names.length-terms.length)*4 - n.length*.09;
    if(n===clean(query)) score+=55;
    if(n.startsWith(clean(query))) score+=20;
    if(requiredQty && productQty) score+=10;
    if(score>selectedScore || (score===selectedScore && p.p<selected.p)){selected=p;selectedScore=score;}
  }
  return selected;
}
export function matchStore(store,query) {
  const p = findProduct(store?.d,query);
  if(!p)return {code:store?.n||"",store:store?.c||"",price:null,matched:false};
  const base=typeof store.u==="string"?store.u:"";
  const link=p.l ? (String(p.l).startsWith("http")?String(p.l):base+String(p.l)) : null;
  return {code:store.n,store:store.c,price:p.p,matched:true,name:p.n,amount:p.s||"",link};
}
export function compareProduct(stores,query) {
  if(!Array.isArray(stores))return [];
  return stores.map(s=>matchStore(s,query)).filter(x=>x.code).sort((a,b)=>{
    if(a.price==null)return 1;if(b.price==null)return -1;return a.price-b.price;
  });
}
export function compareBasket(stores,items) {
  const pending=(items||[]).filter(i=>!i.checked && i.name && Number.isInteger(i.count||1));
  if(!pending.length)return [];
  return (stores||[]).map(s=>{
    let subtotal=0,covered=0;
    const matches=pending.map(item=>{
      const q=item.amount ? item.name+" "+item.amount : item.name;
      const found=matchStore(s,q);
      if(found.matched){covered++;subtotal+=found.price*(item.count||1);}
      return {...found,query:q};
    });
    return {code:s.n,store:s.c,subtotal:Math.round(subtotal*100)/100,covered,expected:pending.length,complete:covered===pending.length,matches};
  }).sort((a,b)=>b.covered-a.covered || a.subtotal-b.subtotal);
}
export function optimizeTwoStores(stores,items) {
  const pending=(items||[]).filter(i=>!i.checked && i.name);
  if(!pending.length || !Array.isArray(stores))return null;
  const perStore=stores.map(s=>({store:s,found:pending.map(i=>matchStore(s,i.amount?i.name+" "+i.amount:i.name))}));
  let best=null;
  for(let i=0;i<perStore.length;i++)for(let j=i;j<perStore.length;j++){
    let total=0;const assignments=[];let covered=0;
    for(let k=0;k<pending.length;k++){
      const matches=[perStore[i].found[k],perStore[j].found[k]].filter(m=>m.matched);
      if(!matches.length)continue;
      matches.sort((a,b)=>a.price-b.price);
      total+=matches[0].price*(pending[k].count||1);
      covered++;
      assignments.push({query:pending[k].name,store:matches[0].store,price:matches[0].price});
    }
    if(covered!==pending.length)continue; // never report a missing item as savings
    const result={total:Math.round(total*100)/100,stores:[perStore[i].store.c,perStore[j].store.c].filter((x,k,a)=>a.indexOf(x)===k),assignments};
    if(!best || result.total<best.total)best=result;
  }
  return best;
}
export function todayNL(date=new Date()) {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Amsterdam",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
export function isActiveOffer(item,today=todayNL()) {
  if(!item || !Number.isFinite(Number(item.price)) || Number(item.price)<=0)return false;
  const status=item.promotion_status || item.status;
  if(status==="historical"||status==="upcoming"||status==="shelf")return false;
  if(item.valid_from && String(item.valid_from).slice(0,10)>today)return false;
  if(item.valid_until && String(item.valid_until).slice(0,10)<today)return false;
  return status==="active" || (Boolean(item.valid_from) && Boolean(item.valid_until));
}
export function normalizeOffer(item) {
  const p=Number(item?.price), original=Number(item?.original_price);
  const pct=Number(item?.savings_percentage);
  const percent=Number.isFinite(pct)&&pct>0?pct:(Number.isFinite(original)&&original>p?(original-p)/original*100:0);
  return {
    id:String(item?.product_id||item?.id||[item?.retailer,item?.name,p].join("-")),
    name:String(item?.name||"").trim(),
    retailer:String(item?.retailer||"").trim(),
    price:Number.isFinite(p)?p:null,
    original:Number.isFinite(original)&&original>p?original:null,
    savings:Math.max(0,Math.round(percent)),
    category:item?.unified_category||item?.category||"",
    valid_from:item?.valid_from||null,
    valid_until:item?.valid_until||null,
    status:item?.promotion_status||item?.status||null,
    quantity:item?.quantity||item?.size||"",
    promo:item?.promotional_keywords||item?.promotion_type||"",
    image:item?.image_url||null,
    source:item?.product_url||null,
    bundleQty:item?.multi_buy_quantity||null,
    bundlePrice:item?.multi_buy_price||null,
    loyalty:item?.loyalty_price||null
  };
}
export function safeUrl(value) {
  if(typeof value!=="string")return null;
  try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.href:null;}catch{return null;}
}
