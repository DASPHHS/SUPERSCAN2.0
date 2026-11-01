/* Originele, redactioneel samengestelde receptenset.
   Richtlijn: https://www.voedingscentrum.nl/nl/gezonde-recepten.aspx
   Geen overgenomen HelloFresh- of Voedingscentrum-receptteksten. */
export const recipes = [
  {
    id:"kikkererwten-bowl",title:"Mediterrane kikkererwtenbowl",description:"Knapperige groenten, kruidige kikkererwten en frisse yoghurtdressing.",
    category:"Bowl",diet:"vegetarisch",vegan:false,minutes:25,emoji:"🥗",tone:"tone-blue",servings:2,
    ingredients:[["kikkererwten (uitgelekt)",240,"g"],["bulgur volkoren",130,"g"],["komkommer",200,"g"],["cherrytomaten",250,"g"],["rode paprika",200,"g"],["magere yoghurt",100,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"],["komijnpoeder",1,"tl"]],
    steps:["Kook de bulgur volgens de verpakking en laat kort uitstomen.","Spoel de kikkererwten af en bak ze vijf minuten met olijfolie en komijn.","Snijd komkommer, tomaten en paprika in kleine stukken.","Meng yoghurt met citroensap en eventueel wat peper.","Verdeel bulgur, groenten en kikkererwten over twee kommen. Serveer met dressing."],
    allergens:"Gluten (bulgur), melk (yoghurt)."
  },
  {
    id:"pasta-spinazie",title:"Volkoren pasta met spinazie & paddenstoelen",description:"Romige citroensaus zonder room, met extra groenten.",
    category:"Pasta",diet:"vegetarisch",vegan:false,minutes:25,emoji:"🍝",tone:"tone-pink",servings:2,
    ingredients:[["volkoren pasta",150,"g"],["verse spinazie",250,"g"],["kastanjechampignons",250,"g"],["cherrytomaten",150,"g"],["ricotta",100,"g"],["citroen",1,"stuk"],["knoflook",1,"teen"],["olijfolie",1,"el"]],
    steps:["Kook de volkoren pasta beetgaar en bewaar een kopje kookwater.","Snijd champignons en halveer tomaten; bak beide met knoflook in olijfolie.","Voeg spinazie toe en laat slinken.","Roer ricotta met citroenrasp en een scheutje kookwater tot een lichte saus.","Meng met pasta en groenten en breng op smaak met peper."],
    allergens:"Gluten (pasta), melk (ricotta)."
  },
  {
    id:"zalm-broccoli",title:"Zalm met broccoli & zilvervliesrijst",description:"Eenvoudige vismaaltijd met citroen en een royale portie groen.",
    category:"Vis",diet:"vis",vegan:false,minutes:30,emoji:"🐟",tone:"tone-blue",servings:2,
    ingredients:[["zalmfilet",200,"g"],["broccoli",400,"g"],["wortel",150,"g"],["zilvervliesrijst",150,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"],["dille",1,"tl"]],
    steps:["Kook de zilvervliesrijst volgens de verpakking.","Verdeel broccoli in roosjes, snijd wortel en stoom samen beetgaar.","Bestrijk de zalm licht met olie, citroen en dille.","Bak de zalm op matig vuur of gaar in de oven tot de vis goed gaar is.","Serveer de zalm met rijst en de groenten."],
    allergens:"Vis."
  },
  {
    id:"linzen-pompoen",title:"Rode linzencurry met pompoen",description:"Verwarmende plantaardige curry met milde specerijen.",
    category:"Curry",diet:"vegan",vegan:true,minutes:35,emoji:"🍛",tone:"tone-orange",servings:2,
    ingredients:[["rode linzen (droog)",150,"g"],["pompoenblokjes",400,"g"],["spinazie",200,"g"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["zilvervliesrijst",130,"g"],["ui",1,"stuk"],["currypoeder",2,"tl"],["olijfolie",1,"el"]],
    steps:["Kook de zilvervliesrijst gaar.","Snipper de ui en fruit zacht in olijfolie met het currypoeder.","Doe pompoen, afgespoelde linzen, tomatenblokjes en wat water in de pan.","Laat 20 tot 25 minuten sudderen tot pompoen en linzen gaar zijn.","Roer de spinazie erdoor tot ze slinkt en serveer met rijst."],
    allergens:"Controleer de kruidenmix op eventuele allergenen."
  },
  {
    id:"shakshuka",title:"Shakshuka met paprika en volkorenbrood",description:"Eieren in een kruidige tomatensaus, boordevol groenten.",
    category:"Eenpansgerecht",diet:"vegetarisch",vegan:false,minutes:30,emoji:"🍳",tone:"tone-orange",servings:2,
    ingredients:[["eieren",4,"stuks"],["rode paprika",200,"g"],["gele paprika",200,"g"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["ui",1,"stuk"],["volkorenbrood",4,"sneetjes"],["paprikapoeder",2,"tl"],["olijfolie",1,"el"]],
    steps:["Snijd paprika en ui in stukjes en fruit in olijfolie.","Voeg tomatenblokjes en paprikapoeder toe; laat ongeveer tien minuten indikken.","Maak vier kuiltjes en breek in elk kuiltje een ei.","Dek af en gaar de eieren totdat het eiwit volledig gestold is.","Serveer met volkorenbrood."],
    allergens:"Ei, gluten (brood)."
  },
  {
    id:"kip-traybake",title:"Oventray met kip, wortel & courgette",description:"Alles op één bakplaat, met aardappeltjes en rozemarijn.",
    category:"Uit de oven",diet:"kip",vegan:false,minutes:45,emoji:"🥘",tone:"tone-gold",servings:2,
    ingredients:[["kipfilet",240,"g"],["courgette",300,"g"],["wortel",300,"g"],["rode ui",1,"stuk"],["vastkokende aardappelen",400,"g"],["olijfolie",2,"el"],["rozemarijn",2,"tl"],["citroen",1,"stuk"]],
    steps:["Verwarm de oven voor op 200 °C.","Snijd aardappelen klein en meng met één eetlepel olie. Bak alvast tien minuten.","Snijd groenten en kip in gelijkmatige stukken.","Schep groenten en kip om met de overige olie, rozemarijn en citroenrasp; voeg toe aan de plaat.","Rooster nog 25 tot 30 minuten, tot de kip volledig gaar is."],
    allergens:"Geen van de 14 wettelijke allergenen in de basis, controleer verpakkingen."
  },
  {
    id:"bonen-wraps",title:"Volkoren wraps met bonen & avocado",description:"Kleurrijk, fris en rijk aan plantaardige eiwitten.",
    category:"Wraps",diet:"vegan",vegan:true,minutes:20,emoji:"🌯",tone:"tone-pink",servings:2,
    ingredients:[["volkoren wraps",4,"stuks"],["kidneybonen (uitgelekt)",240,"g"],["tomaten",200,"g"],["rode paprika",200,"g"],["romainesla",150,"g"],["avocado",1,"stuk"],["limoen",1,"stuk"],["komijnpoeder",1,"tl"]],
    steps:["Spoel de bonen goed af en verwarm met komijn en een scheutje water.","Snijd tomaten, paprika en sla fijn.","Prak avocado met een beetje limoensap.","Verwarm wraps volgens de verpakking.","Beleg met bonen, veel rauwkost en avocado. Rol op."],
    allergens:"Gluten (wraps); controleer ook de verpakking."
  },
  {
    id:"couscous-feta",title:"Volkoren couscous met courgette & feta",description:"Een snelle, frisse maaltijd met geroosterde groenten.",
    category:"Couscous",diet:"vegetarisch",vegan:false,minutes:25,emoji:"🥙",tone:"tone-gold",servings:2,
    ingredients:[["volkoren couscous",140,"g"],["courgette",300,"g"],["cherrytomaten",250,"g"],["kikkererwten (uitgelekt)",200,"g"],["feta",75,"g"],["citroen",1,"stuk"],["olijfolie",1,"el"],["peterselie",1,"handje"]],
    steps:["Bereid de couscous volgens de verpakking zonder extra zout.","Snijd courgette en halveer de cherrytomaten.","Bak groenten met olijfolie op middelhoog vuur gaar en lichtbruin.","Spoel kikkererwten en verwarm kort mee.","Meng alles met couscous, citroen en peterselie. Verkruimel de feta erover."],
    allergens:"Gluten (couscous), melk (feta)."
  },
  {
    id:"tofu-paksoi",title:"Tofu-roerbak met paksoi",description:"Groene groenten, krokante tofu en zilvervliesrijst.",
    category:"Aziatisch",diet:"vegan",vegan:true,minutes:25,emoji:"🥬",tone:"tone-blue",servings:2,
    ingredients:[["stevige tofu",250,"g"],["paksoi",350,"g"],["broccoli",250,"g"],["zilvervliesrijst",150,"g"],["gember",15,"g"],["knoflook",1,"teen"],["natriumarme sojasaus",1,"el"],["zonnebloemolie",1,"el"]],
    steps:["Kook de zilvervliesrijst volgens de verpakking.","Dep tofu droog en snijd in blokjes; bak in olie tot de randen goudbruin zijn.","Roerbak broccoli en gember enkele minuten met een beetje water.","Voeg paksoi en knoflook toe en laat kort slinken.","Meng tofu en een kleine hoeveelheid natriumarme sojasaus erdoor. Serveer met rijst."],
    allergens:"Soja, mogelijk gluten (sojasaus)."
  },
  {
    id:"visstoof",title:"Romige visstoof met prei & doperwten",description:"Zachte witte vis in een lichte saus op basis van yoghurt.",
    category:"Vis",diet:"vis",vegan:false,minutes:35,emoji:"🍲",tone:"tone-purple",servings:2,
    ingredients:[["kabeljauwfilet",250,"g"],["prei",300,"g"],["diepvriesdoperwten",200,"g"],["aardappelen",400,"g"],["magere yoghurt",100,"g"],["citroen",1,"stuk"],["dille",1,"tl"],["olijfolie",1,"el"]],
    steps:["Kook de aardappelen beetgaar.","Was prei goed en snijd in ringen; smoor met olijfolie en wat water.","Voeg doperwten toe en laat vijf minuten zachtjes koken.","Leg de stukken vis bovenop en laat met deksel zacht garen tot de vis gaar is.","Haal van het vuur en roer de yoghurt voorzichtig door het kookvocht. Voeg citroen en dille toe."],
    allergens:"Vis, melk."
  },
  {
    id:"linzensoep",title:"Goed gevulde linzensoep",description:"Tomaat, bleekselderij, wortel en linzen maken deze soep een maaltijd.",
    category:"Soep",diet:"vegan",vegan:true,minutes:30,emoji:"🥣",tone:"tone-orange",servings:2,
    ingredients:[["linzen uit blik (uitgelekt)",300,"g"],["wortel",250,"g"],["bleekselderij",200,"g"],["tomatenblokjes (zonder toegevoegd zout)",400,"g"],["ui",1,"stuk"],["volkorenbrood",4,"sneetjes"],["olijfolie",1,"el"],["paprikapoeder",1,"tl"]],
    steps:["Snijd wortel, bleekselderij en ui klein.","Fruit in olijfolie met paprikapoeder.","Voeg tomaten en 400 ml water toe, breng aan de kook en laat vijftien minuten garen.","Spoel linzen af en verwarm vijf minuten mee.","Serveer met volkorenbrood."],
    allergens:"Gluten (brood), mogelijk selderij."
  },
  {
    id:"aubergine-oven",title:"Ovenschotel met aubergine & linzen",description:"Rijke tomatensaus met kruidige linzen en goudbruin korstje.",
    category:"Ovenschotel",diet:"vegetarisch",vegan:false,minutes:45,emoji:"🍆",tone:"tone-purple",servings:2,
    ingredients:[["aubergine",350,"g"],["courgette",250,"g"],["bruine linzen (uitgelekt)",250,"g"],["tomatenpassata zonder zout",400,"g"],["aardappelen",350,"g"],["mozzarella",80,"g"],["olijfolie",1,"el"],["oregano",1,"tl"]],
    steps:["Verwarm de oven voor op 200 °C. Kook aardappelschijfjes kort voor.","Snijd aubergine en courgette in plakken en bestrijk licht met olijfolie.","Meng passata met uitgelekte linzen en oregano.","Leg aardappel, groenten en linzensaus in lagen in een ovenschaal.","Verdeel mozzarella over de bovenkant en bak 25 tot 30 minuten tot alles gaar is."],
    allergens:"Melk (mozzarella)."
  }
];
