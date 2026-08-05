import type { HTMLElement } from "node-html-parser";

/**
 * Decodes the `__NUXT_DATA__` payload a Nuxt page ships its server-fetched
 * data in.
 *
 * The payload is devalue-encoded: a flat array where every value that isn't a
 * primitive is stored once and referred to by its index, so the same object
 * can appear in many places without being repeated. Element 0 is the root.
 * A number in a position where a value is expected is therefore a *reference*,
 * not the number itself:
 *
 *   [ {"recipes": 1}, [2], {"title": 3}, "Lasagne" ]
 *     ^ root           ^ array of one   ^ object    ^ the actual string
 *
 * Arrays whose first element is a string are devalue's tagged wrappers
 * (`["Reactive", 12]`, `["Set", 3, 4]`, `["Date", "2026-01-01"]`) — a plain
 * array can never look like that, because all of its elements are indices.
 *
 * Unwrapping the reactivity wrappers matters: the recipe records this app
 * wants sit inside the page's Vue Query cache, which is stored as
 * `["Reactive", n]`.
 */

/** Wrappers whose single argument is the value itself. */
const TRANSPARENT_TAGS = new Set(["Reactive", "ShallowReactive", "Ref", "ShallowRef", "EmptyRef", "NuxtError"]);

export function extractNuxtPayload(root: HTMLElement): unknown {
  const script = root.querySelector("script#__NUXT_DATA__");
  if (!script) return undefined;

  let flat: unknown;
  try {
    flat = JSON.parse(script.rawText || script.text);
  } catch {
    return undefined;
  }
  if (!Array.isArray(flat)) return undefined;

  return resolveNuxtPayload(flat);
}

/**
 * Resolves a devalue-encoded array into plain values.
 *
 * Resolution is memoized per index both to keep repeated references cheap and
 * because the payload is a graph, not a tree: the same store object is
 * referenced from several places and a naive walk would revisit it (or spin,
 * where the graph has a cycle — `in progress` guards that).
 */
export function resolveNuxtPayload(flat: unknown[]): unknown {
  const resolved = new Map<number, unknown>();
  const inProgress = new Set<number>();

  /**
   * A slot in the flat array holds the value itself, so a number found *there*
   * is that number — only a number found *inside* a structure is a reference.
   * Conflating the two resolves `{"amountOfContent": 600}` as "whatever lives
   * at index 600", which is how the ingredient amounts went missing.
   */
  const at = (index: number): unknown => {
    if (!Number.isInteger(index) || index < 0 || index >= flat.length) return undefined;
    if (resolved.has(index)) return resolved.get(index);
    if (inProgress.has(index)) return undefined; // cycle
    inProgress.add(index);
    const slot = flat[index];
    const value = slot && typeof slot === "object" ? decode(slot) : slot;
    inProgress.delete(index);
    resolved.set(index, value);
    return value;
  };

  const decode = (value: unknown): unknown => {
    if (typeof value === "number") return at(value);
    if (!value || typeof value !== "object") return value;

    if (Array.isArray(value)) {
      const [tag, ...args] = value;
      if (typeof tag === "string") {
        if (TRANSPARENT_TAGS.has(tag)) return args.length > 0 ? at(args[0] as number) : undefined;
        if (tag === "Set") return args.map((arg) => at(arg as number));
        if (tag === "Map") {
          const entries: [unknown, unknown][] = [];
          for (let i = 0; i + 1 < args.length; i += 2) entries.push([at(args[i] as number), at(args[i + 1] as number)]);
          return entries;
        }
        if (tag === "Date") return args[0];
        // Any other tag (BigInt, RegExp, …) is not something a recipe needs.
        return undefined;
      }
      return value.map((item) => decode(item));
    }

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = decode(item);
    return out;
  };

  return at(0);
}

/**
 * Visits every object in a decoded payload, so callers can look for their own
 * records without knowing where in the page's data tree they ended up.
 */
export function* walkObjects(value: unknown, depth = 0): Generator<Record<string, unknown>> {
  if (depth > 40 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) yield* walkObjects(item, depth + 1);
    return;
  }
  const node = value as Record<string, unknown>;
  yield node;
  for (const item of Object.values(node)) yield* walkObjects(item, depth + 1);
}
