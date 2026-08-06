import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Every signed-in page shares one layout: the auth guard plus the top nav
  // (which collapses into the mobile menu below `sm`) and the content column.
  layout("routes/_app.tsx", [
    route("weeks/:weekStart", "routes/weeks.$weekStart.tsx"),
    route("weeks/:weekStart/day/:day", "routes/weeks.$weekStart.day.$day.tsx"),
    route("weeks/:weekStart/shopping-list", "routes/weeks.$weekStart.shopping-list.tsx"),
    // Fixed entry point for the installed app's shortcut — bounces to the
    // current week's list, the way `/` bounces to the current week's plan.
    route("shopping-list", "routes/shopping-list.tsx"),
    route("offers", "routes/offers.tsx"),
    route("recipes", "routes/recipes.tsx"),
    route("recipes/:id", "routes/recipes.$id.tsx"),
    route("family", "routes/family.tsx"),
  ]),

  // Cook mode: same auth guard, none of the chrome — the focused, one-step-
  // at-a-time view that holds the screen awake at the stove.
  layout("routes/_cook.tsx", [
    route("weeks/:weekStart/day/:day/cook", "routes/weeks.$weekStart.day.$day.cook.tsx"),
    route("recipes/:id/cook", "routes/recipes.$id.cook.tsx"),
  ]),

  // Reachable signed out — the invite target renders its own sign-in prompt.
  route("invite/:token", "routes/invite.$token.tsx"),

  // A week's shopping list, shared out to whoever is doing the shopping.
  // Authenticated by the opaque token in the path rather than a session, like
  // the ICS feed below — the person in the shop may not have an account.
  route("list/:token", "routes/list.$token.tsx"),

  // The read-only twin of the pages above: a week, a day or a recipe, handed
  // to someone who has no account and isn't being asked to get one. Same
  // token-in-the-path model, and nothing here can be written back.
  route("share/:token", "routes/share.$token.tsx"),

  // Live ICS subscription feed — a resource route (no HTML), authenticated
  // by the opaque token in the path rather than a Supabase Auth session.
  route("calendar/:token.ics", "routes/calendar.$token[.]ics.tsx"),

  // JSON resource routes backing the TanStack Query hooks in ui/hooks.
  route("api/weeks/:weekStart", "routes/api.weeks.$weekStart.tsx"),
  route("api/weeks/:weekStart/day/:day", "routes/api.weeks.$weekStart.day.$day.tsx"),
  route("api/weeks/:weekStart/regenerate-day", "routes/api.weeks.$weekStart.regenerate-day.tsx"),
  route("api/weeks/:weekStart/swap-day", "routes/api.weeks.$weekStart.swap-day.tsx"),
  route("api/weeks/:weekStart/shopping-list", "routes/api.weeks.$weekStart.shopping-list.tsx"),
  route("api/weeks/:weekStart/shopping-list/marks", "routes/api.weeks.$weekStart.shopping-list.marks.tsx"),
  route("api/weeks/:weekStart/shopping-list/share", "routes/api.weeks.$weekStart.shopping-list.share.tsx"),
  // Token-authenticated twins of the two routes above, for the share link.
  route("api/shopping-list/:token", "routes/api.shopping-list.$token.tsx"),
  route("api/shopping-list/:token/marks", "routes/api.shopping-list.$token.marks.tsx"),
  // Issuing/revoking `/share/{token}` links (session), and reading one (token).
  route("api/shares", "routes/api.shares.tsx"),
  route("api/shared/:token", "routes/api.shared.$token.tsx"),
  route("api/offers", "routes/api.offers.tsx"),
  route("api/offers/refresh", "routes/api.offers.refresh.tsx"),
  route("api/recipes", "routes/api.recipes.tsx"),
  route("api/recipes/refresh", "routes/api.recipes.refresh.tsx"),
  route("api/recipes/suggestions", "routes/api.recipes.suggestions.tsx"),
  route("api/recipes/diagnose", "routes/api.recipes.diagnose.tsx"),
  route("api/recipes/:id", "routes/api.recipes.$id.tsx"),
  // Reads the nutrition cache's coverage (GET) and fills it from FatSecret (POST).
  route("api/nutrition", "routes/api.nutrition.tsx"),
  route("api/preferences", "routes/api.preferences.tsx"),
  route("api/family", "routes/api.family.tsx"),
  route("api/family/mine", "routes/api.family.mine.tsx"),
  route("api/family/switch", "routes/api.family.switch.tsx"),
  route("api/family/members", "routes/api.family.members.tsx"),
  route("api/family/invites", "routes/api.family.invites.tsx"),
  route("api/family/invites/:id/revoke", "routes/api.family.invites.$id.revoke.tsx"),
  route("api/family/invites/:token/accept", "routes/api.family.invites.$token.accept.tsx"),
  route("api/calendar-token/rotate", "routes/api.calendar-token.rotate.tsx"),

  route("auth/signup", "routes/auth.signup.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
] satisfies RouteConfig;
