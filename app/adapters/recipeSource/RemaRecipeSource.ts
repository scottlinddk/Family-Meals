import { parse, type HTMLElement } from "node-html-parser";
import type { ExternalRecipe } from "~/domain/types";
import type { RecipeSource } from "~/adapters/recipeSource/RecipeSource";

const BASE_URL = "https://madogdrikke.rema1000.dk";
const LISTING_PATH = "/opskrifter";

/**
 * Automatic RecipeSource that fetches and parses REMA 1000's own public
 * recipe site (madogdrikke.rema1000.dk/opskrifter) — used to cross-check
 * this week's offers against REMA's own suggested meals, separate from the
 * hand-authored `RECIPE_CATALOG` used for the adult/child variant pipeline.
 *
 * NOTE: madogdrikke.rema1000.dk returned 403 from this sandbox's network
 * (bot protection, not a policy block), so the selectors in
 * `extractIngredients`/`extractRecipeLinks` below are written defensively
 * against a few common recipe-markup patterns but have not been verified
 * against the live page. Verify (and adjust selectors if needed) in an
 * environment with normal outbound network access before relying on this
 * in production — `RemaRecipeSource.test.ts` covers the parsing logic
 * against representative fixture HTML in the meantime.
 */
const DETAIL_FETCH_CONCURRENCY = 8;

export class RemaRecipeSource implements RecipeSource {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly maxRecipes = 40,
  ) {}

  async fetchRecipes(): Promise<ExternalRecipe[]> {
    const links = await this.fetchRecipeLinks();
    const queue = links.slice(0, this.maxRecipes);
    const recipes: ExternalRecipe[] = [];

    // Fetch detail pages with bounded concurrency instead of one-by-one —
    // sequential fetches of up to `maxRecipes` real pages risk exceeding the
    // serverless function's execution timeout.
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < queue.length) {
        const link = queue[nextIndex++]!;
        const recipe = await this.fetchRecipeDetail(link);
        if (recipe) recipes.push(recipe);
      }
    };
    await Promise.all(Array.from({ length: Math.min(DETAIL_FETCH_CONCURRENCY, queue.length) }, worker));

    return recipes;
  }

  private async fetchRecipeLinks(): Promise<string[]> {
    const res = await this.fetchImpl(`${BASE_URL}${LISTING_PATH}`);
    if (!res.ok) {
      throw new Error(`RemaRecipeSource: listing fetch failed (${res.status})`);
    }
    return extractRecipeLinks(await res.text());
  }

  private async fetchRecipeDetail(url: string): Promise<ExternalRecipe | null> {
    const res = await this.fetchImpl(url);
    if (!res.ok) return null;
    return parseRecipeDetail(await res.text(), url);
  }
}

/** Pulls unique absolute recipe detail URLs out of the /opskrifter listing page. */
export function extractRecipeLinks(html: string): string[] {
  const root = parse(html);
  const hrefs = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href || !href.includes("/opskrifter/")) continue;
    if (href.replace(/\/$/, "").endsWith("/opskrifter")) continue; // the index page linking to itself
    const absolute = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    hrefs.add(absolute.split("?")[0] ?? absolute);
  }
  return [...hrefs];
}

