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

  "week.prev": "← Prev",
  "week.next": "Next →",
  "week.heading": "Week of {{date}}",
  "week.manageOffers": "Manage offers",
  "week.family": "Family",
  "week.signOut": "Sign out",
  "week.loading": "Loading…",
  "week.empty": "No plan generated for this week yet.",
  "week.generating": "Generating...",
  "week.generate": "Generate week plan",
  "week.regeneratingWhole": "Regenerating...",
  "week.regenerateWhole": "Regenerate whole week",

  "day.backToWeek": "← Back to week",
  "day.swapLabel": "Swap to a different recipe",
  "day.choosePlaceholder": "Choose a recipe…",

  "dayCard.regenerating": "Regenerating...",
  "dayCard.regenerateThisDay": "Regenerate this day",

  "infant.label": "6-month-old",

  "offers.pageTitle": "Weekly offers",
  "offers.backToPlan": "← Back to plan",
  "offers.formHeading": "This week's REMA 1000 offers",
  "offers.formDescription":
    "Paste offer JSON in the reference schema shape (same fields REMA's own listings use). This replaces the currently-imported offer set.",
  "offers.importing": "Importing...",
  "offers.import": "Import offers",
  "offers.currentlyImported": "Currently imported ({{count}})",
  "offers.autoFetchHeading": "Automatic offers",
  "offers.autoFetchDescription":
    "Fetch REMA 1000's current offers automatically from etilbudsavis.dk (a third-party tilbudsavis built on the Tjek platform, not the webshop itself).",
  "offers.fetching": "Fetching...",
  "offers.fetchNow": "Fetch offers now",
  "offers.fetchError": "Could not fetch offers automatically.",

  "recipes.suggestionsHeading": "Best meals from this week's offers",
  "recipes.suggestionsDescription":
    "REMA 1000's own recipes (madogdrikke.rema1000.dk/opskrifter), ranked by how many ingredients are on offer this week.",
  "recipes.refreshing": "Refreshing...",
  "recipes.refresh": "Refresh recipes",
  "recipes.refreshError": "Could not refresh recipes automatically.",
  "recipes.none": "No recipes cached yet — click \"Refresh recipes\".",
  "recipes.onOffer": "On offer: {{names}}",
  "recipes.viewRecipe": "View recipe →",
  "recipes.noMatch": "No ingredients currently on offer.",

  "week.recipes": "Recipes",

  "recipesPage.title": "All recipes",
  "recipesPage.searchLabel": "Search by name or ingredient",
  "recipesPage.searchPlaceholder": "e.g. broccoli, salmon…",
  "recipesPage.clearFilters": "Clear filters",
  "recipesPage.resultCount": "{{count}} recipe(s)",
  "recipesPage.none": "No recipes match these filters.",

  "recipeDetail.backToRecipes": "← Back to recipes",
  "recipeDetail.notFound": "This recipe doesn't exist.",
  "recipeDetail.ingredientsHeading": "Ingredients",
  "recipeDetail.instructionsHeading": "Instructions",
  "recipeDetail.relatedHeading": "Matching REMA 1000 recipes",
  "recipeDetail.relatedDescription":
    "REMA 1000's own recipes (madogdrikke.rema1000.dk/opskrifter) that share ingredients with this dish.",
  "recipeDetail.relatedNone": "No matching REMA 1000 recipes found — try refreshing recipes from the offers page.",

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

  "variant.adultsHeading": "Adults (calorie-minimized)",
  "variant.childHeading": "Toddler (base dish + calorie-dense addition)",
  "variant.addLabel": "Add {{qty}}{{unit}} {{name}}",

  "family.pageTitle": "Family",
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
