# UI motion

The app has a systemic motion layer — new work should use it rather than
inventing its own, and reviewers should treat a missing piece of it as a
gap, not a nit.

- **Page changes**: every in-app `Link`/`NavLink` that navigates between
  routes should pass `viewTransition` (React Router's View Transitions API
  integration). `LinkButton`, `IconLink` and `BackLink` in
  `app/ui/components/ui/` already default it on — use those, or add the
  prop explicitly on a raw `Link`/`NavLink`. The cross-fade itself is
  defined once, in `app/app.css` (`::view-transition-old/new(root)`).
- **Loading state for navigation**: `RouteProgress`
  (`app/ui/components/RouteProgress.tsx`), mounted once in `root.tsx`,
  shows an indeterminate bar for any in-flight loader or submission. This
  covers every route by construction — nothing to add per-page.
- **Dialogs**: use `BottomSheet` (`app/ui/components/ui/BottomSheet.tsx`).
  It already slides/fades in and out; a new dialog built outside it would
  be the odd one out.
- **Content appearing after a loading state settles** (a list replacing a
  spinner, an accordion opening): use the `.animate-rise` utility class, or
  the accordion's own fade (`app/app.css`, `.accordion-summary + div`) —
  both are `@starting-style`-based, so they degrade to no animation rather
  than breaking on browsers that don't support it.
- **`prefers-reduced-motion`**: every animation above already respects it
  (`@media (prefers-reduced-motion: no-preference)` guards in `app.css`,
  `motion-reduce:` Tailwind variants elsewhere). Keep that true of anything
  new — reduced motion should remove the animation, not just shorten it.

When adding a new page, route, or async action: check whether it has a
loading state (does the user see *something* change while it waits?) and
whether reaching it and leaving it goes through the transition layer above.
A page with a loader and no loading state, or a nav link with no
`viewTransition`, is a regression against this, not just a missed
enhancement.
