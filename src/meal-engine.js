/**
 * Build coherent dinner recipes FROM verified offer ingredients.
 *
 * Dish formats are reviewed, original cooking methods. Only their explicitly
 * permitted ingredient slots vary. A meal is offered only when >=2 distinct
 * real promotional products fit food-safe slots; nothing is randomized.
 *
 * Does NOT imply that every ingredient is discounted, that the shown package
 * price equals a recipe portion, or that national chain prices are local.
 */
import { matchesRecipeIngredient, RECIPE_RETAILERS, weekBounds } from "./weekly.js";
import { clean, isActiveOffer, todayNL } from "./pricing.js";

const VEG = Object.freeze([
  {key:"rode paprika",label:"paprika",unit:"g",amount:200,roles:["oven","pasta","wok","curry","wrap","salad","shakshuka"]},
  {key:"courgette",label:"courgette",unit:"g",amount:260,roles:["oven","pasta","wok","curry","bowl","shakshuka","soup"]},
  {key:"broccoli",label:"broccoli",unit:"g",amount:300,roles:["oven","pasta","wok","curry","bowl","soup"]},
  {key:"wortel",label:"wortel",unit:"g",amount:250,roles:["oven","wok","curry","bowl","wrap","soup"]},
  {key:"verse spinazie",label:"spinazie",unit:"g",amount:250,roles:["pasta","wok","curry","shakshuka","soup"]},
  {key:"kastanjechampignons",label:"champignons",unit:"g",amount:250,roles:["pasta","wok","oven","shakshuka"]},
  {key:"cherrytomaten",label:"cherrytomaten",unit:"g",amount:250,roles:["pasta","bowl","wrap","salad","shakshuka"]},
  {key:"komkommer",label:"komkommer",unit:"g",amount:250,roles:["wrap","salad"]},
  {key:"avocado",label:"avocado",unit:"stuk",amount:1,roles:["wrap","salad"]},
  {key:"romainesla",label:"romainesla",unit:"g",amount:180,roles:["wrap","salad"]},
  {key:"pompoenblokjes",label:"pompoen",unit:"g",amount:350,roles:["oven","curry","bowl","soup"]},
  {key:"aubergine",label:"aubergine",unit:"g",amount:300,roles:["oven","pasta","bowl"]},
  {key:"prei",label:"prei",unit:"g",amount:270,roles:["oven","wok","soup","shakshuka"]},
  {key:"gele paprika",label:"gele paprika",unit:"g",amount:200,roles:["oven","pasta","wok","curry","wrap","salad","shakshuka"]},
  {key:"rode ui",label:"rode ui",unit:"stuk",amount:1,roles:["oven","wrap","salad"]}
]);

const PROTEINS = Object.freeze([
  {key:"kipfilet",label:"kipfilet",unit:"g",amount:280,kind:"chicken"},
  {key:"kipdijfilet",label:"kipdijfilet",unit:"g",amount:300,kind:"chicken"},
  {key:"kipdrumsticks",label:"kipdrumsticks",unit:"g",amount:650,kind:"chicken"},
  {key:"rundergehakt",label:"rundergehakt",unit:"g",amount:250,kind:"beef"},
  {key:"biefstuk",label:"biefstuk",unit:"g",amount:260,kind:"beef"},
  {key:"runderreepjes",label:"runderreepjes",unit:"g",amount:250,kind:"beef"},
  {key:"varkenshaas",label:"varkenshaas",unit:"g",amount:270,kind:"pork"},
  {key:"varkensfiletlapjes",label:"varkensfiletlapjes",unit:"g",amount:270,kind:"pork"},
  {key:"zalmfilet",label:"zalmfilet",unit:"g",amount:230,kind:"fish"},
  {key:"kabeljauwfilet",label:"kabeljauwfilet",unit:"g",amount:250,kind:"fish"}
]);

