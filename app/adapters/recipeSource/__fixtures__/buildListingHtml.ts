/**
 * Builds a REMA listing page in the same shape the real one has: microdata
 * stating the theme's size, a `current-page` attribute, and a devalue-encoded
 * `__NUXT_DATA__` payload holding the recipe records.
 *
 * Test-only. The devalue encoding mirrors what `nuxtPayload.ts` decodes: a
 * flat array where element 0 is the root and every nested value is stored once
 * and referred to by index. `aftensmad-listing.html` next to this file is a
 * reduced copy of a real response; this builder covers the cases a single
 * capture can't (page numbers, empty payloads, to-taste amounts).
 */

export interface FixtureRecipe {
  title: string;
  slug: string;
  imageUrl?: string;
  servings?: number;
  totalTime?: number;
  /** `[amountOfContent, unitOfContent, ingredient]` per line. */
  ingredients?: [number, string, string][];
  steps?: string[];
  tags?: string[];
}

export interface FixtureListing {
  recipes: FixtureRecipe[];
  currentPage?: number;
  totalItems?: number;
}

export function buildListingHtml({ recipes, currentPage = 1, totalItems = 350 }: FixtureListing): string {
  const records = recipes.map((recipe) => ({
    id: `entry-${recipe.slug}`,
    type: "recipe",
    fields: {
      title: recipe.title,
      slug: recipe.slug,
      image: recipe.imageUrl ? { url: recipe.imageUrl } : undefined,
      customForm: {
        servings: { type: "person", amount: recipe.servings ?? 4 },
        totalTime: recipe.totalTime ?? 0,
        ingredientGroups: [
          {
            name: "",
            ingredients: (recipe.ingredients ?? []).map(([amountOfContent, unitOfContent, ingredient]) => ({
              ingredient,
              unitOfContent,
              amountOfContent,
            })),
          },
        ],
        preparationGroups: [{ name: "", steps: (recipe.steps ?? []).map((step) => ({ step })) }],
      },
      tags: (recipe.tags ?? ["aftensmad"]).map((slug) => ({ type: "recipeTag", fields: { slug } })),
    },
  }));

  const cards = recipes
    .map((recipe) => `<div itemprop="itemListElement"><a href="/opskrifter/${recipe.slug}">${recipe.title}</a></div>`)
    .join("\n      ");

  return `<html lang="da"><body>
  <div current-page="${currentPage}">
    <div itemscope itemtype="https://schema.org/ItemList" id="recipe-grid">
      <meta itemprop="numberOfItems" content="${totalItems}">
    </div>
    <div class="grid">
      ${cards}
    </div>
  </div>
  <script type="application/json" id="__NUXT_DATA__">${encodeDevalue({
    data: {},
    state: ["Reactive", { "$svue-query": { queries: [{ state: { data: { pages: [{ data: records }] } } }] } }],
  })}</script>
</body></html>`;
}

/**
 * Encodes a value the way Nuxt's devalue payload does. Arrays whose first
 * element is a string are emitted as devalue's tagged wrappers, which is how
 * `["Reactive", …]` above survives the round trip.
 */
function encodeDevalue(root: Record<string, unknown>): string {
  const flat: unknown[] = [null];

  const encode = (value: unknown): number => {
    if (Array.isArray(value)) {
      const index = flat.push(null) - 1;
      const [tag, ...rest] = value;
      flat[index] = typeof tag === "string" ? [tag, ...rest.map(encode)] : value.map(encode);
      return index;
    }
    if (value && typeof value === "object") {
      const index = flat.push(null) - 1;
      flat[index] = Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, encode(item)]),
      );
      return index;
    }
    return flat.push(value) - 1;
  };

  flat[0] = Object.fromEntries(Object.entries(root).map(([key, value]) => [key, encode(value)]));
  return JSON.stringify(flat);
}
