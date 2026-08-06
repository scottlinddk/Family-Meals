import { lookupProduct, parseUnit, withoutQuantity } from "~/domain/recipes/calorieEstimate";

/**
 * Turning "500 g hakket oksekød" into something a nutrition database can be
 * asked about.
 *
 * Two problems have to be solved at once, and the second is the one that
 * decides whether this works at all.
 *
 * **What is this line about?** Answered by the product vocabulary already in
 * `calorieEstimate.ts` — a table of Danish product words tuned against the
 * 350 dinners REMA publishes, which knows that `kyllingebryst` is a kind of
 * `kylling` and that `friske krydderurter` is not rice. Reusing it means the
 * lookup key and the fallback kcal figure agree about what a line names,
 * which they would not if this file parsed Danish a second time.
 *
 * **What language do we ask in?** FatSecret's food database is English unless
 * the key is provisioned for localisation (`region`/`language`, a Premier
 * scope). Asking it about `hakket oksekød` returns nothing useful; asking it
 * about `ground beef` returns the entry we want. So each vocabulary word
 * carries its English name, and the Danish original is used only when the
 * caller says the key is localised for Denmark.
 *
 * The result is a small, stable set of terms: ~250 vocabulary words cover
 * most of what 350 recipes list, so the whole recipe cache resolves to a few
 * hundred lookups that are then cached in Postgres for good — which is what
 * makes this affordable against a rate-limited API.
 */

/** Which language the FatSecret key is provisioned to search in. */
export type NutritionLanguage = "en" | "da";

export interface IngredientTerm {
  /**
   * Stable cache key for this product, in Danish — the vocabulary word when
   * the line names one, otherwise the cleaned line. Danish rather than
   * English so the cache key doesn't change if the search language does.
   */
  key: string;
  /** What to actually send to the nutrition API, in the requested language. */
  query: string;
  /** Whether `key` came from the product vocabulary rather than a fallback. */
  recognised: boolean;
}

/**
 * English names for the Danish product vocabulary.
 *
 * Written as what someone would type into a food database rather than as a
 * dictionary translation: `hakket oksekød` is filed under `ground beef`, not
 * `minced meat of cattle`, and `bouillon` resolves to `broth` because the
 * table's 5 kcal/100 g figure is the made-up stock, not the cube.
 */