/** Parses a single recipe detail page into an ExternalRecipe, or null if it doesn't look like one. */
export function parseRecipeDetail(html: string, url: string): ExternalRecipe | null {
  const root = parse(html);
  const title = root.querySelector("h1")?.text.trim();
  if (!title) return null;

  const ingredients = extractIngredients(root);
  const instructions = extractInstructions(root);
  const imageUrl = root.querySelector("meta[property='og:image']")?.getAttribute("content");
  const description = root.querySelector("meta[property='og:description'], meta[name='description']")
    ?.getAttribute("content")
    ?.trim();
  const servings = extractServings(root);
  const totalTimeMinutes = extractTotalTimeMinutes(root);

  const slugMatch = url.match(/\/opskrifter\/([^/?#]+)/);
  const id = slugMatch?.[1] ?? url;

  return {
    id,
    title,
    url,
    imageUrl,
    description: description || undefined,
    ingredients,
    instructions,
    servings,
    totalTimeMinutes,
  };
}

/** Finds the first list of `<li>` text following a heading matching `headingPattern`. */
function listAfterHeading(root: HTMLElement, headingPattern: RegExp): string[] {
  const headings = root.querySelectorAll("h2, h3, h4");
  for (const heading of headings) {
    if (!headingPattern.test(heading.text)) continue;
    let sibling = heading.nextElementSibling;
    while (sibling && sibling.tagName !== "UL" && sibling.tagName !== "OL") {
      sibling = sibling.nextElementSibling;
    }
    if (sibling) {
      const items = sibling
        .querySelectorAll("li")
        .map((el) => el.text.trim())
        .filter(Boolean);
      if (items.length > 0) return items;
    }
  }
  return [];
}

/**
 * Recipe sites vary their markup for the ingredient list; try a few common
 * class-name patterns, then fall back to the first list following a heading
 * that says "Ingrediens(er)". Not verified against live markup — see the
 * module doc comment.
 */
function extractIngredients(root: HTMLElement): string[] {
  const candidateSelectors = ["[class*='ingrediens'] li", "[class*='ingredient'] li"];
  for (const selector of candidateSelectors) {
    const items = root
      .querySelectorAll(selector)
      .map((el) => el.text.trim())
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  return listAfterHeading(root, /ingrediens/i);
}

/**
 * Same defensive approach as ingredients: try common class-name patterns for
 * a numbered/step method list, then fall back to the list following a
 * "Fremgangsmåde"/"Sådan gør du"/"Tilberedning" heading. If no list markup is
 * found, falls back to `<p>` paragraphs under the heading (some sites write
 * the method as prose rather than a list).
 */
function extractInstructions(root: HTMLElement): string[] {
  const candidateSelectors = ["[class*='fremgangsmaade'] li", "[class*='instruction'] li", "[class*='step'] li"];
  for (const selector of candidateSelectors) {
    const items = root
      .querySelectorAll(selector)
      .map((el) => el.text.trim())
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  const headingPattern = /fremgangsm[aå]de|s[aå]dan g[oø]r du|tilberedning/i;
  const listItems = listAfterHeading(root, headingPattern);
  if (listItems.length > 0) return listItems;

  const headings = root.querySelectorAll("h2, h3, h4");
  for (const heading of headings) {
    if (!headingPattern.test(heading.text)) continue;
    const paragraphs: string[] = [];
    let sibling = heading.nextElementSibling;
    while (sibling && sibling.tagName === "P") {
      const text = sibling.text.trim();
      if (text) paragraphs.push(text);
      sibling = sibling.nextElementSibling;
    }
    if (paragraphs.length > 0) return paragraphs;
  }

  return [];
}

/** Extracts a leading integer from the first element matching any of `selectors`' text. */
function firstIntegerMatching(root: HTMLElement, selectors: string[]): number | undefined {
  for (const selector of selectors) {
    for (const el of root.querySelectorAll(selector)) {
      const match = el.text.match(/\d+/);
      if (match) return Number(match[0]);
    }
  }
  return undefined;
}

/** "Antal personer"/"Portioner" — how many people the recipe serves. */
function extractServings(root: HTMLElement): number | undefined {
  return firstIntegerMatching(root, [
    "[class*='portion']",
    "[class*='servings']",
    "[class*='personer']",
  ]);
}

/** "Tilberedningstid"/"Tid i alt" — total time in minutes. */
function extractTotalTimeMinutes(root: HTMLElement): number | undefined {
  return firstIntegerMatching(root, ["[class*='tilberedningstid']", "[class*='cooktime']", "[class*='totaltime']", "time"]);
}
