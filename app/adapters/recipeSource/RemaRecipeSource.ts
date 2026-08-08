import { parse, type HTMLElement } from "node-html-parser";
import type { ExternalRecipe } from "~/domain/types";
import type { RecipeSource } from "~/adapters/recipeSource/RecipeSource";
import { extractRecipeFromJsonLd, parseDurationMinutes } from "~/adapters/recipeSource/recipeJsonLd";
import { extractRecipeFromEmbeddedState } from "~/adapters/recipeSource/embeddedState";
import { parseListingPage, type RemaListingRecipe } from "~/adapters/recipeSource/remaListing";

const BASE_URL = "https://madogdrikke.rema1000.dk";
const LISTING_PATH = "/opskrifter";

/** The meal theme this app plans for: `/opskrifter/aftensmad`, 350 recipes. */
export const DINNER_THEME = "aftensmad";

/**
 * Automatic RecipeSource for REMA 1000's own recipe site
 * (madogdrikke.rema1000.dk/opskrifter).
 *
 * ## What it crawls, and why that changed
 *
 * It used to read the `/opskrifter` landing page and follow the links it
 * found, capped at 40. That ceiling was the whole cache: the landing page
 * links a curated selection — and three collection pages, which is why
 * "Alle opskrifter" and "Avisopskrifter" were stored as recipes with no
 * ingredients — while the catalogue proper lives behind the theme listings.
 * `/opskrifter/aftensmad` alone reports 350 recipes and `/opskrifter/alle`
 * reports 670.
 *
 * So it now crawls a *theme* listing and its numbered pages
 * (`/opskrifter/aftensmad`, `/opskrifter/aftensmad/2`, …), taking each
 * recipe from the listing's own Nuxt payload — see `remaListing.ts`, which
 * documents the payload and the two self-reported numbers (`numberOfItems`
 * and `current-page`) that make a complete crawl verifiable. 350 dinner
 * recipes cost 18 requests that way, against 350 for a detail-page crawl,
 * and every one of them arrives with ingredients, steps, servings and tags
 * already structured.
 *
 * ## Fallback
 *
 * If a listing yields no recipes — a redesign, or a payload format change —
 * the crawl falls back to the previous strategy: discover detail links, then
 * extract each page through the four merged layers (schema.org/Recipe
 * JSON-LD, embedded state, microdata `itemprop`, class-name heuristics; see
 * `parseRecipeDetail`). That path fetches one page per recipe, so it stays
 * capped to keep the serverless function inside its timeout, and reports
 * itself as degraded through `CrawlStats.strategy` rather than quietly
 * returning a short cache.
 *
 * Note `robots.txt` disallows `/api/*` and `/konto/*`; the numbered listing
 * pages used here are ordinary crawlable pages.
 */

const LISTING_FETCH_CONCURRENCY = 6;
const DETAIL_FETCH_CONCURRENCY = 8;

/** Bounds the crawl if a listing ever reports an implausible total. */
const DEFAULT_MAX_PAGES = 60;

/** Detail-page fallback only: how many pages one refresh may fetch. */
const DEFAULT_DETAIL_LIMIT = 60;

export interface RemaRecipeSourceOptions {
  /** Theme listings to crawl, in order. Defaults to the dinner theme. */
  themes?: string[];
  maxPages?: number;
  detailFallbackLimit?: number;
}

export interface CrawlStats {
  theme: string;
  strategy: "listing-payload" | "detail-pages";
  /** The theme size the listing reports, when it states one. */
  reportedTotal?: number;
  pagesFetched: number;
  recipes: number;
  /** Pages the site answered with something other than the page asked for. */
  unexpectedPages: number[];
  failedPages: number[];
}

