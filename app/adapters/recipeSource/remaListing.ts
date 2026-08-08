import { parse } from "node-html-parser";
import type { ExternalRecipe } from "~/domain/types";
import { extractNuxtPayload, walkObjects } from "~/adapters/recipeSource/nuxtPayload";

/**
 * Reads a REMA 1000 recipe *listing* page — `/opskrifter/<tema>` and its
 * numbered pages — rather than a recipe detail page.
 *
 * madogdrikke.rema1000.dk is a Nuxt site, and each listing renders 20 cards
 * whose `__NUXT_DATA__` payload carries the *whole* recipe behind every card:
 * title, slug, image, servings, ingredient groups (as
 * `{ ingredient, amountOfContent, unitOfContent }`), preparation steps, and
 * the theme tags. So a theme is fully harvestable from its listing pages —
 * 18 fetches for the 350 dinner recipes — with no detail-page request at all.
 *
 * The page also states its own size, twice, which is what makes a complete
 * crawl checkable rather than hopeful:
 *   - `<meta itemprop="numberOfItems" content="350">` — the theme's total
 *   - `<div current-page="2">` — which page the server actually rendered,
 *     so a page number the site clamps or ignores is detectable instead of
 *     being silently re-ingested as a duplicate of page 1.
 *
 * Verified against captures of the live pages taken from CI (the site answers
 * `403 This site is not available in your region` to this project's dev
 * sandbox and to both Supabase regions); `remaListing.test.ts` runs against a
 * reduced copy of one of those captures.
 */

const BASE_URL = "https://madogdrikke.rema1000.dk";

export interface RemaListingPage {
  /** The theme's full size, as the page reports it. */
  totalItems?: number;
  /** The page number the server rendered, which need not be the one asked for. */
  currentPage?: number;
  recipes: RemaListingRecipe[];
}

/** An `ExternalRecipe` plus the theme tags the listing exposes. */
export interface RemaListingRecipe extends ExternalRecipe {
  /** Theme slugs, e.g. `["aftensmad", "nem-hverdagsmad"]`. */
  tags: string[];
}

export function parseListingPage(html: string): RemaListingPage {
  const root = parse(html);

  const totalItems = readInt(
    root.querySelector("[itemprop='numberOfItems']")?.getAttribute("content"),
  );
  const currentPage = readInt(root.querySelector("[current-page]")?.getAttribute("current-page"));

  const payload = extractNuxtPayload(root);
  const recipes: RemaListingRecipe[] = [];
  const seen = new Set<string>();

  for (const node of walkObjects(payload)) {
    const recipe = toRecipe(node);
    if (!recipe || seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    recipes.push(recipe);
  }

  return { totalItems, currentPage, recipes };
}

/**
 * Recognizes a recipe record in the payload and converts it.
 *
 * Matching is on shape (`fields.slug` + `fields.customForm`) as well as
 * `type === "recipe"`, so a CMS rename of the content type doesn't take the
 * whole crawl down with it.
 */
function toRecipe(node: Record<string, unknown>): RemaListingRecipe | undefined {
  const fields = node.fields;
  if (!fields || typeof fields !== "object") return undefined;

  const f = fields as Record<string, unknown>;
  const slug = typeof f.slug === "string" ? f.slug : undefined;
  const title = typeof f.title === "string" ? f.title.trim() : undefined;
  const customForm = f.customForm && typeof f.customForm === "object" ? (f.customForm as Record<string, unknown>) : undefined;
  if (!slug || !title || !customForm) return undefined;
  if (node.type !== undefined && node.type !== "recipe") return undefined;

  const ingredients = ingredientLines(customForm.ingredientGroups);
  const instructions = preparationSteps(customForm.preparationGroups);

  return {
    id: slug,
    title,
    source: "rema1000",
    url: `${BASE_URL}/opskrifter/${slug}`,
    imageUrl: imageUrl(f.image),
    description: undefined,
    ingredients,
    instructions,
    servings: servings(customForm.servings),
    totalTimeMinutes: positiveInt(customForm.totalTime),
    tags: tagSlugs(f.tags),
  };
}

/**
 * Builds the display line for an ingredient.
 *
 * A zero amount means "to taste" (salt, pepper, oil), which the site renders
 * as the bare name. Reading the amount unconditionally is what put lines like
 * `"0 salt"` in the current cache.
 */
function ingredientLines(groups: unknown): string[] {
  const lines: string[] = [];

  for (const group of asArray(groups)) {
    for (const entry of asArray((group as Record<string, unknown>)?.ingredients)) {
      const ingredient = entry as Record<string, unknown>;
      const name = typeof ingredient.ingredient === "string" ? ingredient.ingredient.trim() : "";
      if (!name) continue;

      const amount = positiveNumber(ingredient.amountOfContent);
      const unit = typeof ingredient.unitOfContent === "string" ? ingredient.unitOfContent.trim() : "";
      lines.push([amount !== undefined ? formatAmount(amount) : "", amount !== undefined ? unit : "", name].filter(Boolean).join(" "));
    }
  }

  return lines;
}

function preparationSteps(groups: unknown): string[] {
  const steps: string[] = [];

  for (const group of asArray(groups)) {
    const node = group as Record<string, unknown>;
    const name = typeof node.name === "string" ? node.name.trim() : "";
    if (name) steps.push(name);
    for (const step of asArray(node.steps)) {
      const text = (step as Record<string, unknown>)?.step;
      if (typeof text === "string" && text.trim()) steps.push(text.trim());
    }
  }

  return steps;
}

/** `{ type: "person", amount: 4 }` — the number of people, when that's the unit. */
function servings(value: unknown): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  return positiveInt((value as Record<string, unknown>).amount);
}

function imageUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const url = (value as Record<string, unknown>).url;
  return typeof url === "string" && url ? url : undefined;
}

function tagSlugs(value: unknown): string[] {
  const slugs: string[] = [];
  for (const tag of asArray(value)) {
    const fields = (tag as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
    const slug = fields?.slug ?? (tag as Record<string, unknown>)?.slug;
    if (typeof slug === "string" && slug) slugs.push(slug);
  }
  return [...new Set(slugs)];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readInt(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function positiveInt(value: unknown): number | undefined {
  const n = positiveNumber(value);
  return n === undefined ? undefined : Math.round(n);
}

/** Keeps `1½`-style fractions out of it: 0.5 renders as `0.5`, 600 as `600`. */
function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
}

export const REMA_BASE_URL = BASE_URL;
