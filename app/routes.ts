import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("weeks/:weekStart", "routes/weeks.$weekStart.tsx"),
  route("weeks/:weekStart/day/:day", "routes/weeks.$weekStart.day.$day.tsx"),
  route("offers", "routes/offers.tsx"),
  route("family", "routes/family.tsx"),
  route("invite/:token", "routes/invite.$token.tsx"),

  // Live ICS subscription feed — a resource route (no HTML), authenticated
  // by the opaque token in the path rather than a Supabase Auth session.
  route("calendar/:token.ics", "routes/calendar.$token[.]ics.tsx"),

  // JSON resource routes backing the TanStack Query hooks in ui/hooks.
  route("api/weeks/:weekStart", "routes/api.weeks.$weekStart.tsx"),
  route("api/weeks/:weekStart/day/:day", "routes/api.weeks.$weekStart.day.$day.tsx"),
  route("api/weeks/:weekStart/regenerate-day", "routes/api.weeks.$weekStart.regenerate-day.tsx"),
  route("api/weeks/:weekStart/swap-day", "routes/api.weeks.$weekStart.swap-day.tsx"),
  route("api/offers", "routes/api.offers.tsx"),
  route("api/offers/refresh", "routes/api.offers.refresh.tsx"),
  route("api/recipes/refresh", "routes/api.recipes.refresh.tsx"),
  route("api/recipes/suggestions", "routes/api.recipes.suggestions.tsx"),
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