export class RemaRecipeSource implements RecipeSource {
  private readonly themes: string[];
  private readonly maxPages: number;
  private readonly detailFallbackLimit: number;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    options: RemaRecipeSourceOptions = {},
  ) {
    this.themes = options.themes ?? [DINNER_THEME];
    this.maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    this.detailFallbackLimit = options.detailFallbackLimit ?? DEFAULT_DETAIL_LIMIT;
  }

  async fetchRecipes(): Promise<ExternalRecipe[]> {
    return (await this.crawl()).recipes;
  }

  /** `fetchRecipes` plus what the crawl saw, for the refresh endpoint to report. */
  async crawl(): Promise<{ recipes: RemaListingRecipe[]; stats: CrawlStats[] }> {
    const recipes = new Map<string, RemaListingRecipe>();
    const stats: CrawlStats[] = [];

    for (const theme of this.themes) {
      const result = await this.crawlTheme(theme);
      stats.push(result.stats);
      // First theme to yield a recipe wins its details; later themes only add.
      for (const recipe of result.recipes) if (!recipes.has(recipe.id)) recipes.set(recipe.id, recipe);
    }

    return { recipes: [...recipes.values()], stats };
  }

  private async crawlTheme(theme: string): Promise<{ recipes: RemaListingRecipe[]; stats: CrawlStats }> {
    const firstUrl = `${BASE_URL}${LISTING_PATH}/${theme}`;
    const firstHtml = await this.fetchText(firstUrl);
    const first = firstHtml ? parseListingPage(firstHtml) : undefined;

    if (!first || first.recipes.length === 0) {
      const recipes = await this.crawlDetailPages(theme);
      return {
        recipes,
        stats: {
          theme,
          strategy: "detail-pages",
          reportedTotal: first?.totalItems,
          pagesFetched: 1,
          recipes: recipes.length,
          unexpectedPages: [],
          failedPages: [],
        },
      };
    }

    const perPage = first.recipes.length;
    const pageCount = first.totalItems
      ? Math.min(Math.ceil(first.totalItems / perPage), this.maxPages)
      : 1;

    const byPage = new Map<number, RemaListingRecipe[]>([[1, first.recipes]]);
    const unexpectedPages: number[] = [];
    const failedPages: number[] = [];

    const pages = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => i + 2);
    let next = 0;
    const worker = async () => {
      while (next < pages.length) {
        const page = pages[next++]!;
        const html = await this.fetchText(`${firstUrl}/${page}`);
        if (!html) {
          failedPages.push(page);
          continue;
        }
        const parsed = parseListingPage(html);
        // A page number the site clamps renders page 1 again; taking it would
        // silently pad the crawl with duplicates and hide the missing page.
        if (parsed.currentPage !== undefined && parsed.currentPage !== page) {
          unexpectedPages.push(page);
          continue;
        }
        byPage.set(page, parsed.recipes);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(LISTING_FETCH_CONCURRENCY, pages.length) }, worker),
    );

    // Reassemble in page order, so the cache mirrors the site's own ordering
    // (newest first) regardless of which worker finished when.
    const ordered: RemaListingRecipe[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= pageCount; page++) {
      for (const recipe of byPage.get(page) ?? []) {
        if (seen.has(recipe.id)) continue;
        seen.add(recipe.id);
        ordered.push(recipe);
      }
    }

    return {
      recipes: ordered,
      stats: {
        theme,
        strategy: "listing-payload",
        reportedTotal: first.totalItems,
        pagesFetched: byPage.size,
        recipes: ordered.length,
        unexpectedPages: unexpectedPages.sort((a, b) => a - b),
        failedPages: failedPages.sort((a, b) => a - b),
      },
    };
  }

  /** Pre-payload strategy, kept as the fallback: one fetch per recipe page. */
  private async crawlDetailPages(theme: string): Promise<RemaListingRecipe[]> {
    const links = await this.fetchRecipeLinks(theme);
    const queue = links.slice(0, this.detailFallbackLimit);
    const recipes: RemaListingRecipe[] = [];

    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const link = queue[next++]!;
        const html = await this.fetchText(link);
        const recipe = html ? parseRecipeDetail(html, link) : null;
        if (recipe) recipes.push({ ...recipe, tags: [theme] });
      }
    };
    await Promise.all(Array.from({ length: Math.min(DETAIL_FETCH_CONCURRENCY, queue.length) }, worker));

    return recipes;
  }

  /**
   * Recipe detail URLs a listing links to. Public so `/api/recipes/diagnose`
   * can inspect a real recipe page.
   */
  async fetchRecipeLinks(theme?: string): Promise<string[]> {
    const path = theme ? `${LISTING_PATH}/${theme}` : LISTING_PATH;
    const res = await this.fetchImpl(`${BASE_URL}${path}`);
    if (!res.ok) {
      throw new Error(`RemaRecipeSource: listing fetch failed (${res.status})`);
    }
    return extractRecipeLinks(await res.text());
  }

  private async fetchText(url: string): Promise<string | undefined> {
    const res = await this.fetchImpl(url);
    if (!res.ok) return undefined;
    return res.text();
  }
}

