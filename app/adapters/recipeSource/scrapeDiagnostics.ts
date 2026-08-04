import { parse } from "node-html-parser";
import { parseRecipeDetail } from "~/adapters/recipeSource/RemaRecipeSource";

/**
 * Reports what a fetched recipe page actually contains.
 *
 * The live site blocks non-browser clients from the development sandbox, so
 * the extraction strategies in `RemaRecipeSource` cannot be checked against
 * real markup there. This runs the same fetch from production — where it
 * succeeds — and describes the page's structure, so selectors can be matched
 * to ground truth instead of guessed at.
 *
 * Deliberately returns structure and short excerpts, not the whole document:
 * enough to identify the markup pattern, small enough to read.
 */
export interface ScrapeDiagnostics {
  url: string;
  status: number;
  htmlLength: number;
  /** True when the response looks like a bot-protection interstitial. */
  looksBlocked: boolean;
  title?: string;
  jsonLd: { count: number; types: string[]; hasRecipe: boolean };
  embeddedState: { scriptsWithJson: number; foundIngredientKey: boolean };
  headings: string[];
  counts: { ul: number; ol: number; li: number };
  /** Class/id/testid values that mention ingredients, for selector targeting. */
  ingredientAttributes: string[];
  /** Raw markup around the first "ingrediens" mention — the most useful field. */
  ingredientExcerpt?: string;
  /** What the current extractor gets today, to confirm a fix took effect. */
  extracted: { ingredients: number; instructions: number; sample: string[] };
}

const INGREDIENT_WORD = /ingrediens/i;

function collectTypes(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 20 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, into, depth + 1);
    return;
  }
  const node = value as Record<string, unknown>;
  const type = node["@type"];
  if (typeof type === "string") into.add(type);
  else if (Array.isArray(type)) for (const t of type) if (typeof t === "string") into.add(t);
  for (const item of Object.values(node)) collectTypes(item, into, depth + 1);
}

export function diagnoseRecipeHtml(html: string, url: string, status: number): ScrapeDiagnostics {
  const root = parse(html);

  const jsonLdTypes = new Set<string>();
  let jsonLdCount = 0;
  for (const script of root.querySelectorAll("script[type='application/ld+json']")) {
    jsonLdCount++;
    try {
      collectTypes(JSON.parse(script.rawText || script.text), jsonLdTypes);
    } catch {
      jsonLdTypes.add("<unparseable>");
    }
  }

  let scriptsWithJson = 0;
  let foundIngredientKey = false;
  for (const script of root.querySelectorAll("script")) {
    const raw = script.rawText || script.text;
    if (raw.length > 32 && /[[{]/.test(raw)) scriptsWithJson++;
    if (/"(recipe)?ingredien(t|s|ser|ts)?"\s*:/i.test(raw)) foundIngredientKey = true;
  }

  const ingredientAttributes = new Set<string>();
  for (const el of root.querySelectorAll("[class],[id],[data-testid]")) {
    for (const attr of ["class", "id", "data-testid"]) {
      const value = el.getAttribute(attr);
      if (value && INGREDIENT_WORD.test(value)) ingredientAttributes.add(`${attr}="${value}"`);
    }
  }

  // Markup around the first mention, which shows the real element structure.
  const match = html.search(INGREDIENT_WORD);
  const ingredientExcerpt =
    match === -1
      ? undefined
      : html.slice(Math.max(0, match - 400), match + 1200).replace(/\s+/g, " ");

  const parsed = parseRecipeDetail(html, url);

  return {
    url,
    status,
    htmlLength: html.length,
    looksBlocked:
      status === 403 ||
      /just a moment|checking your browser|cf-browser-verification|captcha/i.test(html.slice(0, 4000)),
    title: root.querySelector("h1")?.text.trim() ?? root.querySelector("title")?.text.trim(),
    jsonLd: {
      count: jsonLdCount,
      types: [...jsonLdTypes],
      hasRecipe: [...jsonLdTypes].some((t) => t.toLowerCase() === "recipe"),
    },
    embeddedState: { scriptsWithJson, foundIngredientKey },
    headings: root
      .querySelectorAll("h1, h2, h3")
      .map((h) => h.text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 30),
    counts: {
      ul: root.querySelectorAll("ul").length,
      ol: root.querySelectorAll("ol").length,
      li: root.querySelectorAll("li").length,
    },
    ingredientAttributes: [...ingredientAttributes].slice(0, 20),
    ingredientExcerpt,
    extracted: {
      ingredients: parsed?.ingredients.length ?? 0,
      instructions: parsed?.instructions.length ?? 0,
      sample: parsed?.ingredients.slice(0, 5) ?? [],
    },
  };
}
