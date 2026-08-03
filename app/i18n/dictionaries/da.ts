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

  "week.prev": "← Forrige",
  "week.next": "Næste →",
  "week.heading": "Uge fra {{date}}",
  "week.manageOffers": "Administrér tilbud",
  "week.family": "Familie",
  "week.signOut": "Log ud",
  "week.loading": "Indlæser…",
  "week.empty": "Der er endnu ikke lavet en plan for denne uge.",
  "week.generating": "Genererer...",
  "week.generate": "Generér ugeplan",
  "week.regeneratingWhole": "Genererer igen...",
  "week.regenerateWhole": "Genskab hele ugen",

  "day.backToWeek": "← Tilbage til ugen",
  "day.swapLabel": "Skift til en anden opskrift",
  "day.choosePlaceholder": "Vælg en opskrift…",

  "dayCard.regenerating": "Genererer...",
  "dayCard.regenerateThisDay": "Genskab denne dag",

  "infant.label": "6 måneder gammel",

  "offers.pageTitle": "Ugens tilbud",
  "offers.backToPlan": "← Tilbage til planen",
  "offers.formHeading": "Ugens tilbud fra REMA 1000",
  "offers.formDescription":
    "Indsæt tilbuds-JSON i referenceformatet (samme felter som REMA's egne lister bruger). Dette erstatter det aktuelt importerede tilbudssæt.",
  "offers.importing": "Importerer...",
  "offers.import": "Importér tilbud",
  "offers.currentlyImported": "Aktuelt importeret ({{count}})",
  "offers.autoFetchHeading": "Automatiske tilbud",
  "offers.autoFetchDescription":
    "Hent REMA 1000's aktuelle tilbud automatisk fra etilbudsavis.dk (en tredjeparts tilbudsavis bygget på Tjek-platformen, ikke selve webshoppen).",
  "offers.fetching": "Henter...",
  "offers.fetchNow": "Hent tilbud nu",
  "offers.fetchError": "Kunne ikke hente tilbud automatisk.",

  "recipes.suggestionsHeading": "Bedste måltider ud fra ugens tilbud",
  "recipes.suggestionsDescription":
    "REMA 1000's egne opskrifter (madogdrikke.rema1000.dk/opskrifter), rangeret efter hvor mange ingredienser der er på tilbud denne uge.",
  "recipes.refreshing": "Opdaterer...",
  "recipes.refresh": "Opdatér opskrifter",
  "recipes.refreshError": "Kunne ikke opdatere opskrifter automatisk.",
  "recipes.none": "Ingen opskrifter hentet endnu — klik på \"Opdatér opskrifter\".",
  "recipes.onOffer": "På tilbud: {{names}}",
  "recipes.viewRecipe": "Se opskrift →",
  "recipes.noMatch": "Ingen ingredienser aktuelt på tilbud.",

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

  "variant.adultsHeading": "Voksne (kaloriereduceret)",
  "variant.childHeading": "Mindre barn (grundret + kalorietæt tilføjelse)",
  "variant.addLabel": "Tilføj {{qty}}{{unit}} {{name}}",

  "family.pageTitle": "Familie",
  "family.nameHeading": "Familienavn",
  "family.namePlaceholder": "Familien Jensen",
  "family.saving": "Gemmer...",
  "family.save": "Gem",
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
