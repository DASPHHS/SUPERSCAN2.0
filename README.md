# SUPERSCAN 2.0

Een responsive Nederlandse website om actuele aanbiedingen te ontdekken, producten en complete boodschappenlijstjes te vergelijken, je boodschappenlijst lokaal te bewaren en gezonde avondrecepten te vinden.

## Functies

- Actuele supermarktaanbiedingen van uitsluitend Albert Heijn, Lidl, Jumbo, Hoogvliet en Dirk, met zoekveld, winkel- en kortingsfilters en geldigheidsdatum.
- Basisprijsvergelijking per product, verpakking en supermarkt.
- Boodschappenlijst met afvinken, verwijderen, import/export als JSON en automatisch bewaren in de browser (localStorage, zonder account).
- Vergelijking van complete mandjes; onvolledige matches worden uitsluitend als deelsom weergegeven. Geen prijsramingen verzinnen.
- Een optimalisatie voor maximaal twee winkels, uitsluitend bij volledige productdekking.
- Een **niet-willekeurige, actiegestuurde weekplanner** met maximaal 7 recepten per gekozen keten. De 12 originele, redactioneel samengestelde basiskookrecepten fungeren uitsluitend als sjablonen; een gerecht verschijnt **alleen als een belangrijk ingrediënt werkelijk in de aanbieding is** bij de gekozen keten en de actie op dit moment loopt. Elk recept toont concreet gevonden actieproducten, prijzen en geldigheid, en kan naar de boodschappenlijst worden toegevoegd. Hele week aan lijst toevoegen combineert identieke ingrediënten.
- Installatie als eenvoudige PWA en een offline app-shell; prijzen en aanbiedingen worden altijd online geladen.


## Wekelijkse recepten op basis van acties (belangrijk)

- **Vijf ketens:** Albert Heijn, Lidl, Jumbo, Hoogvliet, Dirk.
- De website haalt iedere zes uur actuele aanbiedingen bij PrijsProfeet op. Voor receptrelevantie zoekt het script expliciet ook naar groenten, aardappelen, peulvruchten, eieren, pasta, vis en andere concrete ingrediënten. De data is een **selectie**, geen volledig assortiment.
- De planner selecteert deterministisch uit de originele receptsjablonen. **Een belangrijk ingrediënt moet aantoonbaar in de aanbieding zijn** bij de geselecteerde keten. Recepten zonder passend actiebewijs worden volledig verborgen; er worden nooit dummy-acties of fictieve prijzen getoond.
- Per recept is te zien **welk ingrediënt**, **welk concreet actieproduct**, **welke prijs** en **welke einddatum** van toepassing zijn. Niet alle ingrediënten zijn in de aanbieding; de app berekent daarom geen verzonnen totale receptprijs of besparing.
- Maximaal zeven passende recepten per actieweek, gerangschikt op aantal actie-ingrediënten en feitelijke korting, zonder toevalsgenerator. Als er minder dan zeven bewezen gerechten zijn, worden ook minder getoond.
- Kies je supermarkt en vul optioneel je **voorkeursvestiging** in. Dat veld wordt lokaal bewaard, maar de PrijsProfeet-API biedt **geen aantoonbare informatie op fysiek filiaalniveau**. De app toont daarom alleen landelijke ketenaanbiedingen en zegt expliciet dat filiaalbeschikbaarheid en lokale uitzonderingen niet zijn vastgesteld. Echte per-vestiging-prijzen vereisen afzonderlijke winkel- of filiaalgebonden databronnen.
- De filtering gebeurt telkens opnieuw op de actuele dag in de tijdzone Europa/Amsterdam. Als acties tijdens de week verlopen, verdwijnt het bijbehorende bewijs. Bij geen passende acties toont de planner bewust geen generieke recepten.
- Gezonde eetprincipes zijn leidend, maar de recepten en specifieke merken zijn niet klinisch of nutritioneel gecertificeerd. Lees allergenen en etiketten zelf.

