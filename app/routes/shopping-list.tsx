import { redirect } from "react-router";
import type { Route } from "./+types/shopping-list";
import { mondayOf, todayIso } from "~/lib/time";

/**
 * "The shopping list", without having to know which week that is.
 *
 * Exists because the installed app's shortcut (and any bookmark someone makes
 * of it) has to be a fixed URL, while the list someone means is always the
 * current week's. Mirrors what `/` does for the plan.
 */
export async function loader(_args: Route.LoaderArgs) {
  return redirect(`/weeks/${mondayOf(todayIso())}/shopping-list`);
}