/**
 * Pulls unique absolute recipe detail URLs out of a listing page.
 *
 * Excludes the theme/collection pages that share the `/opskrifter/` prefix —
 * `/opskrifter/alle`, `/opskrifter/aftensmad`, `/opskrifter/temaer` and the
 * rest — which the old crawl stored as ingredient-less "recipes".
 */
export function extractRecipeLinks(html: string): string[] {
  const root = parse(html);
  const hrefs = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href || !href.includes("/opskrifter/")) continue;
    const path = (href.split("?")[0] ?? href).replace(/\/$/, "");
    const slug = path.slice(path.indexOf("/opskrifter/") + "/opskrifter/".length);
    if (!slug || slug.includes("/")) continue; // the index page, or a numbered listing page
    if (COLLECTION_SLUGS.has(slug)) continue;
    hrefs.add(`${BASE_URL}/opskrifter/${slug}`);
  }
  return [...hrefs];
}

/**
 * Listing pages that live under `/opskrifter/` alongside the recipes. Taken
 * from `/opskrifter/temaer` plus the three collections the landing page links.
 */
const COLLECTION_SLUGS = new Set([
  "alle",
  "temaer",
  "opskrifter",
  "aftensmad",
  "bagvaerk-sodt-og-snacks",
  "drikkevarer",
  "fest-og-hojtider",
  "fisk-og-skaldyr",
  "forretter",
  "frokost",
  "glutenfri",
  "halloween",
  "i-sortiment",
  "jul",
  "kodfri",
  "mad-for-born",
  "mad-pa-farten",
  "morgenmad",
  "mortensaften",
  "nem-hverdagsmad",
  "nemt-og-gront",
  "nytar",
  "opskrifter-med-efterarets-saesonvarer",
  "opskrifter-med-forarets-saesonvarer",
  "opskrifter-med-sommers-saesonvarer",
  "opskrifter-med-vinterens-saesonvarer",
  "paske",
  "saesonmad",
  "sundere-alternativer",
  "til-madpakken",
  "tilbehor-til-aftensmad",
  "udenlandsk",
  "ugens-avisopskrifter",
  "uno-x-mobilitys-gemte-opskrifter",
  "vildt",
]);

/** Reads the text (or `content`) of microdata elements carrying `itemprop`. */
function microdataValues(root: HTMLElement, prop: string): string[] {
  return root
    .querySelectorAll(`[itemprop='${prop}']`)
    .map((el) => (el.getAttribute("content") ?? el.text).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Merges the detail-page extraction strategies field-by-field, preferring the
 * more durable source but letting a weaker one fill a gap the stronger one
 * left empty (e.g. JSON-LD that omits `description` but has full ingredients).
 *
 * Used by the fallback crawl, by `/api/recipes/diagnose`, and (with a
 * non-REMA `source`) by the URL-paste import — the extraction itself doesn't
 * know or care which site it's reading.
 */
export function parseRecipeDetail(html: string, url: string, source = "rema1000"): ExternalRecipe | null {
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

  // No class-name heuristic fallback for these two — only schema.org/Recipe
  // JSON-LD and microdata publish prep/cook as separate figures; a page that
  // states only a bare total time has no split to extract.
  const prepTimeMinutes =
    jsonLd?.prepTimeMinutes ?? parseDurationMinutes(microdataValues(root, "prepTime")[0]);
  const cookTimeMinutes =
    jsonLd?.cookTimeMinutes ?? parseDurationMinutes(microdataValues(root, "cookTime")[0]);

  const slugMatch = url.match(/\/opskrifter\/([^/?#]+)/);
  const id = slugMatch?.[1] ?? url;

  return {
    id,
    title,
    source,
    url,
    imageUrl,
    description: description || undefined,
    ingredients,
    instructions,
    servings,
    totalTimeMinutes,
    prepTimeMinutes,
    cookTimeMinutes,
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
 * that says "Ingrediens(er)".
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
