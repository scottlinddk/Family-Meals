import type { HTMLElement } from "node-html-parser";

/**
 * schema.org/Recipe extraction from JSON-LD (`<script type="application/ld+json">`).
 *
 * This is the primary extraction path for `RemaRecipeSource`. Commercial
 * recipe sites publish this block so their pages qualify for Google's recipe
 * rich results, which makes it far more stable than guessing at CSS class
 * names — the markup can be redesigned freely without breaking the contract,
 * whereas class-name heuristics break on any redesign.
 *
 * Everything here is defensive: JSON-LD in the wild is inconsistently shaped
 * (single object vs `@graph` vs top-level array, strings vs objects vs nested
 * `HowToSection`s), so each helper narrows unknown JSON rather than trusting
 * a declared type.
 */
export interface JsonLdRecipe {
  name?: string;
  description?: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  totalTimeMinutes?: number;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

/** Collapses whitespace and strips HTML entities left behind by some CMSes. */
function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

/** `@type` may be a string or an array of strings; match either. */
function hasType(node: Record<string, unknown>, type: string): boolean {
  return asArray(node["@type"]).some(
    (t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase(),
  );
}

/**
 * Walks every node reachable from a parsed JSON-LD document, including
 * `@graph` containers and nested arrays, so a Recipe nested inside a
 * WebPage/@graph wrapper is still found.
 */
function* walkNodes(value: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(value)) {
    for (const item of value) yield* walkNodes(item);
    return;
  }
  if (!value || typeof value !== "object") return;

  const node = value as Record<string, unknown>;
  yield node;

  if ("@graph" in node) yield* walkNodes(node["@graph"]);
}

/** `image` may be a URL string, an ImageObject, or an array of either. */
function extractImage(value: unknown): string | undefined {
  for (const candidate of asArray(value)) {
    if (typeof candidate === "string") {
      const url = cleanText(candidate);
      if (url) return url;
    } else if (candidate && typeof candidate === "object") {
      const url = cleanText((candidate as Record<string, unknown>).url);
      if (url) return url;
    }
  }
  return undefined;
}

/**
 * `recipeInstructions` is the most variably-shaped field in the spec: a
 * single prose string, an array of strings, an array of `HowToStep`
 * objects, or `HowToSection`s that nest their own `itemListElement` steps.
 */
function extractInstructions(value: unknown): string[] {
  const steps: string[] = [];

  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string") {
      const text = cleanText(candidate);
      if (text) steps.push(text);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;

    const node = candidate as Record<string, unknown>;

    // A section groups steps rather than being one itself.
    if (hasType(node, "HowToSection") || "itemListElement" in node) {
      for (const child of asArray(node.itemListElement)) visit(child);
      return;
    }

    const text = cleanText(node.text) ?? cleanText(node.name);
    if (text) steps.push(text);
  };

  for (const candidate of asArray(value)) visit(candidate);

  // A single prose blob is common; split it into sentences-per-line only when
  // the source clearly used line breaks, to avoid mangling real sentences.
  if (steps.length === 1 && steps[0]!.length > 400) {
    const parts = steps[0]!
      .split(/\s*(?:\d+\.\s|\n+)\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 1) return parts;
  }

  return steps;
}

/** `recipeYield` may be "4 personer", "4", or an array. Take the first integer. */
function extractServings(value: unknown): number | undefined {
  for (const candidate of asArray(value)) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    const text = cleanText(candidate);
    const match = text?.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return undefined;
}

/**
 * Parses an ISO 8601 duration ("PT1H30M") into minutes. Falls back to a
 * plain "30 min"-style string, which some sites emit despite the spec.
 */
export function parseDurationMinutes(value: unknown): number | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  const iso = text.match(/^P(?:([\d.]+)D)?(?:T(?:([\d.]+)H)?(?:([\d.]+)M)?)/i);
  if (iso && (iso[1] || iso[2] || iso[3])) {
    const days = Number(iso[1] ?? 0);
    const hours = Number(iso[2] ?? 0);
    const minutes = Number(iso[3] ?? 0);
    const total = Math.round(days * 24 * 60 + hours * 60 + minutes);
    return total > 0 ? total : undefined;
  }

  const hourMinute = text.match(/(\d+)\s*t(?:ime)?r?\D+(\d+)\s*min/i);
  if (hourMinute) return Number(hourMinute[1]) * 60 + Number(hourMinute[2]);

  const hoursOnly = text.match(/(\d+)\s*t(?:ime)?r?\b/i);
  if (hoursOnly) return Number(hoursOnly[1]) * 60;

  const minutesOnly = text.match(/(\d+)\s*min/i);
  if (minutesOnly) return Number(minutesOnly[1]);

  return undefined;
}

/**
 * `totalTime` is preferred, but many recipes only publish `cookTime` and
 * `prepTime`, in which case their sum is the closest equivalent.
 */
function extractTotalTime(node: Record<string, unknown>): number | undefined {
  const total = parseDurationMinutes(node.totalTime);
  if (total) return total;

  const cook = parseDurationMinutes(node.cookTime) ?? 0;
  const prep = parseDurationMinutes(node.prepTime) ?? 0;
  const sum = cook + prep;
  return sum > 0 ? sum : undefined;
}

function toRecipe(node: Record<string, unknown>): JsonLdRecipe {
  return {
    name: cleanText(node.name),
    description: cleanText(node.description),
    image: extractImage(node.image),
    ingredients: asArray(node.recipeIngredient ?? node.ingredients)
      .map(cleanText)
      .filter((line): line is string => Boolean(line)),
    instructions: extractInstructions(node.recipeInstructions),
    servings: extractServings(node.recipeYield),
    totalTimeMinutes: extractTotalTime(node),
  };
}

/**
 * Returns the schema.org Recipe described by the page's JSON-LD blocks, or
 * null when the page publishes none. Malformed blocks are skipped rather
 * than thrown, since one bad script tag shouldn't lose an otherwise
 * parseable page.
 */
export function extractRecipeFromJsonLd(root: HTMLElement): JsonLdRecipe | null {
  for (const script of root.querySelectorAll("script[type='application/ld+json']")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.rawText || script.text);
    } catch {
      continue;
    }

    for (const node of walkNodes(parsed)) {
      if (hasType(node, "Recipe")) return toRecipe(node);
    }
  }

  return null;
}
