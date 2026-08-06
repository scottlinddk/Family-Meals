import type { da } from "~/i18n/dictionaries/da";

/** English UI strings — kept as a fallback locale; Danish (`da`) is the default. */
export const en: Record<keyof typeof da, string> = {
  "app.title": "Family Meals",

  "error.title.oops": "Oops!",
  "error.details.generic": "An unexpected error occurred.",
  "error.title.404": "404",
  "error.details.404": "The requested page could not be found.",

  "common.password": "Password",

  "auth.login.heading": "Sign in to Family Meals",
  "auth.login.submitting": "Signing in...",
  "auth.login.submit": "Sign in",
  "auth.login.noAccount": "No account yet?",
  "auth.login.link": "Sign up",

  "auth.signup.heading": "Create your Family Meals account",
  "auth.signup.submitting": "Signing up...",
  "auth.signup.submit": "Sign up",
  "auth.signup.confirmEmail": "Check your inbox to confirm your email, then sign in.",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.signup.link": "Sign in",

  "week.prev": "Previous week",
  "week.next": "Next week",
  "week.kicker": "Week plan",
  "week.heading": "Week of {{date}}",
  "week.loading": "Loading…",
  "week.empty": "No plan generated for this week yet.",
  "week.generating": "Generating...",
  "week.generate": "Generate week plan",
  "week.regeneratingWhole": "Regenerating...",
  "week.regenerateWhole": "Regenerate whole week",
  "week.generateFailed": "The week plan couldn't be generated. Try again.",
  "week.schemaOutOfDate":
    "The database is missing an update the new version of the app needs, so this can't succeed " +
    "yet. Run the database migrations (npm run db:migrate), then try again.",
  "week.noRecipes": "No recipes have been fetched yet, so there's nothing to plan with.",
  "week.noRecipesAction": "Fetch recipes",
  "week.today": "Today",

  "shoppingList.title": "Shopping list",
  "shoppingList.open": "Open shopping list",
  "shoppingList.noPlan": "Generate a week plan first — the shopping list is built from it.",
  "shoppingList.empty":
    "This week's recipes carry no ingredient lists, so there's nothing to collect. Try " +
    "regenerating the week from the week plan.",
  "shoppingList.loadFailed": "The shopping list couldn't be loaded.",
  "shoppingList.retry": "Try again",
  "shoppingList.summary": "{{remaining}} of {{total}} left · {{onOffer}} on offer",
  "shoppingList.clearMarks": "Reset list",
  "shoppingList.atHome": "Have it",
  "shoppingList.atHomeAria": "We already have {{item}} at home",
  "shoppingList.atHomeSummary": "{{count}} you already have at home, so don't buy them.",
  "shoppingList.sharedWithFamily": "Marks are shared with the rest of the family.",
  "shoppingList.syncPending": "{{count}} mark(s) waiting for a connection — they'll send themselves.",
  "shoppingList.syncFailed": "A mark wasn't saved, so the others may be seeing a different list.",
  "shoppingList.share": "Share list",
  "shoppingList.sharing": "Creating link...",
  "shoppingList.shareHeading": "Share the shopping list",
  "shoppingList.shareDescription":
    "Send the link to whoever's doing the shopping — no account needed. Anyone with the link can " +
    "see the list and tick items off (that's the point), but nothing else: this week's list only, " +
    "not the meal plan or other weeks. You can revoke it at any time.",
  "shoppingList.createShare": "Create share link",
  "shoppingList.shareVia": "Share...",
  "shoppingList.revokeShare": "Revoke link",
  "shoppingList.revoking": "Revoking...",
  "shoppingList.shareFailed": "The share link couldn't be created. Try again.",
  "shoppingList.shareNotFound":
    "This share link no longer works — it's been revoked, or it never existed. Ask for a new one.",
  "shoppingList.dept.fruitAndVeg": "Fruit & veg",
  "shoppingList.dept.breadAndBakery": "Bread & bakery",
  "shoppingList.dept.meatAndFish": "Meat & fish",
  "shoppingList.dept.dairyAndEggs": "Dairy & eggs",
  "shoppingList.dept.cooling": "Chilled",
  "shoppingList.dept.frozen": "Frozen",
  "shoppingList.dept.dryGoods": "Dry goods",
  "shoppingList.dept.drinks": "Drinks",
  "shoppingList.dept.other": "Other",

  "day.backToWeek": "Back to week",
  "day.swapLabel": "Swap to a different recipe",
  "day.choosePlaceholder": "Choose a recipe…",
  "day.notFound": "There's no meal planned for this day.",

  "dayCard.regenerating": "Regenerating...",
  "dayCard.regenerateThisDay": "Regenerate this day",

  "info.close": "Close",

  "infant.calloutLabel": "Age guidance",
  "infant.label": "6-month-old",
  "infant.note":
    "This app does not plan meals for your 6-month-old. Follow your health visitor's " +
    "(sundhedsplejerske) guidance on introducing solid food. General reminders: no honey before " +
    "12 months, no added salt or sugar before 12 months, and always supervise for choking hazards.",

  "offers.pageTitle": "Weekly offers",
  "offers.formHeading": "This week's REMA 1000 offers",
  "offers.formDescription":
    "Paste offer JSON in the reference schema shape (same fields REMA's own listings use). This replaces the currently-imported offer set.",
  "offers.importing": "Importing...",
  "offers.import": "Import offers",
  "offers.thisWeek": "On offer this week ({{count}})",
  "offers.nextWeek": "On offer next week ({{count}})",
  "offers.nextWeekEmpty": "Next week's offers haven't been fetched yet.",
  "offers.weekendOnly": "Weekend only ({{from}}–{{to}})",
  "offers.autoFetchHeading": "Automatic offers",
  "offers.autoFetchDescription":
    "Fetch REMA 1000's current offers automatically from etilbudsavis.dk (a third-party tilbudsavis built on the Tjek platform, not the webshop itself).",
  "offers.fetching": "Fetching...",
  "offers.fetchNow": "Fetch offers now",
  "offers.fetchError": "Could not fetch offers automatically.",
  "offers.snapshotManual": "Pasted manually on {{date}}.",
  "offers.snapshotAuto": "Fetched from etilbudsavis.dk on {{date}}.",
  "offers.snapshotValidity": "Valid {{from}}–{{to}}.",
  "offers.snapshotExpired": "{{count}} of them have expired and are no longer used.",
  "offers.loadFailed": "Could not load offers.",

  "recipes.suggestionsHeading": "Best meals from this week's offers",
  "recipes.suggestionsDescription":
    "REMA 1000's own recipes (madogdrikke.rema1000.dk/opskrifter), ranked by how many ingredients are on offer this week.",
  "recipes.refreshing": "Refreshing...",
  "recipes.refresh": "Refresh recipes",
  "recipes.refreshError": "Could not refresh recipes automatically.",
  "recipes.none": "No recipes cached yet — click \"Refresh recipes\".",
  "recipes.onOffer": "On offer: {{names}}",
  "recipes.viewRecipe": "View recipe",
  "recipes.noMatch": "No ingredients currently on offer.",
  "recipes.noIngredientsScraped": "No ingredient list found for this recipe.",
  "recipes.refreshedSummary":
    "{{total}} recipes fetched — {{withIngredients}} with ingredients, {{withInstructions}} with a method.",
  "recipes.refreshedNoIngredients":
    "{{total}} recipes fetched, but none had a readable ingredient list, so offer matching cannot rank them.",
  "recipes.refreshedCoverage":
    "{{recipes}} of {{total}} recipes in the \"{{theme}}\" theme ({{pages}} pages fetched).",
  "recipes.refreshedPagesSkipped": "Pages that could not be fetched: {{pages}}.",

  // Bottom-nav labels: these have to fit on one line under an icon, in a
  // quarter of the narrowest phone — see the Danish dictionary, whose longest
  // label ("Bruger & familie") is the one that sets the budget.
  "nav.plan": "Week",
  "nav.recipes": "Recipes",
  "nav.offers": "Offers",
  "nav.shoppingList": "Shopping",
  "nav.family": "User & family",
  "nav.primary": "Main menu",

  "suggestions.sortLabel": "Sort by",
  "suggestions.sort.balanced": "Balanced",
  "suggestions.sort.offers": "On offer",
  "suggestions.sort.calories": "Fewest calories",
  "suggestions.vegetarianOnly": "Meat-free only",
  "suggestions.explain.balanced":
    "Weighs this week's offers, calories per serving and meat-free dishes together.",
  "suggestions.explain.offers": "Most ingredients on offer first — calories break the ties.",
  "suggestions.explain.calories":
    "Fewest calories per serving first. The figure is estimated from the ingredient list — REMA " +
    "publishes no nutrition data.",
  "suggestions.vegetarian": "Meat-free",
  "suggestions.weekendOnly": "Weekend only: {{offers}}",
  "suggestions.noneVegetarian":
    "None of the fetched recipes are meat-free. Try turning the filter off, or refresh the recipes.",
  "suggestions.loadFailed": "The suggestions couldn't be loaded.",
  "suggestions.prevPage": "Previous page",
  "suggestions.nextPage": "Next page",
  "suggestions.page": "Page {{page}} of {{pages}}",

  "recipesPage.heading": "Recipes",
  "recipesPage.title": "All recipes",
  "recipesPage.searchLabel": "Search by name or ingredient",
  "recipesPage.searchPlaceholder": "e.g. broccoli, salmon…",
  "recipesPage.clearFilters": "Clear filters",
  "recipesPage.resultCount": "{{count}} recipe(s)",
  "recipesPage.none": "No recipes match these filters.",

  "recipeDetail.backToRecipes": "Back to recipes",
  "recipeDetail.notFound": "This recipe doesn't exist.",
  "recipeDetail.ingredientsHeading": "Ingredients",
  "recipeDetail.instructionsHeading": "Instructions",
  "recipeDetail.viewOriginal": "View original recipe on REMA 1000 →",
  "recipeDetail.servings": "{{count}} servings",
  "recipeDetail.totalTime": "{{minutes}} min",
  // Shown wherever a recipe is — the "~" and "(estimate)" are not decoration:
  // REMA publishes no nutrition data, so this is computed from the
  // ingredient lines and must never read as a measured figure.
  "recipeDetail.kcalPerServing": "~{{kcal}} kcal/serving (estimate)",
  "recipeDetail.onOfferBadge": "On offer",
  "recipeDetail.onOfferCount": "{{count}} ingredient(s) on offer",
  "recipeDetail.noIngredients":
    "No ingredient list was found for this recipe — open it on REMA 1000 below.",

  "day.viewRecipe": "See the full recipe",
  "day.viewOnRema": "Open on REMA 1000 ↗",

  "share.button.week": "Share week",
  "share.button.day": "Share day",
  "share.button.recipe": "Share recipe",
  "share.heading.week": "Share the week's meal plan",
  "share.heading.day": "Share this day's dinner",
  "share.heading.recipe": "Share the recipe",
  "share.description.week":
    "Send the link to anyone — no account needed. They can see the week's seven dinners but " +
    "change nothing, and the link always shows the plan as it stands right now. You can revoke " +
    "it at any time.",
  "share.description.day":
    "Send the link to anyone — no account needed. They can see the day's dish with its " +
    "ingredients, method and both plates (adult and child), but change nothing. Swap the dish " +
    "later and the link follows.",
  "share.description.recipe":
    "Send the link to anyone — no account needed. They can see the whole recipe, but nothing " +
    "else of your meal plan.",
  "share.creating": "Creating link...",
  "share.failed": "The share link couldn't be created. Try again.",
  "share.revoke": "Revoke link",
  "share.revoking": "Revoking...",
  "share.close": "Close",
  "share.sharedBy": "Shared from Family Meals",
  "share.sharedByFamily": "Shared by {{family}}",
  "share.loadFailed": "The shared content couldn't be loaded.",
  "share.notFound":
    "This share link no longer works — it has either been revoked or never existed. Ask for a " +
    "new one.",
  "share.gone.week": "No meal plan has been made for this week (yet). Try again later.",
  "share.gone.day": "There's no longer a dish planned for this day.",
  "share.gone.recipe": "This recipe no longer exists.",
  "share.madeWith": "Made with",

  "cook.open": "Cook mode",
  "cook.exit": "Exit cook mode",
  "cook.stepCounter": "Step {{current}} of {{total}}",
  "cook.previous": "← Previous",
  "cook.next": "Next →",
  "cook.finish": "Done ✓",
  "cook.tickedCount": "{{ticked}}/{{total}}",
  "cook.servingHeading": "Serving",
  "cook.servingIntro": "The base dish is the same — this is what differs on the plates.",
  "cook.viewLabel": "Layout",
  "cook.viewSteps": "Step by step",
  "cook.viewAll": "Whole recipe",
  "cook.viewSaveFailed": "The layout wasn't saved, but applies here.",
  "cook.keepAwakeLabel": "Keep the screen on",
  "cook.keepAwakeStatusOn": "The screen stays on while you cook.",
  "cook.keepAwakeStatusOff": "The screen sleeps as usual.",
  "cook.keepAwakeUnsupported": "This browser can't keep the screen on, so it will sleep as usual.",
  "cook.keepAwakeRefused":
    "The browser wouldn't keep the screen on — check whether battery saver is on, then try again.",
  "cook.noMethod": "No method was found for this recipe.",
  "cook.nothingToCook": "This recipe has neither ingredients nor a method to cook from.",
  "cook.notFound": "There's no recipe to cook here.",

  "calendar.subscribeButton": "Subscribe in your calendar app",
  "calendar.modalHeading": "Subscribe to your meal calendar",
  "calendar.modalDescription":
    "This link is unique to your family — anyone with it can see (but not edit) your meal plan, so keep it private. You can rotate it any time if it leaks.",
  "calendar.apple": "Apple Calendar: File → New Calendar Subscription, paste the link above.",
  "calendar.google": "Google Calendar: Other calendars → From URL, paste the https:// version below.",
  "calendar.outlook": "Outlook: Add calendar → Subscribe from web, paste the link above.",
  "calendar.refreshNote":
    "Calendar apps refresh subscriptions on their own schedule (often not more than a few times a day) — edits here will always be correct at this link, but your calendar app may take a while to pick them up.",
  "calendar.close": "Close",
  "calendar.copy": "Copy",
  "calendar.copied": "Copied",

  "variant.adultsHeading": "Adults (calorie-minimized)",
  "variant.childHeading": "Toddler (base dish + calorie-dense addition)",
  "variant.addLabel": "Add {{qty}}{{unit}} {{name}}",
  "variant.notCurated": "No calorie guidance is available for this recipe yet — adjust portions manually.",
  "variant.guidanceMissingLabel": "Guidance missing for this dish",

  "family.pageTitle": "User & family",
  "family.accountHeading": "User",
  "family.signedInAs": "Signed in as {{email}}",
  "family.signOut": "Sign out",
  "family.yourFamiliesHeading": "Your families",
  "family.switch": "Switch",
  "family.active": "Active",
  "family.nameHeading": "Family name",
  "family.namePlaceholder": "The Smiths",
  "family.saving": "Saving...",
  "family.save": "Save",
  "family.membersHeading": "Members",
  "family.inviteHeading": "Invite a family member",
  "family.inviteDescription":
    "Send the link to the person you're inviting — they'll need to sign up or log in to join your shared meal plan.",
  "family.inviting": "Inviting...",
  "family.invite": "Invite",
  "family.revoke": "Revoke",

  "invite.heading": "You're invited to {{family}}",
  "invite.aFamily": "a family",
  "invite.signInPrompt": "Sign up or log in to accept the invite.",
  "invite.accept": "Join the family",
  "invite.accepting": "Joining...",
  "invite.notFound": "This invite doesn't exist.",
  "invite.expired": "This invite has expired.",
  "invite.revoked": "This invite has been revoked.",
  "invite.alreadyAccepted": "This invite has already been accepted.",
};
