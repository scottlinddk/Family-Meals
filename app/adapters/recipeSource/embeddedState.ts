import type { HTMLElement } from "node-html-parser";

/**
 * Extracts recipe fields from a framework's embedded state blob —
 * `__NEXT_DATA__` (Next.js), `__NUXT__`, `__remixContext`, or any other
 * inline JSON island.
 *
 * Server-rendered React/Vue sites ship the page's data as JSON alongside the
 * markup. That blob is a much better extraction target than the rendered DOM,
 * because the DOM's class names are usually hashed or utility-generated
 * (Tailwind), while the data keys are stable domain names like
 * `ingredients` / `ingredienser`.
 *
 * Nothing here assumes a particular framework or shape: it walks every object
 * in the blob and picks the one that looks most like a recipe.
 */
export interface EmbeddedRecipe {
  ingredients: string[];
  instructions: string[];
  description?: string;
  servings?: number;
}

/** Keys a recipe's ingredient list plausibly hides behind, Danish and English. */
const INGREDIENT_KEYS = /^(recipe)?ingredien(t|s|ser|ts)?$/i;
const INSTRUCTION_KEYS = /^(recipe)?(instructions?|steps?|method|fremgangsmaade|fremgangsmåde|tilberedning)$/i;
const DESCRIPTION_KEYS = /^(description|beskrivelse|teaser|intro|summary)$/i;
const SERVINGS_KEYS = /^(servings?|yield|recipeyield|portioner|antalpersoner|persons?)$/i;

/**
 * Ingredient entries are often objects ({ name, amount, unit }) rather than
 * strings, so assemble a display line from whichever parts are present.
 */
function toIngredientLine(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return undefined;

  const node = value as Record<string, unknown>;

  // Some payloads nest the real entry one level down.
  const direct = node.text ?? node.title ?? node.label ?? node.displayName;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const amount = node.amount ?? node.quantity ?? node.maengde ?? node.mængde;
  const unit = node.unit ?? node.enhed;
  const name = node.name ?? node.ingredient ?? node.navn ?? node.produkt;

  const parts = [amount, unit, name]
    .map((part) => (typeof part === "string" || typeof part === "number" ? String(part).trim() : ""))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : undefined;
}

function toLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toIngredientLine).filter((line): line is string => Boolean(line));
}

function toServings(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

/** Yields every object nested anywhere inside a parsed JSON value. */
function* walkObjects(value: unknown, depth = 0): Generator<Record<string, unknown>> {
  if (depth > 30 || !value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) yield* walkObjects(item, depth + 1);
    return;
  }

  yield value as Record<string, unknown>;
  for (const item of Object.values(value as Record<string, unknown>)) {
    yield* walkObjects(item, depth + 1);
  }
}

function findByKey(node: Record<string, unknown>, pattern: RegExp): unknown {
  for (const [key, value] of Object.entries(node)) {
    if (pattern.test(key)) return value;
  }
  return undefined;
}

/**
 * Pulls every JSON blob out of the page's `<script>` tags. Handles both bare
 * JSON (`<script type="application/json">{...}</script>`) and assignments
 * (`window.__NUXT__ = {...}`), which is how most frameworks emit state.
 */
function scriptJsonBlobs(root: HTMLElement): unknown[] {
  const blobs: unknown[] = [];

  for (const script of root.querySelectorAll("script")) {
    const raw = (script.rawText || script.text).trim();
    if (!raw || raw.length < 32) continue;

    // Bare JSON payload (__NEXT_DATA__, application/json islands).
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        blobs.push(JSON.parse(raw));
        continue;
      } catch {
        // fall through to the assignment form
      }
    }

    // `window.__X__ = {...}` / `self.__X__ = [...]` — take the widest brace span.
    const start = raw.search(/[[{]/);
    if (start === -1) continue;
    const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
    if (end <= start) continue;
    try {
      blobs.push(JSON.parse(raw.slice(start, end + 1)));
    } catch {
      // Not a JSON island — ignore.
    }
  }

  return blobs;
}

/**
 * Best-effort recipe extraction from embedded state. Returns the candidate
 * with the most ingredient lines, since a page's blob often contains several
 * partial recipe records (related recipes, carousels) alongside the real one.
 */
export function extractRecipeFromEmbeddedState(root: HTMLElement): EmbeddedRecipe | null {
  let best: EmbeddedRecipe | null = null;

  for (const blob of scriptJsonBlobs(root)) {
    for (const node of walkObjects(blob)) {
      const ingredients = toLines(findByKey(node, INGREDIENT_KEYS));
      if (ingredients.length === 0) continue;

      const candidate: EmbeddedRecipe = {
        ingredients,
        instructions: toLines(findByKey(node, INSTRUCTION_KEYS)),
        description: (() => {
          const value = findByKey(node, DESCRIPTION_KEYS);
          return typeof value === "string" && value.trim() ? value.trim() : undefined;
        })(),
        servings: toServings(findByKey(node, SERVINGS_KEYS)),
      };

      if (!best || candidate.ingredients.length > best.ingredients.length) best = candidate;
    }
  }

  return best;
}