const STAPLE_DEALS = Object.freeze([
  {key:"volkoren pasta",formats:["pasta"]},
  {key:"zilvervliesrijst",formats:["wok","curry"]},
  {key:"kikkererwten",formats:["oven","curry","bowl","salad"]},
  {key:"kidneybonen",formats:["wrap"]},
  {key:"volkoren wraps",formats:["wrap"]},
  {key:"volkoren couscous",formats:["bowl","salad"]},
  {key:"eieren",formats:["shakshuka"]},
  {key:"linzen uit blik",formats:["soup"]},
  {key:"tomatenblokjes",formats:["soup","shakshuka","curry"]},
]);

const FORMATS = Object.freeze([
  {
    id:"oven",label:"Ovenmaaltijd",emoji:"🥘",tone:"tone-orange",minutes:40,
    prefix:"Oventray met",diet:"vegan",vegan:true,
    base:[["kikkererwten (uitgelekt)",240,"g"],["vastkokende aardappelen",350,"g"],["olijfolie",1,"el"],["rozemarijn",1,"tl"]],
    steps:(a,b)=>[
      "Verwarm de oven voor op 200 °C. Snijd de aardappelen klein en rooster ze 10 minuten met een beetje olijfolie.",
      "Snijd de "+a+" en "+b+" in hapklare stukken. Spoel de kikkererwten af.",
      "Schep alle groenten en kikkererwten met rozemarijn en de rest van de olie om en voeg toe aan de bakplaat.",
      "Rooster ongeveer 25 minuten en controleer of aardappelen en groenten gaar zijn. Serveer direct."
    ],
    allergens:"Controleer de verpakkingen op allergenen."
  },
  {
    id:"pasta",label:"Volkoren pasta",emoji:"🍝",tone:"tone-pink",minutes:30,
    prefix:"Volkoren pasta met",diet:"vegan",vegan:true,
    base:[["volkoren pasta",150,"g"],["tomatenpassata zonder zout",300,"g"],["kikkererwten (uitgelekt)",200,"g"],["olijfolie",1,"el"],["oregano",1,"tl"]],
    steps:(a,b)=>[
      "Kook de volkoren pasta volgens de verpakking.",
      "Snijd de "+a+" en "+b+" in kleine stukken. Bak in de olijfolie tot de groenten beetgaar zijn.",
      "Voeg de passata en afgespoelde kikkererwten toe en laat zachtjes 8 tot 10 minuten sudderen.",
      "Breng op smaak met oregano en peper. Meng met de pasta en serveer."
    ],
    allergens:"Gluten (volkoren pasta); controleer andere verpakkingen."
  },
  {
    id:"wok",label:"Roerbak",emoji:"🥡",tone:"tone-blue",minutes:30,
    prefix:"Groentewok met",diet:"vegan",vegan:true,
    base:[["stevige tofu",250,"g"],["zilvervliesrijst",150,"g"],["natriumarme sojasaus",1,"el"],["zonnebloemolie",1,"el"],["gember",15,"g"]],
    steps:(a,b)=>[
      "Kook de zilvervliesrijst volgens de verpakking.",
      "Dep tofu goed droog, snijd in blokjes en bak goudbruin in een beetje olie.",
      "Snijd "+a+" en "+b+" klein. Bak eerst harde groenten beetgaar en voeg bladgroenten pas op het eind toe.",
      "Doe gember, tofu en een kleine hoeveelheid natriumarme sojasaus erbij. Serveer met rijst."
    ],
    allergens:"Soja; mogelijk gluten in sojasaus. Controleer etiketten."
  },
  {
    id:"curry",label:"Plantaardige curry",emoji:"🍛",tone:"tone-gold",minutes:35,
    prefix:"Kikkererwtencurry met",diet:"vegan",vegan:true,
    base:[["kikkererwten (uitgelekt)",240,"g"],["zilvervliesrijst",140,"g"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["currypoeder",2,"tl"],["olijfolie",1,"el"]],
    steps:(a,b)=>[
      "Kook de zilvervliesrijst volgens de verpakking.",
      "Snijd "+a+" en "+b+" in stukken. Verhit olie en fruit het currypoeder kort.",
      "Voeg de stevige groenten eerst toe, dan de tomatenblokjes en kikkererwten. Laat 15 tot 20 minuten sudderen; voeg bladgroenten in de laatste minuten toe.",
      "Controleer of de groenten gaar zijn en serveer met rijst."
    ],
    allergens:"Controleer de kruidenmix en andere verpakkingen."
  },
  {
    id:"bowl",label:"Warme groentebowl",emoji:"🥗",tone:"tone-gold",minutes:30,
    prefix:"Warme bowl met",diet:"vegan",vegan:true,
    base:[["volkoren couscous",140,"g"],["kikkererwten (uitgelekt)",240,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"]],
    steps:(a,b)=>[
      "Bereid de volkoren couscous volgens de verpakking.",
      "Snijd "+a+" en "+b+" in hapklare stukken. Bak of rooster de groenten gaar met wat olijfolie.",
      "Spoel kikkererwten af en warm ze kort mee in de pan.",
      "Verdeel couscous, groenten en kikkererwten over kommen en besprenkel met citroensap."
    ],
    allergens:"Gluten (couscous)."
  },
  {
    id:"wrap",label:"Wraps",emoji:"🌯",tone:"tone-pink",minutes:20,
    prefix:"Volkoren wraps met",diet:"vegan",vegan:true,
    base:[["volkoren wraps",4,"stuks"],["kidneybonen (uitgelekt)",240,"g"],["komijnpoeder",1,"tl"],["limoen",1,"stuk"]],
    steps:(a,b)=>[
      "Spoel de kidneybonen af, verwarm ze met komijn en een scheutje water.",
      "Was en snijd "+a+" en "+b+" in dunne stukken. Paprika kan rauw of kort gebakken worden gebruikt.",
      "Verwarm de volkoren wraps volgens de verpakking.",
      "Beleg royaal met de groenten en de bonen. Besprenkel met limoensap en rol op."
    ],
    allergens:"Gluten (wraps); controleer etiketten."
  },
  {
    id:"shakshuka",label:"Shakshuka",emoji:"🍳",tone:"tone-orange",minutes:30,
    prefix:"Shakshuka met",diet:"vegetarisch",vegan:false,
    base:[["eieren",4,"stuks"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["volkorenbrood",4,"sneetjes"],["paprikapoeder",2,"tl"],["olijfolie",1,"el"]],
    steps:(a,b)=>[
      "Was en snijd "+a+" en "+b+" in kleine stukken. Bak ze gaar in een beetje olijfolie.",
      "Voeg tomatenblokjes en paprikapoeder toe en laat 10 minuten inkoken.",
      "Maak vier kuiltjes, breek hierin de eieren, dek af en laat zacht garen totdat het eiwit volledig gestold is.",
      "Serveer met volkorenbrood."
    ],
    allergens:"Ei en gluten (brood)."
  },
  {
    id:"soup",label:"Maaltijdsoep",emoji:"🥣",tone:"tone-orange",minutes:35,
    prefix:"Goed gevulde soep met",diet:"vegan",vegan:true,
    base:[["linzen uit blik (uitgelekt)",300,"g"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["volkorenbrood",4,"sneetjes"],["olijfolie",1,"el"]],
    steps:(a,b)=>[
      "Snijd "+a+" en "+b+" klein. Bak kort in een soeppan met olijfolie.",
      "Voeg tomatenblokjes en circa 500 ml water toe. Laat zachtjes 15 tot 20 minuten koken totdat de groenten gaar zijn.",
      "Spoel de linzen af, verwarm 5 minuten mee en breng op smaak met peper of verse kruiden.",
      "Serveer met volkorenbrood."
    ],
    allergens:"Gluten (brood); let op eventuele selderij-ingrediënten."
  },
  {
    id:"salad",label:"Maaltijdsalade",emoji:"🥙",tone:"tone-blue",minutes:20,
    prefix:"Frisse maaltijdsalade met",diet:"vegan",vegan:true,
    base:[["kikkererwten (uitgelekt)",240,"g"],["volkoren couscous",140,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"]],
    steps:(a,b)=>[
      "Bereid de volkoren couscous volgens de verpakking en laat afkoelen.",
      "Was de "+a+" en "+b+" goed en snijd klein. Spoel de kikkererwten af.",
      "Meng couscous, groenten en kikkererwten.",
      "Maak een dressing van citroensap en olijfolie en schep door de salade."
    ],
    allergens:"Gluten (couscous)."
  }
]);

const ROLES = Object.freeze({
  oven: ["rode paprika","gele paprika","courgette","broccoli","wortel","kastanjechampignons","pompoenblokjes","aubergine","prei","rode ui"],
  pasta: ["rode paprika","gele paprika","courgette","broccoli","verse spinazie","kastanjechampignons","cherrytomaten","aubergine"],
  wok: ["rode paprika","gele paprika","courgette","broccoli","wortel","verse spinazie","kastanjechampignons","prei"],
  curry: ["rode paprika","gele paprika","courgette","broccoli","wortel","verse spinazie","pompoenblokjes"],
  bowl: ["rode paprika","courgette","broccoli","wortel","cherrytomaten","pompoenblokjes","aubergine"],
  wrap: ["rode paprika","gele paprika","wortel","cherrytomaten","komkommer","avocado","romainesla","rode ui"],
  shakshuka: ["rode paprika","gele paprika","courgette","verse spinazie","kastanjechampignons","cherrytomaten","prei"],
  soup: ["courgette","broccoli","wortel","pompoenblokjes","prei"],
  salad: ["rode paprika","gele paprika","cherrytomaten","komkommer","avocado","romainesla","rode ui"]
});

/**
 * Prevent ingredient name fragments in soup, chips, prepared meals, cosmetics,
 * seasoning mixes or infant foods from masquerading as raw cooking ingredients.
 *
 * Categories are supplied by PrijsProfeet (unified_category -> category).
 * Restrict vegetables to produce-oriented categories when classified; a
 * product with no category must still pass the restrictive title checks.
 */
const NON_INGREDIENT = /(?:soep|schotel|pastasaus|sausmix|kruiden|specerijen|poeder|chips|wokkels|crackers|snack|snoep|lotion|shower|douche|bodywash|body wash|shampoo|conditioner|verzorging|babyvoeding|babyhapje|witvis rijst|roerbak sensatie|bakplaat mix|dagschotel|maaltijd|falafel|rundervink|schnitzel|burger|roomkaas|pasta mix|rauwkost|smaak|aroma|extract|ketchup|dressing|drank|limonade|thee|sap|chips|crisp|mayo|smoothie|groentesmoothie|geperst|bakaardappeltjes|aardappeltjes|wavy|blends|gevulde eieren|gevuld ei|gekookte eieren|vleeswaren|broodbeleg|gerookte kipfilet|kipfilet beleg|gegaard|voor op brood)/i;
const NON_FOOD_BRANDS = /\b(?:nivea|dove|doritos|lays|lay s|lu tuc|aviko|knorr|maggi|honig|unox|olvarit|vivera|iglo|pringles|cheetos|cheez|loreal|l oreal)\b/i;
const PREPARED_FOOD = /\b(?:pure|pulled|aardappel[\s-]?mix|kip[\s-]?mix|tortilla[\s-]?mix|pizza|lasagne|spaghetti bolognese|bami|nasi|salade|bakplaat|soep|quiche|pesto|wraps met|hot dog)\b/i;

export function isWholeIngredientOffer(offer, item) {
  if (!offer || !item || !matchesRecipeIngredient(offer,item.key)) return false;
  const name=clean(offer.name);
  const category=clean(offer.category || offer.unified_category || "");
  if (NON_INGREDIENT.test(name)||NON_FOOD_BRANDS.test(name)||PREPARED_FOOD.test(name))return false;
  const isVeg=VEG.some(v=>v.key===item.key);
  const isProtein=PROTEINS.some(v=>v.key===item.key);
  if (isVeg) {
    // Never classify an offering from chips, ready-meals, dairy, personal
    // care etc. as a fresh vegetable merely because its name has "paprika".
    if(category && !/(groente|fruit|agf|vers|aardappel|diepvries)/.test(category))return false;
    if(/\b(?:kip|rund|vlees|vis|filet|kaas|pasta|rijst|bonen|linzen|chips|worst|wraps|pudding|olie|melk)\b/.test(name))return false;
    if(item.key==="avocado" && /olie|oil|cream|butter/.test(name))return false;
    if(item.key==="rode paprika" && /paprika[s]?maak|paprika[s]?aus/.test(name))return false;
  }
  if(isProtein) {
    // Duitse biefstuk is prepared minced meat, not an intact steak.
    if(item.key==="biefstuk" && /\b(?:duitse biefstuk|tartaar|gevormde biefstuk|biefstuk tartaar)\b/.test(name))return false;
    // An ingredient title alone does not prove a raw cut of meat.
    if(category && !/(vlees|vis|gevogelte|kip|rund|varken|slager|vers|diepvries)/.test(category))return false;
    if(/(?:gemarineerd in saus|in room|kant en klaar|gepaneerd|ovenschotel|stoof|burger|schnitzel|vegan|veggie|vegetarisch|plantaardig|vleesvervanger|vega |gekookt|gerookt|salade|broodbeleg|vleeswaren|plakjes|worst|pat[eé])/.test(name))return false;
  }
  // "kikkererwten en lupine mix" is still a usable bean combination; no
  // prepared spicy meals, dips, soups or flavour-labelled snack products.
  if(!isVeg && !isProtein && /\b(?:shower|chips|soup|ready meal)\b/.test(name))return false;
  return true;
}

/** Produce true only for actual separate product identities. */
export function isOfferInPeriod(offer,period="now",today=todayNL()) {
  if(!offer || !Number.isFinite(Number(offer.price)) || Number(offer.price)<=0)return false;
  if(period==="now")return isActiveOffer({...offer,promotion_status:offer.status||offer.promotion_status},today);
  if(period!=="next")return false;
  const {start,end}=weekBounds(today);
  const nextStart=new Date(start+"T12:00:00Z"),nextEnd=new Date(end+"T12:00:00Z");
  nextStart.setUTCDate(nextStart.getUTCDate()+7);
  nextEnd.setUTCDate(nextEnd.getUTCDate()+7);
  const from=String(offer.valid_from||"").slice(0,10);
  const to=String(offer.valid_until||"").slice(0,10);
  if(!/^\d{4}-\d\d-\d\d$/.test(from)||!/^\d{4}-\d\d-\d\d$/.test(to))return false;
  const status=offer.status||offer.promotion_status;
  if(["historical","shelf"].includes(status))return false;
  return from<=nextEnd.toISOString().slice(0,10) && to>=nextStart.toISOString().slice(0,10);
}
function bestOffers(offers, retailer, today, period="now") {
  const live = (offers || []).filter(o =>
    o.retailer === retailer &&
    o.name && Number.isFinite(Number(o.price)) &&
    isOfferInPeriod(o,period,today)
  );
  const found = new Map();
  for (const item of [...VEG, ...PROTEINS, ...STAPLE_DEALS]) {
    const candidates = live.filter(o => isWholeIngredientOffer(o, item));
    if (!candidates.length) continue;
    candidates.sort((a,b) =>
      (Number(b.savings)||0)-(Number(a.savings)||0) ||
      String(a.name).localeCompare(String(b.name),"nl")
    );
    found.set(item.key, candidates[0]);
  }
  return found;
}
function safeDistinct(a,b, offerByKey) {
  return a.key !== b.key && offerByKey.get(a.key)?.id !== offerByKey.get(b.key)?.id;
}
function humanJoin(a,b) { return a+" en "+b; }
function makePair(format,a,b,found) {
  const p1=found.get(a.key),p2=found.get(b.key);
  const title=format.prefix+" "+humanJoin(a.label,b.label);
  const ingredients=[
    [a.key,a.amount,a.unit],
    [b.key,b.amount,b.unit],
    ...format.base.map(row=>[...row])
  ];
  const matches=[
    {ingredient:a.key,offer:p1,major:true},
    {ingredient:b.key,offer:p2,major:true}
  ];
  return {
    recipe:{
      id:"actief-"+format.id+"-"+clean(a.key).replaceAll(" ","-")+"-"+clean(b.key).replaceAll(" ","-"),
      title,description:"Gebaseerd op 2 afzonderlijke, gecontroleerde actieproducten van jouw supermarkt.",
      category:format.label,diet:format.diet,vegan:format.vegan,
      minutes:format.minutes,emoji:format.emoji,tone:format.tone,servings:2,
      ingredients,steps:format.steps(a.label,b.label),allergens:format.allergens
    },
    matches,
    main:2,
    score:200+(Number(p1.savings)||0)+(Number(p2.savings)||0),
    method:format.id,
    pair:[a.key,b.key].sort().join("|")
  };
}
function makeProteinDish(protein,veg,found) {
  const offer=found.get(protein.key),vegetableOffer=found.get(veg.key);
  const fish=protein.kind==="fish",chicken=protein.kind==="chicken";
  const beef=protein.kind==="beef",pork=protein.kind==="pork";
  const boneIn=protein.key==="kipdrumsticks";
  const ground=protein.key==="rundergehakt";
  const strips=protein.key==="runderreepjes";
  const category=fish?"Vis":chicken?"Kip":beef?"Rundvlees":"Varkensvlees";
  const minutes=boneIn?60:ground||strips?30:beef||pork?35:chicken?45:35;
  const title=(fish?"Ovenvis":chicken?"Kip":beef?"Rundvlees":"Varkensvlees")+
    " met "+veg.label+" en aardappeltjes";
  const steps=fish?[
    "Verwarm de oven voor op 200 °C. Snijd de aardappelen klein en rooster ze 15 minuten voor.",
    "Snijd de "+veg.label+" in kleine stukken en schep met een beetje olie om. Voeg bij de aardappelen.",
    "Leg de "+protein.label+" erbij en gaar ongeveer 12–18 minuten verder, tot de vis volledig gaar is.",
    "Controleer of de aardappelen en groenten gaar zijn en serveer met citroen."
  ]:chicken?[
    "Verwarm de oven voor op 200 °C. Snijd de aardappelen klein en rooster ze 15 minuten voor.",
    "Snijd de "+veg.label+" in stukken, voeg die met olijfolie toe aan de bakplaat.",
    boneIn
      ?"Leg de kipdrumsticks op de plaat en rooster circa 35–45 minuten verder, afhankelijk van hun grootte. Draai halverwege."
      :"Voeg de "+protein.label+" toe en rooster circa 20–30 minuten verder, afhankelijk van de dikte.",
    "Controleer met een vleesthermometer dat de kip in het dikste deel minimaal 75 °C is, zonder het bot te raken. Serveer met citroen."
  ]:ground?[
    "Kook of rooster de aardappelen gaar. Snijd de "+veg.label+" in hapklare stukken.",
    "Bak het rundergehakt in een koekenpan rul en volledig gaar; giet overtollig bakvet af.",
    "Bak de groenten in een tweede pan met een beetje olie tot ze beetgaar zijn.",
    "Meng het gehakt met de groenten, breng op smaak met peper en serveer met aardappelen."
  ]:strips?[
    "Kook of rooster de aardappelen gaar. Snijd de "+veg.label+" klein.",
    "Roerbak de "+protein.label+" op middelhoog vuur totdat het vlees gaar is; houd het daarna even apart.",
    "Roerbak de groenten met een klein beetje olie tot ze beetgaar zijn.",
    "Schep het vlees terug, warm alles goed door en serveer met de aardappelen."
  ]:[
    "Kook of rooster de aardappelen gaar en snijd de "+veg.label+" klein.",
    "Bak of stoom de groenten met een beetje olie tot ze beetgaar zijn.",
    "Bak de "+protein.label+" in een koekenpan tot de gewenste, veilige gaarheid; controleer de verpakking voor bereidingstijd en temperatuur.",
    "Laat het vlees zo nodig kort rusten en serveer met groenten, aardappelen en citroen."
  ];
  return {
    recipe:{
      id:"actief-protein-"+clean(protein.key)+"-"+clean(veg.key),
      title,description:vegetableOffer
        ?"Echt afgeprijsd(e) "+protein.label+" en "+veg.label+" vormen de basis van dit gerecht."
        :"Deze maaltijd begint bij een bevestigde aanbieding voor "+protein.label+".",
      category,diet:fish?"vis":chicken?"kip":beef?"rund":"varken",
      vegan:false,minutes,emoji:fish?"🐟":chicken?"🍗":beef?"🥩":"🍖",
      tone:fish?"tone-blue":chicken?"tone-orange":"tone-gold",servings:2,
      ingredients:[[protein.key,protein.amount,protein.unit],[veg.key,Math.max(350,veg.amount),veg.unit],
        ["vastkokende aardappelen",400,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"]],
      steps,allergens:"Controleer de etiketten op allergenen en mogelijke kruisbesmetting."
    },
    matches:[{ingredient:protein.key,offer,major:true},...(vegetableOffer?[{ingredient:veg.key,offer:vegetableOffer,major:true}]:[])],
    main:vegetableOffer?2:1,
    score:(vegetableOffer?460:365)+(Number(offer.savings)||0)+(Number(vegetableOffer?.savings)||0),
    method:"protein-"+protein.kind,
    pair:[protein.key,veg.key].sort().join("|")
  };
}
function makeStapleDish(format,a,b,staple,found) {
  const vegOffer=found.get(a.key),stapleOffer=found.get(staple.key);
  return {
    recipe:{
      id:"actief-"+format.id+"-"+clean(a.key).replaceAll(" ","-")+"-"+clean(staple.key).replaceAll(" ","-"),
      title:format.prefix+" "+humanJoin(a.label,b.label),
      description:"Samengesteld met actuele korting op "+a.label+" én "+staple.key+".",
      category:format.label,diet:format.diet,vegan:format.vegan,
      minutes:format.minutes,emoji:format.emoji,tone:format.tone,servings:2,
      ingredients:[[a.key,a.amount,a.unit],[b.key,b.amount,b.unit],...format.base.map(row=>[...row])],
      steps:format.steps(a.label,b.label),allergens:format.allergens
    },
    matches:[
      {ingredient:a.key,offer:vegOffer,major:true},
      {ingredient:staple.key,offer:stapleOffer,major:true}
    ],
    main:2,
    score:175+(Number(vegOffer.savings)||0)+(Number(stapleOffer.savings)||0),
    method:format.id,
    pair:[a.key,staple.key].sort().join("|")
  };
}

function makeSingleSourceDish(format,a,b,found,sourceKey) {
  const offer=found.get(sourceKey);
  const advertised=sourceKey===a.key?a.label:sourceKey;
  return {
    recipe:{
      id:"actief-"+format.id+"-"+clean(sourceKey).replaceAll(" ","-")+"-solo",
      title:format.prefix+" "+humanJoin(a.label,b.label),
      description:"Samengesteld vanuit de echte aanbieding voor "+advertised+
        ". Andere ingrediënten zijn aanvullingen tegen de normale winkelprijs.",
      category:format.label,diet:format.diet,vegan:format.vegan,
      minutes:format.minutes,emoji:format.emoji,tone:format.tone,servings:2,
      ingredients:[[a.key,a.amount,a.unit],[b.key,b.amount,b.unit],...format.base.map(x=>[...x])],
      steps:format.steps(a.label,b.label),allergens:format.allergens
    },
    matches:[{ingredient:sourceKey,offer,major:true}],
    main:1,
    score:55+(Number(offer.savings)||0),
    method:format.id,
    pair:sourceKey
  };
}

/** 0..7 deterministic actual-offer dinners, with no unproven filler. */
export function buildActionMeals(offers, retailer, today=todayNL(), limit=7, period="now") {
  if (!RECIPE_RETAILERS.some(r=>r.code===retailer)) return [];
  const found=bestOffers(offers,retailer,today,period);
  const candidates=[];
  for (const format of FORMATS) {
    const available=VEG.filter(v=>v.roles.includes(format.id) &&
      ROLES[format.id].includes(v.key) && found.has(v.key));
    for(let i=0;i<available.length;i++){
      for(let j=i+1;j<available.length;j++){
        const a=available[i],b=available[j];
        if(!safeDistinct(a,b,found))continue;
        // Different colored peppers represent distinct recipes only if the
        // actual offers have different product identities.
        candidates.push(makePair(format,a,b,found));
      }
    }
  }
  // When only one relevant vegetable is discounted, a second genuine offer
  // on a core ingredient (rice, pasta, beans, eggs etc.) can support a dish.
  // The complementary vegetable stays explicitly on the normal-price list.
  for(const format of FORMATS){
    const allowed = VEG.filter(v=>ROLES[format.id].includes(v.key));
    for(const a of allowed.filter(v=>found.has(v.key))){
      const b=allowed.find(v=>v.key!==a.key && !found.has(v.key));
      if(!b)continue;
      for(const staple of STAPLE_DEALS.filter(x=>x.formats.includes(format.id) && found.has(x.key))){
        if(found.get(a.key)?.id===found.get(staple.key)?.id)continue;
        candidates.push(makeStapleDish(format,a,b,staple,found));
      }
    }
  }
  for(const p of PROTEINS){
    if(!found.has(p.key))continue;
    for(const v of VEG.filter(x=>x.roles.includes("oven") && found.has(x.key))){
      if(found.get(p.key).id===found.get(v.key).id)continue;
      candidates.push(makeProteinDish(p,v,found));
    }
    // A genuinely discounted meat/fish product remains a valid recipe starting
    // point even when no fresh vegetable is reduced that week.
    const regularVeg=VEG.find(x=>x.key==="broccoli" && !found.has(x.key)) ||
      VEG.find(x=>x.key==="courgette" && !found.has(x.key));
    if(regularVeg)candidates.push(makeProteinDish(p,regularVeg,found));
  }
  for(const format of FORMATS){
    const allowed=VEG.filter(v=>ROLES[format.id].includes(v.key));
    for(const a of allowed.filter(v=>found.has(v.key))){
      const regular=allowed.find(v=>v.key!==a.key && !found.has(v.key));
      if(regular)candidates.push(makeSingleSourceDish(format,a,regular,found,a.key));
    }
    // Discounted grains, legumes and eggs can also start a complete meal.
    const normalVeg=allowed.filter(v=>!found.has(v.key));
    if(normalVeg.length>=2){
      for(const staple of STAPLE_DEALS.filter(st=>st.formats.includes(format.id)&&found.has(st.key))){
        candidates.push(makeSingleSourceDish(format,normalVeg[0],normalVeg[1],found,staple.key));
      }
    }
  }
  candidates.sort((a,b)=>b.score-a.score || a.recipe.title.localeCompare(b.recipe.title,"nl"));
  const chosen=[], formats=new Set(), pairs=new Set(), used=new Map();
  while(chosen.length<Math.min(Math.max(1,limit),7) && candidates.length){
    let index=-1,best=-Infinity;
    for(let i=0;i<candidates.length;i++){
      const c=candidates[i];
      if(formats.has(c.method)||pairs.has(c.pair))continue;
      const overlap=c.matches.reduce((n,x)=>n+(used.get(x.ingredient)||0),0);
      const adjusted=c.score-overlap*33;
      if(adjusted>best){index=i;best=adjusted;}
    }
    if(index<0)break;
    const selected=candidates.splice(index,1)[0];
    chosen.push(selected);
    formats.add(selected.method);pairs.add(selected.pair);
    selected.matches.forEach(x=>used.set(x.ingredient,(used.get(x.ingredient)||0)+1));
  }
  return chosen;
}
