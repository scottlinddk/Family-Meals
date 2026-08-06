import { useRouteLoaderData } from "react-router";

/** What the `_app` layout loader returns for the pages nested inside it. */
interface AppLayoutData {
  email: string | null;
}

/**
 * The signed-in user's email, as loaded once by the `_app` layout rather than
 * fetched again per page.
 *
 * Read through the route id instead of importing the layout module, so a page
 * that only wants this one string doesn't pull the layout's loader — and with
 * it the database and Supabase clients — into its own import graph.
 *
 * `undefined` means "no answer here": the layout's data hasn't landed, or the
 * caller is outside it. `null` means the account genuinely has no email.
 */
export function useSignedInEmail(): string | null | undefined {
  const data = useRouteLoaderData("routes/_app") as AppLayoutData | undefined;
  return data?.email;
}