export const ENGLISH_NAMES: Record<string, string> = {
  // Fats and oils.
  olivenolie: "olive oil", rapsolie: "canola oil", sesamolie: "sesame oil", olie: "vegetable oil",
  smør: "butter", margarine: "margarine", mayonnaise: "mayonnaise", remoulade: "remoulade",
  pesto: "pesto", piskefløde: "whipping cream", madlavningsfløde: "light cream",
  "creme fraiche": "creme fraiche", cremefraiche: "creme fraiche", kokosmælk: "coconut milk",
  fløde: "cream", fedtstof: "cooking fat",
  // Meat, poultry, fish.
  bacon: "bacon", flæsk: "pork belly", medister: "pork sausage", pølse: "sausage",
  chorizo: "chorizo", salami: "salami", spegepølse: "salami", frikadelle: "meatballs",
  oksekød: "ground beef", oksemørbrad: "beef tenderloin", okse: "beef", kalvekød: "veal",
  svinekød: "pork", svinemørbrad: "pork tenderloin", nakkefilet: "pork shoulder",
  grisekød: "pork", kebab: "kebab", revelsben: "spare ribs", kamben: "spare ribs",
  entrecote: "ribeye steak", kotelet: "pork chop", hamburgerryg: "smoked pork loin",
  kyllingebryst: "chicken breast", kyllingelår: "chicken thigh", kyllingekød: "chicken",
  kylling: "chicken", kalkun: "turkey", andebryst: "duck breast", lammekød: "lamb",
  leverpostej: "liver pate", lever: "liver", skinke: "ham", pålæg: "deli meat",
  laks: "salmon", torsk: "cod", rødspætte: "plaice", ørred: "trout", tunfisk: "tuna",
  rejer: "shrimp", muslinger: "mussels", fiskefilet: "fish fillet", fisk: "fish",
  æg: "egg", æggeblomme: "egg yolk",
  // Dairy and cheese.
  parmesan: "parmesan cheese", mozzarella: "mozzarella cheese", flødeost: "cream cheese",
  smøreost: "cheese spread", feta: "feta cheese", cheddar: "cheddar cheese", ost: "cheese",
  skyr: "skyr", yoghurt: "yogurt", "græsk yoghurt": "greek yogurt", mælk: "milk",
  kærnemælk: "buttermilk", mascarpone: "mascarpone", hytteost: "cottage cheese",
  // Starch and grains.
  spaghetti: "spaghetti", pasta: "pasta", nudler: "noodles", ris: "white rice",
  couscous: "couscous", bulgur: "bulgur", quinoa: "quinoa", havregryn: "rolled oats",
  mel: "wheat flour", rasp: "breadcrumbs", tortilla: "tortilla", pitabrød: "pita bread",
  brød: "bread", burgerbolle: "hamburger bun", pizzadej: "pizza dough", gnocchi: "gnocchi",
  kartofler: "potato", kartoffel: "potato", "søde kartofler": "sweet potato",
  linser: "lentils", kikærter: "chickpeas", bønner: "beans", majs: "corn",
  // Vegetables and fruit.
  løg: "onion", rødløg: "red onion", forårsløg: "spring onion", porre: "leek",
  hvidløg: "garlic", gulerødder: "carrot", gulerod: "carrot", tomatpuré: "tomato paste",
  "hakkede tomater": "canned tomatoes", tomater: "tomato", tomat: "tomato",
  peberfrugt: "bell pepper", chili: "chili pepper", squash: "zucchini", aubergine: "eggplant",
  broccoli: "broccoli", blomkål: "cauliflower", spinat: "spinach", grønkål: "kale",
  salat: "lettuce", agurk: "cucumber", champignon: "mushroom", svampe: "mushrooms",
  ærter: "peas", selleri: "celery", kål: "cabbage", spidskål: "cabbage",
  grøntsager: "mixed vegetables", "hakket grønt": "mixed vegetables", avocado: "avocado",
  oliven: "olives", citron: "lemon", lime: "lime", appelsin: "orange", æble: "apple",
  banan: "banana", rosiner: "raisins", ingefær: "ginger", asparges: "asparagus",
  fennikel: "fennel", pastinak: "parsnip", jordskokker: "jerusalem artichoke",
  rodfrugter: "root vegetables", græskar: "pumpkin", rødbeder: "beetroot",
  radise: "radish", bønnespirer: "bean sprouts", bambusskud: "bamboo shoots",
  hjertesalat: "romaine lettuce", karse: "cress",
  // Herbs and spices.
  persille: "parsley", basilikum: "basil", koriander: "cilantro", dild: "dill",
  kapers: "capers", purløg: "chives", estragon: "tarragon", salvie: "sage", rosmarin: "rosemary",
  krydderurter: "fresh herbs", mynte: "mint", kørvel: "chervil", laurbærblad: "bay leaf",
  muskatnød: "nutmeg", karry: "curry powder", paprika: "paprika", spidskommen: "cumin",
  kanel: "cinnamon", oregano: "oregano", timian: "thyme", grillkrydderi: "bbq seasoning",
  salt: "salt", peber: "black pepper",
  // Nuts and seeds.
  mandler: "almonds", valnødder: "walnuts", cashewnødder: "cashew nuts",
  hasselnødder: "hazelnuts", nødder: "nuts", solsikkekerner: "sunflower seeds",
  sesamfrø: "sesame seeds", pinjekerner: "pine nuts", kokosmel: "desiccated coconut",
  // Store cupboard.
  sukker: "sugar", honning: "honey", sirup: "syrup", chokolade: "chocolate",
  kakao: "cocoa powder", ketchup: "ketchup", sennep: "mustard", sojasauce: "soy sauce",
  soja: "soy sauce", soya: "soy sauce", fiskesauce: "fish sauce", eddike: "vinegar",
  balsamico: "balsamic vinegar", hummus: "hummus", tahin: "tahini", tofu: "tofu",
  falaf: "falafel", chutney: "chutney", passata: "tomato passata", sambal: "chili paste",
  tacosauce: "taco sauce", kulør: "gravy browning", bouillon: "broth", vand: "water",
  vin: "wine", hvidvin: "white wine", rødvin: "red wine", øl: "beer", jalapeño: "jalapeno",
};

