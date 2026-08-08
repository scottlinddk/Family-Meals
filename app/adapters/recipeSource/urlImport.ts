import { lookup } from "node:dns/promises";
import type { ExternalRecipe } from "~/domain/types";
import { parseRecipeDetail } from "~/adapters/recipeSource/RemaRecipeSource";

/**
 * Fetches one user-chosen recipe page and runs it through the same
 * extraction pipeline built for REMA's recipe site (`parseRecipeDetail`):
 * schema.org/Recipe JSON-LD first, then the framework's embedded state,
 * microdata, and class-name heuristics. Since most commercial recipe sites
 * emit schema.org/Recipe for Google's rich results, one implementation
 * reaches nearly every site without a per-site adapter — see
 * `docs/recipe-data-sources.md`.
 *
 * Unlike the catalog crawlers, this fetches a URL the user typed, so it
 * guards against being used as an open fetch proxy: only http(s), and the
 * resolved address must not be a loopback/private/link-local address (which
 * would otherwise let a pasted URL reach internal services). Response size
 * and time are also capped, since this fetch is otherwise unbounded.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 3_000_000;

export class UrlImportError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_url" | "blocked_host" | "fetch_failed" | "too_large" | "no_recipe_found",
  ) {
    super(message);
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname === "localhost") {
    throw new UrlImportError("Cannot import from a local address.", "blocked_host");
  }
  const { address, family } = await lookup(hostname);
  const isPrivate = family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
  if (isPrivate) {
    throw new UrlImportError("Cannot import from a local or private address.", "blocked_host");
  }
}

/** Stable id for a URL-imported recipe: the URL itself, matching `parseRecipeDetail`'s fallback for non-REMA URLs. */
export function recipeIdForUrl(url: string): string {
  return url;
}

export async function fetchRecipeFromUrl(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ExternalRecipe> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlImportError("That doesn't look like a valid URL.", "invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlImportError("Only http/https URLs can be imported.", "invalid_url");
  }

  await assertPublicHost(url.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(url.toString(), { signal: controller.signal, redirect: "follow" });
  } catch (error) {
    throw new UrlImportError(
      error instanceof Error ? error.message : "Could not fetch that page.",
      "fetch_failed",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new UrlImportError(`The page responded with ${res.status}.`, "fetch_failed");
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new UrlImportError("That page is too large to import.", "too_large");
  }

  const html = await res.text();
  if (html.length > MAX_RESPONSE_BYTES) {
    throw new UrlImportError("That page is too large to import.", "too_large");
  }

  // Follow-through URL, not the input URL, so redirects (AMP pages, tracking
  // links) end up pointing at the page actually parsed.
  const finalUrl = res.url || url.toString();
  // Source is the page's own hostname, not REMA's default — so a future
  // per-site crawler and a user's manual import of the same site coexist
  // under one source scope (`externalRecipeRepository.replaceForSource`).
  const recipe = parseRecipeDetail(html, finalUrl, new URL(finalUrl).hostname);
  if (!recipe) {
    throw new UrlImportError("No recipe could be found on that page.", "no_recipe_found");
  }
  if (recipe.ingredients.length === 0) {
    throw new UrlImportError("A title was found, but no ingredient list.", "no_recipe_found");
  }

  return { ...recipe, id: recipeIdForUrl(finalUrl) };
}
