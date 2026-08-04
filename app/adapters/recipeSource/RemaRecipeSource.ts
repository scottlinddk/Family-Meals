import { parse, type HTMLElement } from "node-html-parser";
import type { ExternalRecipe } from "~/domain/types";
import type { RecipeSource } from "~/adapters/recipeSource/RecipeSource";
import { extractRecipeFromJsonLd, parseDurationMinutes } from "~/adapters/recipeSource/recipeJsonLd";
import { extractRecipeFromEmbeddedState } from "~/adapters/recipeSource/embeddedState";

const BASE_URL = "https://madogdrikke.rema1000.dk";
const LISTING_PATH = "/opskrifter";

/**
 * Automatic RecipeSource that fetches and parses REMA 1000's own public
 * recipe site (madogdrikke.rema1000.dk/opskrifter) — used to cross-check
 * this week's offers against REMA's own suggested meals, separate from the
 * hand-authored `RECIPE_CATALOG` used for the adult/child variant pipeline.
 *
 * Extraction runs several strategies in order of durability:
 *   1. schema.org/Recipe JSON-LD (`recipeJsonLd.ts`) — the contract recipe
 *      sites maintain for Google rich results, so it survives redesigns.
 *   2. The framework's embedded state blob (`embeddedState.ts`) — Next.js
 *      `__NEXT_DATA__` and friends, keyed by stable domain names.
 *   3. Microdata `itemprop` attributes — the same vocabulary, inline.
 *   4. CSS class-name / heading heuristics, then a structural guess.
 *
 * The heuristics alone produced 0-ingredient recipes for the whole cache,
 * which silently disabled offer matching, since a recipe with no ingredients
 * can never overlap an offer. `parseRecipeDetail` therefore merges the
 * strategies field-by-field rather than picking one wholesale, and
 * `summarizeExtraction` lets the refresh endpoint report when a scrape comes
 * back empty instead of reporting success.
 *
 * The live site blocks non-browser clients from the dev sandbox, so when a
 * strategy needs to be matched to the real markup, `/api/recipes/diagnose`
 * (see `scrapeDiagnostics.ts`) reports the page's actual structure from
 * production, where the fetch succeeds.
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

  /** Public so `/api/recipes/diagnose` can inspect a real recipe page. */
  async fetchRecipeLinks(): Promise<string[]> {
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

/** Reads the text (or `content`) of microdata elements carrying `itemprop`. */
function microdataValues(root: HTMLElement, prop: string): string[] {
  return root
    .querySelectorAll(`[itemprop='${prop}']`)
    .map((el) => (el.getAttribute("content") ?? el.text).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Merges the three extraction strategies field-by-field, preferring the more
 * durable source but letting a weaker one fill a gap the stronger one left
 * empty (e.g. JSON-LD that omits `description` but has full ingredients).
 */
export function parseRecipeDetail(html: string, url: string): ExternalRecipe | null {
  const root = parse(html);
  const jsonLd = extractRecipeFromJsonLd(root);
  const embedded = extractRecipeFromEmbeddedState(root);

  const title = jsonLd?.name ?? root.querySelector("h1")?.text.trim();
  if (!title) return null;

  const ingredients = firstNonEmpty(
    jsonLd?.ingredients ?? [],
    embedded?.ingredients ?? [],
    microdataValues(root, "recipeIngredient"),
    extractIngredients(root),
  );

  const instructions = firstNonEmpty(
    jsonLd?.instructions ?? [],
    embedded?.instructions ?? [],
    microdataValues(root, "recipeInstructions"),
    extractInstructions(root),
  );

  const imageUrl =
    jsonLd?.image ??
    root.querySelector("meta[property='og:image']")?.getAttribute("content") ??
    undefined;

  const description =
    jsonLd?.description ??
    embedded?.description ??
    root
      .querySelector("meta[property='og:description'], meta[name='description']")
      ?.getAttribute("content")
      ?.trim();

  const servings = jsonLd?.servings ?? embedded?.servings ?? extractServings(root);

  const totalTimeMinutes =
    jsonLd?.totalTimeMinutes ??
    parseDurationMinutes(microdataValues(root, "totalTime")[0]) ??
    extractTotalTimeMinutes(root);

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

function firstNonEmpty(...candidates: string[][]): string[] {
  return candidates.find((list) => list.length > 0) ?? [];
}

export interface ExtractionSummary {
  total: number;
  withIngredients: number;
  withInstructions: number;
}

/**
 * Extraction health for a scrape result. The refresh endpoint surfaces this
 * so a run that stores recipes with no ingredients — which silently breaks
 * offer matching — is visible instead of reporting a bare success count.
 */
export function summarizeExtraction(recipes: ExternalRecipe[]): ExtractionSummary {
  return {
    total: recipes.length,
    withIngredients: recipes.filter((r) => r.ingredients.length > 0).length,
    withInstructions: recipes.filter((r) => r.instructions.length > 0).length,
  };
}

/** Flattens the document into element order, so "what follows X" ignores nesting. */
function elementsInDocumentOrder(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (node: HTMLElement) => {
    out.push(node);
    for (const child of node.childNodes) {
      if ((child as HTMLElement).tagName) visit(child as HTMLElement);
    }
  };
  visit(root);
  return out;
}

function listItems(element: HTMLElement): string[] {
  return element
    .querySelectorAll("li")
    .map((el) => el.text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Finds the first list following a heading matching `headingPattern`, in
 * document order.
 *
 * Document order matters: an earlier version only walked
 * `heading.nextElementSibling`, which finds the list only when it is a direct
 * sibling. Component-based sites almost always wrap it
 * (`<h2>Ingredienser</h2><div><ul>…</ul></div>`), so that check silently
 * returned nothing and every scraped recipe was stored with no ingredients.
 */
function listAfterHeading(root: HTMLElement, headingPattern: RegExp): string[] {
  const elements = elementsInDocumentOrder(root);

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]!;
    if (!/^H[1-6]$/.test(element.tagName ?? "")) continue;
    if (!headingPattern.test(element.text)) continue;

    // Scan forward, stopping at the next heading so a missing list doesn't
    // swallow an unrelated list from a later section.
    for (let j = i + 1; j < elements.length; j++) {
      const candidate = elements[j]!;
      if (/^H[1-6]$/.test(candidate.tagName ?? "") && candidate !== element) break;
      if (candidate.tagName === "UL" || candidate.tagName === "OL") {
        const items = listItems(candidate);
        if (items.length > 0) return items;
      }
    }
  }

  return [];
}

/**
 * Last-resort structural guess: the longest list on the page whose items look
 * like ingredient lines (short, and mostly starting with a quantity). Used
 * only when every labelled strategy fails, so a redesign that drops the
 * "Ingredienser" heading still yields something.
 */
function longestQuantityList(root: HTMLElement): string[] {
  let best: string[] = [];

  for (const list of root.querySelectorAll("ul, ol")) {
    const items = listItems(list);
    if (items.length < 3 || items.length <= best.length) continue;

    const looksLikeIngredients =
      items.filter((item) => item.length < 120 && /^\s*[\d½¼¾⅓⅔]/.test(item)).length >=
      Math.ceil(items.length / 2);

    if (looksLikeIngredients) best = items;
  }

  return best;
}

/**
 * Recipe sites vary their markup for the ingredient list; try a few common
 * class-name patterns, then fall back to the first list following a heading
 * that says "Ingrediens(er)". Not verified against live markup — see the
 * module doc comment.
 */
function extractIngredients(root: HTMLElement): string[] {
  const candidateSelectors = [
    "[class*='ingrediens'] li",
    "[class*='ingredient'] li",
    "[data-testid*='ingredient'] li",
    "[id*='ingrediens'] li",
  ];
  for (const selector of candidateSelectors) {
    const items = root
      .querySelectorAll(selector)
      .map((el) => el.text.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  return firstNonEmpty(listAfterHeading(root, /ingrediens/i), longestQuantityList(root));
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