/** Words that describe how a product was prepared, not what it is. */
const PREPARATION_WORDS = new Set([
  "frisk", "friske", "frisklavet", "hakket", "hakkede", "revet", "revne", "skåret", "snittet",
  "kogt", "kogte", "stegt", "stegte", "bagt", "ristet", "ristede", "tørret", "tørrede",
  "frossen", "frosne", "dybfrossen", "økologisk", "økologiske", "usaltet", "saltet", "røget",
  "grofthakket", "finthakket", "fintsnittet", "udbenet", "ca", "gerne", "evt", "til", "og",
  "af", "med", "uden", "eller", "store", "stor", "små", "lille", "halv", "halve", "hele", "hel",
  "i", "på", "fra", "efter", "smag", "evt.", "samt",
]);

/** The most words a fallback query keeps — a search phrase, not a sentence. */
const MAX_FALLBACK_WORDS = 3;

/**
 * The nutrition-lookup term an ingredient line resolves to, or null when the
 * line names nothing to look up ("salt og peber efter smag" reduced to
 * nothing, an empty line).
 */
export function ingredientTerm(
  line: string,
  language: NutritionLanguage = "en",
): IngredientTerm | null {
  const rest = withoutQuantity(line);
  if (!rest) return null;

  const key = lookupProduct(rest);
  if (key) {
    // A vocabulary word always has an English name — the two tables are
    // written together — but fall back to the Danish rather than throwing if
    // one is ever added to only one of them.
    return { key, query: language === "da" ? key : (ENGLISH_NAMES[key] ?? key), recognised: true };
  }

  const fallback = fallbackTerm(rest);
  if (!fallback) return null;
  // Nothing to translate an unknown word into, so it goes out as written. A
  // Danish-localised key can still find it; an English one will not, and the
  // line falls back to the local kcal table (see `recipeNutrition.ts`).
  return { key: fallback, query: fallback, recognised: false };
}

/**
 * Distinct terms across a whole ingredient list, in the order first seen.
 *
 * Deduped, because a recipe listing onion three times is one lookup and 350
 * recipes listing it are still one — which is the difference between a few
 * hundred API calls and tens of thousands.
 */
export function ingredientTerms(
  lines: readonly string[],
  language: NutritionLanguage = "en",
): IngredientTerm[] {
  const seen = new Map<string, IngredientTerm>();
  for (const line of lines) {
    const term = ingredientTerm(line, language);
    if (term && !seen.has(term.key)) seen.set(term.key, term);
  }
  return [...seen.values()];
}

/**
 * A search phrase for a line the vocabulary doesn't know: the unit word and
 * the preparation words dropped, and only the first few words of what's left
 * kept. "1 pakke frisk frilandsgris i skiver" becomes "frilandsgris skiver" —
 * still a long shot against an English database, but a *stable* long shot,
 * which is what makes caching the miss worthwhile.
 */
function fallbackTerm(rest: string): string | null {
  const unit = parseUnit(rest);
  const words = rest
    .split(/[^a-zà-ÿæøå0-9]+/i)
    .filter(Boolean)
    .filter((word, index) => !(index === 0 && word === unit))
    .filter((word) => !PREPARATION_WORDS.has(word) && !/^\d+$/.test(word));

  return words.length === 0 ? null : words.slice(0, MAX_FALLBACK_WORDS).join(" ");
}
