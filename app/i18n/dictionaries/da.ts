/** Danish (default locale) UI strings. Keys are grouped by feature area. */
export const da = {
  "app.title": "Family Meals",

  "error.title.oops": "Ups!",
  "error.details.generic": "Der opstod en uventet fejl.",
  "error.title.404": "404",
  "error.details.404": "Siden blev ikke fundet.",

  "common.password": "Adgangskode",

  "auth.login.heading": "Log ind på Family Meals",
  "auth.login.submitting": "Logger ind...",
  "auth.login.submit": "Log ind",
  "auth.login.noAccount": "Ingen konto endnu?",
  "auth.login.link": "Opret konto",

  "auth.signup.heading": "Opret din Family Meals-konto",
  "auth.signup.submitting": "Opretter konto...",
  "auth.signup.submit": "Opret konto",
  "auth.signup.confirmEmail": "Tjek din indbakke for at bekræfte din e-mail, og log derefter ind.",
  "auth.signup.hasAccount": "Har du allerede en konto?",
  "auth.signup.link": "Log ind",

  "week.prev": "Forrige uge",
  "week.next": "Næste uge",
  "week.kicker": "Ugeplan",
  "week.heading": "Uge fra {{date}}",
  "week.loading": "Indlæser…",
  "week.empty": "Der er endnu ikke lavet en plan for denne uge.",
  "week.generating": "Genererer...",
  "week.generate": "Generér ugeplan",
  "week.regeneratingWhole": "Genererer igen...",
  "week.regenerateWhole": "Genskab hele ugen",
  "week.generateFailed": "Ugeplanen kunne ikke laves. Prøv igen.",
  "week.schemaOutOfDate":
    "Databasen mangler en opdatering, som den nye version af appen har brug for, så det her kan " +
    "ikke lykkes endnu. Kør databasemigrationerne (npm run db:migrate) og prøv så igen.",
  "week.noRecipes": "Der er ingen opskrifter hentet endnu, så der er intet at planlægge med.",
  "week.noRecipesAction": "Hent opskrifter",
  "week.today": "I dag",
  "week.thisWeek": "Denne uge",
  "week.nextWeek": "Næste uge",

  "shoppingList.title": "Indkøbsliste",
  "shoppingList.open": "Se indkøbsliste",
  "shoppingList.noPlan": "Lav en ugeplan først — så samler vi indkøbslisten herfra.",
  "shoppingList.empty":
    "Ugens opskrifter har ingen ingrediensliste, så der er intet at samle. Prøv at genskabe ugen " +
    "fra ugeplanen.",
  "shoppingList.loadFailed": "Indkøbslisten kunne ikke hentes.",
  "shoppingList.retry": "Prøv igen",
  "shoppingList.summary": "{{remaining}} af {{total}} tilbage · {{onOffer}} på tilbud",
  "shoppingList.clearMarks": "Nulstil listen",
  "shoppingList.atHome": "Har vi",
  "shoppingList.atHomeAria": "Vi har allerede {{item}} hjemme",
  "shoppingList.atHomeSummary": "{{count}} har I allerede hjemme og skal ikke købes.",
  "shoppingList.storeTotal": "{{store}}: {{total}} for {{count}} varer på tilbud",
  "shoppingList.priceFrom": "fra {{price}}",
  "shoppingList.sharedWithFamily": "Markeringer deles med resten af familien.",
  "shoppingList.syncPending": "{{count}} markering(er) venter på forbindelse — de sendes automatisk.",
  "shoppingList.syncFailed": "En markering blev ikke gemt, så listen kan se anderledes ud hos de andre.",
  "shoppingList.share": "Del listen",
  "shoppingList.sharing": "Laver link...",
  "shoppingList.shareHeading": "Del indkøbslisten",
  "shoppingList.shareDescription":
    "Send linket til den, der handler — det kræver ingen konto. Alle med linket kan se listen og " +
    "krydse varer af (det er hele pointen), men intet andet: kun denne uges liste, ikke madplanen " +
    "eller andre uger. Du kan tilbagekalde linket når som helst.",
  "shoppingList.createShare": "Lav delelink",
  "shoppingList.shareVia": "Del...",
  "shoppingList.revokeShare": "Tilbagekald link",
  "shoppingList.revoking": "Tilbagekalder...",
  "shoppingList.shareFailed": "Delelinket kunne ikke laves. Prøv igen.",
  "shoppingList.shareNotFound":
    "Dette delelink virker ikke længere — det er enten tilbagekaldt eller aldrig blevet lavet. " +
    "Bed om et nyt.",
  "shoppingList.dept.fruitAndVeg": "Frugt & grønt",
  "shoppingList.dept.breadAndBakery": "Brød & bageri",
  "shoppingList.dept.meatAndFish": "Kød & fisk",
  "shoppingList.dept.dairyAndEggs": "Mejeri & æg",
  "shoppingList.dept.cooling": "Køl",
  "shoppingList.dept.frozen": "Frost",
  "shoppingList.dept.dryGoods": "Kolonial",
  "shoppingList.dept.drinks": "Drikkevarer",
  "shoppingList.dept.other": "Øvrige",
  "shoppingList.otherStore": "Ingen butik fundet",

  "day.backToWeek": "Tilbage til ugen",
  "day.maxTimeLabel": "Maks. tid til forberedelse & tilberedning i dag",
  "day.maxTimeNoLimit": "Ingen grænse",
  "day.maxTimeBadge": "Maks. {{minutes}} min",
  "day.maxTimeSaveFailed": "Kunne ikke gemme — prøv igen.",
  "day.swapLabel": "Skift til en anden opskrift",
  "day.choosePlaceholder": "Søg efter en opskrift…",
  "day.noRecipesFound": "Ingen opskrifter matcher.",
  "day.notFound": "Der er ingen ret planlagt til denne dag.",

  "dayCard.regenerating": "Genererer...",
  "dayCard.regenerateThisDay": "Genskab denne dag",

  "info.close": "Luk",

  "infant.calloutLabel": "Aldersvejledning",
  "infant.label": "6 måneder gammel",
  "infant.note":
    "Denne app planlægger ikke mad til jeres 6 måneder gamle barn. Følg sundhedsplejerskens " +
    "vejledning om overgangen til fast føde. Generelle påmindelser: ingen honning før 12 måneder, " +
    "intet tilsat salt eller sukker før 12 måneder, og hold altid opsyn på grund af risiko for " +
    "kvælning.",

  "offers.pageTitle": "Ugens tilbud",
  "offers.formHeading": "Indsæt tilbud manuelt",
  "offers.formDescription":
    "Indsæt tilbuds-JSON i referenceformatet (samme felter som butikkernes egne lister bruger) for den valgte butik. Dette erstatter den butiks aktuelt importerede tilbudssæt.",
  "offers.importing": "Importerer...",
  "offers.import": "Importér tilbud",
  "offers.thisWeek": "På tilbud denne uge ({{count}})",
  "offers.nextWeek": "På tilbud næste uge ({{count}})",
  "offers.nextWeekEmpty": "Næste uges tilbud er endnu ikke hentet.",
  "offers.weekendOnly": "Kun i weekenden ({{from}}–{{to}})",
  "offers.memberOnly": "Kun for medlemmer",
  "offers.requiresMembership": "Kræver {{store}}+",
  "offers.notFetchedYet": "Ingen tilbud hentet endnu for denne butik.",
  "offers.noStoresSelected": "Du har ikke valgt nogen butikker. Vælg butikker under Bruger & familie.",
  "offers.autoFetchHeading": "Automatiske tilbud",
  "offers.autoFetchDescription":
    "Hent dine valgte butikkers aktuelle tilbud automatisk fra etilbudsavis.dk (en tredjeparts tilbudsavis bygget på Tjek-platformen, ikke butikkernes egne webshops).",
  "offers.fetching": "Henter...",
  "offers.fetchNow": "Hent tilbud nu",
  "offers.fetchError": "Kunne ikke hente tilbud automatisk.",
  "offers.fetchPartialError": "Kunne ikke hente tilbud for: {{stores}}.",
  "offers.snapshotManual": "Indsat manuelt {{date}}.",
  "offers.snapshotAuto": "Hentet fra etilbudsavis.dk {{date}}.",
  "offers.snapshotValidity": "Gælder {{from}}–{{to}}.",
  "offers.snapshotExpired": "{{count}} af tilbuddene er udløbet og bruges ikke længere.",
  "offers.loadFailed": "Kunne ikke indlæse tilbud.",

  "recipes.suggestionsHeading": "Bedste måltider ud fra ugens tilbud",
  "recipes.suggestionsDescription":
    "REMA 1000's egne opskrifter (madogdrikke.rema1000.dk/opskrifter), rangeret efter hvor mange ingredienser der er på tilbud denne uge.",
  "recipes.refreshing": "Opdaterer...",
  "recipes.refresh": "Opdatér opskrifter",
  "recipes.refreshError": "Kunne ikke opdatere opskrifter automatisk.",
  "recipes.none": "Ingen opskrifter hentet endnu — klik på \"Opdatér opskrifter\".",
  "recipes.onOffer": "På tilbud: {{names}}",
  "recipes.viewRecipe": "Se opskrift",
  "recipes.noMatch": "Ingen ingredienser aktuelt på tilbud.",
  "recipes.noIngredientsScraped": "Ingen ingrediensliste fundet for denne opskrift.",
  "recipes.refreshedSummary":
    "{{total}} opskrifter hentet — {{withIngredients}} med ingredienser, {{withInstructions}} med fremgangsmåde.",
  "recipes.refreshedNoIngredients":
    "{{total}} opskrifter hentet, men ingen havde en læsbar ingrediensliste, så tilbud kan ikke rangere dem.",
  "recipes.refreshedCoverage":
    "{{recipes}} af {{total}} opskrifter i temaet \"{{theme}}\" ({{pages}} sider hentet).",
  "recipes.refreshedPagesSkipped": "Sider der ikke kunne hentes: {{pages}}.",

  // Bottom-nav labels: these have to fit on one line under an icon, in a
  // quarter of the narrowest phone. "Bruger & familie" is the longest at 77px
  // of an 80px column at 320px — check any change to it at that width.
  "nav.plan": "Uge",
  "nav.recipes": "Opskrifter",
  "nav.offers": "Tilbud",
  "nav.shoppingList": "Indkøb",
  "nav.family": "Bruger & familie",
  "nav.primary": "Hovedmenu",

  "suggestions.sortLabel": "Sortering",
  "suggestions.sort.balanced": "Balanceret",
  "suggestions.sort.offers": "På tilbud",
  "suggestions.sort.calories": "Færrest kalorier",
  "suggestions.vegetarianOnly": "Kun vegetarisk",
  "suggestions.explain.balanced":
    "Vejer ugens tilbud, kalorier pr. portion og kødfri retter sammen.",
  "suggestions.explain.offers": "Flest ingredienser på tilbud først — kalorier afgør ved uafgjort.",
  "suggestions.explain.calories":
    "Færrest kalorier pr. portion først. REMA oplyser ikke næringsindhold, så tallet kommer fra " +
    "FatSecrets fødevaredatabase, når en ingrediens kan slås op der, og ellers fra et skøn ud fra " +
    "ingredienslisten.",
  "suggestions.kcalPerServing": "~{{kcal}} kcal/portion (skøn)",
  "suggestions.kcalPerServingMeasured": "{{kcal}} kcal/portion",
  "suggestions.proteinPerServing": "{{grams}} g protein/portion",
  "suggestions.vegetarian": "Kødfri",
  "suggestions.weekendOnly": "Kun i weekenden: {{offers}}",
  "suggestions.noneVegetarian":
    "Ingen af de hentede opskrifter er kødfri. Prøv at slå filteret fra, eller hent opskrifterne igen.",
  "suggestions.loadFailed": "Forslagene kunne ikke hentes.",
  "suggestions.prevPage": "Forrige side",
  "suggestions.nextPage": "Næste side",
  "suggestions.page": "Side {{page}} af {{pages}}",
  "suggestions.flagWrongMatch": "Forkert match — denne vare passer ikke til ingrediensen",
  "suggestions.unflagWrongMatch": "Fjern markering som forkert match",
  "suggestions.flagFailed": "Markeringen kunne ikke gemmes.",
  "suggestions.onShoppingList": "På indkøbslisten",
  "suggestions.addToShoppingList": "Tilføj til indkøbsliste",
  "suggestions.addToShoppingListFailed": "Kunne ikke tilføjes til indkøbslisten.",
  "suggestions.unmarkAtHome": "Vi mangler den alligevel",

  // Næringsindhold, fra FatSecrets fødevaredatabase — se app/domain/nutrition.
  // Ordvalget bærer den skelnen, panelet findes for: et målt tal står som et
  // tal, et skønnet tal må aldrig komme til at ligne et.
  "nutrition.heading": "Næringsindhold pr. portion",
  "nutrition.energy": "Energi",
  "nutrition.protein": "Protein",
  "nutrition.fat": "Fedt",
  "nutrition.carbs": "Kulhydrat",
  "nutrition.kcal": "{{value}} kcal",
  "nutrition.kcalApprox": "~{{value}} kcal",
  "nutrition.grams": "{{value}} g",
  "nutrition.measured":
    "Fra FatSecrets fødevaredatabase, som dækker {{percent}}% af ingredienslinjerne.",
  "nutrition.partial":
    "Kun kalorier: FatSecret dækker {{percent}}% af ingredienslinjerne, og protein og fedt siger " +
    "først noget fra to tredjedele. Resten er skønnet ud fra ingredienslisten.",
  "nutrition.estimated":
    "Skønnet ud fra ingredienslisten — REMA oplyser ikke næringsindhold, og der er endnu ikke " +
    "hentet data fra FatSecret.",
  "nutrition.servingsAssumed": "Antal portioner er ikke oplyst, så her er regnet med {{count}}.",
  "nutrition.refresh": "Hent næringsindhold ({{missing}} ingredienser mangler)",
  "nutrition.refreshing": "Henter næringsindhold…",
  "nutrition.upToDate": "Næringsindholdet er hentet",
  "nutrition.coverage":
    "{{matched}} af {{terms}} ingredienser har næringsindhold ({{unmatched}} blev ikke fundet).",
  "nutrition.refreshed":
    "Slog {{lookedUp}} ingredienser op — {{matched}} fundet, {{remaining}} mangler stadig.",
  "nutrition.refreshFailures": "{{count}} opslag fejlede: {{message}}",
  "nutrition.refreshError": "Næringsindholdet kunne ikke hentes.",
  "nutrition.notConfigured":
    "Der er ikke sat en FatSecret-nøgle op, så kalorier er skønnet ud fra ingredienslisten, og der " +
    "er ingen tal for protein og fedt.",

  "recipesPage.heading": "Opskrifter",
  "recipesPage.title": "Alle opskrifter",
  "recipesPage.searchLabel": "Søg på navn eller ingrediens",
  "recipesPage.searchPlaceholder": "f.eks. broccoli, laks…",
  "recipesPage.clearFilters": "Ryd filtre",
  "recipesPage.resultCount": "{{count}} opskrift(er)",
  "recipesPage.none": "Ingen opskrifter matcher disse filtre.",

  "recipeImport.formHeading": "Importér opskrift fra link",
  "recipeImport.formDescription":
    "Indsæt et link til en opskrift på en hvilken som helst hjemmeside. Fungerer for sider der bruger det gængse opskriftsformat (schema.org/Recipe) til Googles søgeresultater.",
  "recipeImport.urlPlaceholder": "https://…",
  "recipeImport.importing": "Importerer...",
  "recipeImport.import": "Importér",
  "recipeImport.success": "Importeret: {{title}}",
  "recipeImport.genericError": "Kunne ikke importere opskriften.",

  "recipeDetail.backToRecipes": "Tilbage til opskrifter",
  "recipeDetail.notFound": "Denne opskrift findes ikke.",
  "recipeDetail.ingredientsHeading": "Ingredienser",
  "recipeDetail.instructionsHeading": "Fremgangsmåde",
  "recipeDetail.viewOriginal": "Se den originale opskrift →",
  "recipeDetail.servings": "{{count}} portioner",
  "recipeDetail.totalTime": "{{minutes}} min",
  "recipeDetail.prepTime": "{{minutes}} min forberedelse",
  "recipeDetail.cookTime": "{{minutes}} min tilberedning",
  // Shown wherever a recipe is — the "~" and "(skøn)" are not decoration:
  // REMA publishes no nutrition data, so this is computed from the
  // ingredient lines and must never read as a measured figure.
  "recipeDetail.kcalPerServing": "~{{kcal}} kcal/portion (skøn)",
  "recipeDetail.onOfferBadge": "På tilbud",
  "recipeDetail.onOfferCount": "{{count}} ingrediens(er) på tilbud",
  "recipeDetail.onOfferPrice": "{{price}} hos {{store}}",
  "recipeDetail.importedFrom": "Importeret fra {{source}}",
  "recipeDetail.noIngredients":
    "Der blev ikke fundet en ingrediensliste til denne opskrift — åbn den hos REMA 1000 nedenfor.",
  "recipeDetail.delete": "Slet importeret opskrift",
  "recipeDetail.deleting": "Sletter…",
  "recipeDetail.deleteConfirm": "Slet denne importerede opskrift? Det kan ikke fortrydes.",

  "day.viewRecipe": "Se hele opskriften",
  "day.viewOnRema": "Se den oprindelige opskrift ↗",

  "share.button.week": "Del ugen",
  "share.button.day": "Del dagen",
  "share.button.recipe": "Del opskriften",
  "share.heading.week": "Del ugens madplan",
  "share.heading.day": "Del dagens ret",
  "share.heading.recipe": "Del opskriften",
  "share.description.week":
    "Send linket til hvem som helst — det kræver ingen konto. De kan se ugens syv middage, " +
    "men ikke ændre noget, og linket viser altid planen som den er lige nu. Du kan " +
    "tilbagekalde det når som helst.",
  "share.description.day":
    "Send linket til hvem som helst — det kræver ingen konto. De kan se dagens ret med " +
    "ingredienser, fremgangsmåde og begge tallerkener (voksen og barn), men ikke ændre noget. " +
    "Bytter I retten senere, følger linket med.",
  "share.description.recipe":
    "Send linket til hvem som helst — det kræver ingen konto. De kan se hele opskriften, men " +
    "ikke resten af jeres madplan.",
  "share.creating": "Laver link...",
  "share.failed": "Delelinket kunne ikke laves. Prøv igen.",
  "share.revoke": "Tilbagekald link",
  "share.revoking": "Tilbagekalder...",
  "share.close": "Luk",
  "share.sharedBy": "Delt fra Family Meals",
  "share.sharedByFamily": "Delt af {{family}}",
  "share.loadFailed": "Det delte indhold kunne ikke hentes.",
  "share.notFound":
    "Dette delelink virker ikke længere — det er enten tilbagekaldt eller aldrig blevet lavet. " +
    "Bed om et nyt.",
  "share.gone.week": "Der er ikke lavet en madplan for denne uge (endnu). Prøv igen senere.",
  "share.gone.day": "Der er ikke længere planlagt en ret til denne dag.",
  "share.gone.recipe": "Denne opskrift findes ikke længere.",
  "share.madeWith": "Lavet med",

  "cook.open": "Køkkentilstand",
  "cook.exit": "Afslut køkkentilstand",
  "cook.stepCounter": "Trin {{current}} af {{total}}",
  "cook.previous": "← Forrige",
  "cook.next": "Næste →",
  "cook.finish": "Færdig ✓",
  "cook.tickedCount": "{{ticked}}/{{total}}",
  "cook.servingHeading": "Servering",
  "cook.servingIntro": "Grundretten er den samme — det her er forskellen på tallerkenerne.",
  "cook.viewLabel": "Visning",
  "cook.viewSteps": "Trin for trin",
  "cook.viewAll": "Hele opskriften",
  "cook.viewSaveFailed": "Visningen blev ikke gemt, men gælder her.",
  "cook.keepAwakeLabel": "Hold skærmen tændt",
  "cook.keepAwakeStatusOn": "Skærmen holdes tændt, mens du laver mad.",
  "cook.keepAwakeStatusOff": "Skærmen slukker som normalt.",
  "cook.keepAwakeUnsupported": "Denne browser kan ikke holde skærmen tændt, så den slukker som normalt.",
  "cook.keepAwakeRefused":
    "Browseren ville ikke holde skærmen tændt — tjek om batterisparefunktionen er slået til, og prøv igen.",
  "cook.noMethod": "Der blev ikke fundet en fremgangsmåde til denne opskrift.",
  "cook.nothingToCook": "Denne opskrift har hverken ingredienser eller fremgangsmåde at lave mad efter.",
  "cook.notFound": "Der er ingen opskrift at lave mad efter her.",

  "calendar.subscribeButton": "Abonnér i din kalenderapp",
  "calendar.modalHeading": "Abonnér på din madplan-kalender",
  "calendar.modalDescription":
    "Dette link er unikt for din familie — alle med linket kan se (men ikke redigere) din madplan, så hold det privat. Du kan til enhver tid generere et nyt link, hvis det bliver delt ved en fejl.",
  "calendar.apple": "Apple Kalender: Arkiv → Nyt kalenderabonnement, indsæt linket ovenfor.",
  "calendar.google": "Google Kalender: Andre kalendere → Fra URL, indsæt https://-versionen nedenfor.",
  "calendar.outlook": "Outlook: Tilføj kalender → Abonnér fra internettet, indsæt linket ovenfor.",
  "calendar.refreshNote":
    "Kalenderapps opdaterer abonnementer efter deres egen tidsplan (ofte højst nogle få gange om dagen) — ændringer her vil altid være korrekte på dette link, men din kalenderapp kan være et stykke tid om at hente dem.",
  "calendar.close": "Luk",
  "calendar.copy": "Kopiér",
  "calendar.copied": "Kopieret",

  "variant.adultsHeading": "Voksne (kaloriereduceret)",
  "variant.childHeading": "Mindre barn (grundret + kalorietæt tilføjelse)",
  "variant.addLabel": "Tilføj {{qty}}{{unit}} {{name}}",
  "variant.notCurated": "Der er endnu ingen kalorievejledning til denne opskrift — juster portionerne manuelt.",
  "variant.guidanceMissingLabel": "Vejledning mangler for denne ret",

  "family.pageTitle": "Bruger & familie",
  "family.accountHeading": "Bruger",
  "family.signedInAs": "Logget ind som {{email}}",
  "family.signOut": "Log ud",
  "family.yourFamiliesHeading": "Dine familier",
  "family.switch": "Skift",
  "family.active": "Aktiv",
  "family.nameHeading": "Familienavn",
  "family.namePlaceholder": "Familien Jensen",
  "family.saving": "Gemmer...",
  "family.save": "Gem",
  "family.storesHeading": "Butikker",
  "family.storesDescription": "Vælg hvilke butikker din familie handler i, og markér dem hvor I har medlemskab.",
  "family.hasMembership": "Har {{store}}",
  "family.membersHeading": "Medlemmer",
  "family.inviteHeading": "Invitér et familiemedlem",
  "family.inviteDescription":
    "Send linket til den person, du inviterer — de skal oprette en konto eller logge ind for at tilslutte sig jeres delte madplan.",
  "family.inviting": "Inviterer...",
  "family.invite": "Invitér",
  "family.revoke": "Tilbagekald",

  "invite.heading": "Du er inviteret til {{family}}",
  "invite.aFamily": "en familie",
  "invite.signInPrompt": "Opret en konto eller log ind for at acceptere invitationen.",
  "invite.accept": "Tilslut dig familien",
  "invite.accepting": "Tilslutter...",
  "invite.notFound": "Denne invitation findes ikke.",
  "invite.expired": "Denne invitation er udløbet.",
  "invite.revoked": "Denne invitation er blevet tilbagekaldt.",
  "invite.alreadyAccepted": "Denne invitation er allerede blevet accepteret.",
} satisfies Record<string, string>;