## Gebruikte databronnen

| Data | Bron | Beperking |
| --- | --- | --- |
| Aanbiedingen | [PrijsProfeet](https://github.com/PrijsProfeet/supermarkt-api) | Gratis API bevat aanbiedingen, geen compleet regulier schapassortiment; actuele promoties gesynchroniseerd via /api/v1/products/promotional/all. Filter op actief en geldigheidsdatum. |
| Reguliere prijzen | [Checkjebon](https://github.com/supermarkt/checkjebon) | Publieke dataset van supermarktproducten met prijzen. Naam-/hoeveelheidsmatches zijn indicatief, niet identiek aan EAN-match. |
| Voedingsprincipes | [Voedingscentrum](https://www.voedingscentrum.nl/nl/gezonde-recepten.aspx) | De originele recepten zijn gebaseerd op algemene gezonde eetpatronen, maar niet medisch of nutritioneel gecertificeerd. |

Op elke pagina met aanbiedingen moet staan: **Aanbiedingen via [PrijsProfeet](https://www.prijsprofeet.nl)**. Zie hun [API-voorwaarden](https://www.prijsprofeet.nl/api-voorwaarden). Controleer ook de rechten op de open prijsendataset voor commercieel hergebruik.

**Datakwaliteit:** geen fictieve voorbeelddeals, geen verzonnen prijzen bij ontbrekende matches, geen toekomstige of historische acties als vandaag geldig. Niet elk product of filiaal is bekend. Vergelijk productinhoud, kortingen, eventuele bundelvoorwaarden en kassaprijzen zelf.

## Onderzochte bronnen en bruikbare principes

- [nexio123/dutch-grocery-app](https://github.com/nexio123/dutch-grocery-app): Nederlandstalige lijstinterface en lokale opslag; de README markeert een deel van de prijsintegratie als nog in ontwikkeling.
- [supermarkt/checkjebon](https://github.com/supermarkt/checkjebon) en [checkjebon-js](https://github.com/supermarkt/checkjebon-js): bestaande prijzendataset en ideeën voor productmatching en mandoptimalisatie. De app gebruikt de data, met striktere voorwaarden voor matches en zonder gemiddelde prijsramingen.
- [PrijsProfeet/supermarkt-api](https://github.com/PrijsProfeet/supermarkt-api): de daadwerkelijke openbare API voor actueel aanbod, met status, geldigheidsdata en promotievoorwaarden.
- [Samvox1/nl-supermarkt-mcp](https://github.com/Samvox1/nl-supermarkt-mcp): inspiratie voor het apart synchroniseren van aanbiedingen, schapprijzen, receptcollecties en lijstplanning.
- [bartmachielsen/SupermarktConnector](https://github.com/bartmachielsen/SupermarktConnector): productconnector voor AH/Jumbo, niet gebruikt als primaire bron wegens mogelijke wijzigingen van niet-officiële interfaces.
- [t0ffifee/discount-scraper](https://github.com/t0ffifee/discount-scraper), [tonsmets/SupermarketScraper](https://github.com/tonsmets/SupermarketScraper): ideeën voor periodieke bronverversing, foutafhandeling en logging. De oude Selenium-scrapers zijn niet opgenomen.
- [FriendlyUser/flipp_flyer_parser](https://github.com/FriendlyUser/flipp_flyer_parser): folderparsing als concept, geen primaire Nederlandse databron.
- [nwesthoff/allerhande-recipe](https://github.com/nwesthoff/allerhande-recipe): sitemap-ontdekking van Allerhande-recept-URL's; geen gevalideerde gezonde-recepten-API.
- [moshetrenk/hellofresh-database](https://github.com/moshetrenk/hellofresh-database), [dcragusa/HelloFreshRecipes](https://github.com/dcragusa/HelloFreshRecipes), [alexcodito/HelloFreshCrawler](https://github.com/alexcodito/HelloFreshCrawler): UX-inspiratie voor ingrediënt- en allergenenfilters. Geen HelloFresh-receptteksten, PDF's of afbeeldingen gekopieerd wegens rechten en beschikbaarheid.
- [frankwiersma/recipes](https://github.com/frankwiersma/recipes): inspiratie voor ingrediëntschaling, suggesties en toekomstige JSON-LD-import.
- [Bitmash Mealpreprecepten](https://bitmash.nl/portfolio/mealpreprecepten): voorbeeld van filters, meal prep en winkelintegratie. Productmatchingconcept is bruikbaar, maar externe winkelwagenkoppelingen zijn niet aantoonbaar publiek en worden niet nagebootst.
- [peternijssen/python-jumbo-api](https://github.com/peternijssen/python-jumbo-api): verplaatst naar peter-mdf/python-jumbo-api en gearchiveerd; accountafhankelijke niet-officiële Jumbo-wrapper is geen betrouwbare publieke API.
- [PaulVerhoeven1/grocy-dutch-supermarket](https://github.com/PaulVerhoeven1/grocy-dutch-supermarket): EAN/barcodes gebruiken als betrouwbare toekomstige matchsleutel; geen externe boodschappenaccountintegratie zonder autorisatie.
- [apitracker.io/a/jumbo](https://apitracker.io/a/jumbo): API-catalogus zonder geverifieerde publieke OpenAPI-specificatie of toegangsvoorwaarden.
- [basetenlabs/ml-cookbook](https://github.com/basetenlabs/ml-cookbook): is een machine-learning trainingscookbook en geen kookreceptendatabank.

## GitHub Pages publiceren

De eerste werkende versie wordt gebouwd vanuit main. Een GitHub Action vernieuwt de data elke zes uur en publiceert de statische site naar GitHub Pages.

1. Merge de featurebranch via de pull request naar main.
2. Ga naar repository Settings → Pages → Build and deployment → Source en kies GitHub Actions.
3. Open Actions → Test, sync and publish SuperScan en start indien nodig Run workflow.
4. Na een geslaagde deployment is de site beschikbaar op https://dasphhs.github.io/SUPERSCAN2.0/.
5. Optioneel: maak een gratis PrijsProfeet-key aan en voeg deze als Actions-secret met naam PRIJSPROFEET_API_KEY toe. Plaats nooit keys in client-side bestanden.

Het synchronisatiescript gebruikt uitsluitend de Python-standaardbibliotheek. Op elke build worden de brongegevens aan het Pages-artifact toegevoegd, niet aan de git-geschiedenis.

## Lokaal draaien

- Node.js 22+ en Python 3.12+
- Tests: npm test
- Python-tests: python -m unittest discover -s tests -p 'test_*.py'
- Prijsgegevens en aanbiedingen verversen: python scripts/sync_sources.py
- Lokale server: python -m http.server 8000
- Open vervolgens http://localhost:8000

Bij uitval van een bron blijven je lokale lijst en de recepten beschikbaar. Actuele prijzen kunnen dan tijdelijk ontbreken. Browsergegevens wissen verwijdert lokale lijstgegevens; exporteer een back-up.

## Roadmap

- Productmatching op EAN waar toegestaan, met corrigeerbare alternatieven en vergelijkbare inhoudseenheden.
- Voedingswaardeberekeningen met controleerbare bron, allergenencontrole, redactionele beoordeling en import van recepten met geschikte licentie.
- Optionele accounts en apparaatsynchronisatie met duidelijk privacybeleid.
- Weekplanning, voorraadkast, vaste budgetten en betere dealwaardering (onder andere €/kg en bundelacties).

SUPERSCAN is een onafhankelijk project, niet gelieerd aan supermarkten, Checkjebon, PrijsProfeet, HelloFresh of het Voedingscentrum.
