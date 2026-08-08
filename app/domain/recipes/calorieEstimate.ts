/**
 * Reading an ingredient line: how much food it puts in the pot, which product
 * it is about, and — where nothing better is available — how many calories
 * that product carries.
 *
 * REMA's recipes carry no nutrition data at all, so everything the app knows
 * about a dinner has to be computed from the only thing there is: the
 * ingredient lines, as free text. This file does the reading; what is done
 * with it is in `app/domain/nutrition/recipeNutrition.ts`, which prefers
 * FatSecret's food database and falls back to the kcal table below for the
 * lines FatSecret can't be asked about.
 *
 * The table is *only* kcal, and that is the point of the FatSecret
 * integration: protein and fat for 250 Danish products is a nutrition
 * database, not a constant anyone should hand-write. What the table is good
 * at is being *comparative* — a lentil soup and a creamy pork dish are
 * separated by a factor of three, and no plausible error in a table of
 * per-100 g figures reorders that — so it remains the fallback rather than
 * being deleted.
 *
 * Two deliberate simplifications, shared with the rest of the pipeline:
 *
 *   * Volumes convert to grams 1:1. True for water and near enough for most
 *     of what a recipe measures in dl; oil is 0.92 and the fats table below
 *     already dwarfs the difference.
 *   * Cooked/raw is ignored. `ris` is listed dry, because that is how a
 *     recipe measures it, and `bønner` canned, for the same reason.
 */

/** Fallback when a line's product isn't in the table below. */
export const DEFAULT_KCAL_PER_100G = 150;

/** Fallback weight for a "1 stk"-style line whose product isn't in `ITEM_WEIGHTS`. */
const DEFAULT_ITEM_GRAMS = 100;

/**
 * What a line with no quantity at all ("salt og peber", "frisk persille") is
 * taken to weigh. Small on purpose: an unquantified line is nearly always a
 * seasoning or a garnish, and the two that appear in almost every recipe —
 * salt and pepper — are priced at zero in the table so they can't tilt a
 * ranking every dish is subject to anyway.
 */
const UNQUANTIFIED_GRAMS = 10;

/** REMA's recipes state servings often but not always; four is the family this plans for. */
export const DEFAULT_SERVINGS = 4;

/**
 * The most one ingredient line is allowed to contribute.
 *
 * Source data has typos, and an unrecognised unit is read as a count of the
 * thing itself — so "100 cm fløde" (a real line, in *Saltimbocca på
 * Frilandsgris*) parsed as a hundred portions of cream and priced that
 * recipe at 8900 kcal a serving. No line of a family dinner puts more than
 * about a kilo and a half in the pot, so anything past that is a parse
 * failure rather than a big recipe, and capping it keeps one typo from
 * dominating a calorie ranking.
 */
const MAX_LINE_GRAMS = 1500;

/**
 * kcal per 100 g, keyed by the product word the ingredient line uses.
 *
 * Longest key first wins, so `hakket oksekød` never has to exist as a key:
 * `oksekød` is found inside the line and `okse` never gets a chance to
 * disagree. Values are ordinary reference figures, rounded — the ranking
 * cares about which side of a comparison a dish falls on, not about ±5%.
 */
export const KCAL_PER_100G: Record<string, number> = {
  // Fats and oils — the numbers that actually move a dish's total.
  olivenolie: 884, rapsolie: 884, sesamolie: 884, olie: 884,
  smør: 717, margarine: 717, mayonnaise: 680, remoulade: 500, pesto: 450,
  piskefløde: 340, madlavningsfløde: 190, "creme fraiche": 190, cremefraiche: 190,
  kokosmælk: 180, fløde: 340,
  // Meat, poultry, fish.
  bacon: 400, flæsk: 350, medister: 300, pølse: 300, chorizo: 450, salami: 400,
  spegepølse: 400, frikadelle: 250,
  oksekød: 250, oksemørbrad: 140, okse: 250, kalvekød: 170,
  svinekød: 240, svinemørbrad: 120, nakkefilet: 240,
  kyllingebryst: 110, kyllingelår: 180, kyllingekød: 165, kylling: 165,
  kalkun: 110, andebryst: 250, lammekød: 260,
  leverpostej: 300, lever: 130, skinke: 150, pålæg: 200,
  laks: 200, torsk: 80, rødspætte: 90, ørred: 150, tunfisk: 130,
  rejer: 100, muslinger: 85, fiskefilet: 90, fisk: 120,
  æg: 155, æggeblomme: 320,
  // Dairy and cheese.
  parmesan: 400, mozzarella: 250, flødeost: 250, smøreost: 250, feta: 260,
  cheddar: 400, ost: 380, skyr: 60, yoghurt: 60, "græsk yoghurt": 100,
  mælk: 45, kærnemælk: 40,
  // Starch and grains, measured the way a recipe measures them.
  spaghetti: 360, pasta: 360, nudler: 350, ris: 355, couscous: 360, bulgur: 350,
  quinoa: 370, havregryn: 370, mel: 340, rasp: 350, tortilla: 300, pitabrød: 275,
  brød: 260, kartofler: 77, kartoffel: 77, "søde kartofler": 86,
  linser: 116, kikærter: 130, bønner: 120, majs: 86,
  // Vegetables and fruit.
  løg: 40, rødløg: 40, forårsløg: 32, porre: 61, hvidløg: 150,
  gulerødder: 41, gulerod: 41, tomatpuré: 82, "hakkede tomater": 30, tomater: 18,
  tomat: 18, peberfrugt: 26, chili: 40, squash: 17, aubergine: 25, broccoli: 34,
  blomkål: 25, spinat: 23, grønkål: 49, salat: 15, agurk: 15, champignon: 22,
  svampe: 22, ærter: 81, selleri: 16, kål: 25, grøntsager: 35, avocado: 160,
  oliven: 145, citron: 29, lime: 30, appelsin: 47, æble: 52, banan: 89,
  rosiner: 300, ingefær: 80, persille: 36, basilikum: 23, koriander: 23,
  // Nuts and seeds.
  mandler: 579, valnødder: 654, cashewnødder: 553, hasselnødder: 628,
  nødder: 600, solsikkekerner: 584, sesamfrø: 573, pinjekerner: 673,
  // Store cupboard.
  sukker: 400, honning: 300, sirup: 300, chokolade: 550, kakao: 230,
  ketchup: 100, sennep: 66, sojasauce: 60, soja: 60, fiskesauce: 35,
  eddike: 20, balsamico: 90, hummus: 170, tahin: 595, kokosmel: 660,
  bouillon: 5, vand: 0, salt: 0, peber: 0, karry: 325, paprika: 280,
  spidskommen: 375, kanel: 247, oregano: 265, timian: 101,
  vin: 80, hvidvin: 80, rødvin: 85, øl: 43,
  /*
   * Added after measuring against the 350 scraped dinners: these were the
   * lines the table missed most often, and they cover about a third of what
   * was falling back to the default.
   */
  grisekød: 240, kebab: 220, asparges: 20, dild: 43, kapers: 23, purløg: 30,
  estragon: 40, salvie: 40, rosmarin: 131, krydderurter: 40, karse: 30,
  bønnespirer: 30, fennikel: 31, pastinak: 75, muskatnød: 525, laurbærblad: 0,
  kulør: 0, soya: 60, chutney: 180, burgerbolle: 280, passata: 30, tofu: 145,
  falaf: 330, gnocchi: 170, mascarpone: 430, hytteost: 98, pizzadej: 280,
  jordskokker: 73, rodfrugter: 50, græskar: 26, rødbeder: 43, spidskål: 25,
  revelsben: 290, kamben: 290, entrecote: 220, kotelet: 230, hamburgerryg: 130,
  fedtstof: 800, sambal: 90, radise: 16, mynte: 44, kørvel: 40, jalapeño: 30,
  bambusskud: 20, tacosauce: 60, grillkrydderi: 300, hjertesalat: 15,
  "hakket grønt": 35,
};

/** What "1 stk" weighs, for the lines that count things instead of weighing them. */
const ITEM_WEIGHTS: Record<string, number> = {
  æg: 60, løg: 110, rødløg: 110, forårsløg: 15, hvidløg: 5, gulerod: 60,
  gulerødder: 60, kartoffel: 100, kartofler: 100, tomat: 100, tomater: 100,
  citron: 100, lime: 60, appelsin: 150, æble: 150, banan: 120, avocado: 150,
  peberfrugt: 150, chili: 15, agurk: 300, squash: 300, aubergine: 250,
  porre: 150, kyllingebryst: 150, tortilla: 50, bouillon: 4, brød: 35,
};

/** Units that name a volume, in millilitres, taken as grams 1:1 (see above). */
const VOLUME_UNITS: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, l: 1000, liter: 1000,
  spsk: 15, tsk: 5, knivspids: 0.5, knsp: 0.5, nip: 0.5,
};

/** Units that name a weight, in grams. */
const WEIGHT_UNITS: Record<string, number> = { g: 1, gram: 1, kg: 1000, hg: 100 };

/** Units that name a container or a handful, in grams of what's usually in one. */
const PACK_UNITS: Record<string, number> = {
  dåse: 400, dåser: 400, ds: 400, pakke: 250, pakker: 250, pose: 250, poser: 250,
  bundt: 50, håndfuld: 30, håndfulde: 30, kvist: 2, kviste: 2, skive: 20,
  skiver: 20, fed: 5, glas: 200, bakke: 250, portion: 200, portioner: 200,
  // Seen across the 350 scraped dinner recipes: "10 blad frisk salvie",
  // "1 potte dild", "1 flaske BBQ sauce", "3 terning oksebouillon".
  blad: 2, blade: 2, stilk: 10, stilke: 10, potte: 30, bøtte: 200, bæger: 200,
  flaske: 500, flasker: 500, kop: 240, terning: 4, terninger: 4, klat: 15,
};

/** Units that mean "this many of the thing itself" — resolved via `ITEM_WEIGHTS`. */
const COUNT_UNITS = new Set(["stk", "styk", "stykker", "hel", "hele", "store", "små", "lille", "stor"]);

const FRACTIONS: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
};

/**
 * The quantity a line opens with, or null when it doesn't open with one.
 *
 * Handles the three forms REMA's lines actually use: a plain number
 * (`500 g`), a range meaning "about this much" (`2-3 spsk`, averaged), and a
 * vulgar fraction (`½ citron`), including the `1½` that follows a number.
 */
export function parseQuantity(line: string): number | null {
  const match = line
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])?(?:\s*[-–/]\s*(\d+(?:[.,]\d+)?))?/);
  if (!match) return null;

  const [, whole, fraction, upper] = match;
  if (!whole && !fraction) return null;

  const base = (whole ? Number(whole.replace(",", ".")) : 0) + (fraction ? FRACTIONS[fraction]! : 0);
  // A range is an "about" — the middle of it is the honest reading.
  return upper ? (base + Number(upper.replace(",", "."))) / 2 : base;
}

/** The lowercased line with its leading quantity and any parenthetical removed. */
export function withoutQuantity(line: string): string {
  return line
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔]?(?:\s*[-–/]\s*\d+(?:[.,]\d+)?)?/, " ")
    .replace(/^\s*[½¼¾⅓⅔]/, " ")
    .trim();
}

/** The unit word a line uses, if it uses one. */
export function parseUnit(rest: string): string | undefined {
  const first = rest.split(/[^a-zà-ÿæøå]+/i)[0]?.toLowerCase();
  if (!first) return undefined;
  const known =
    first in VOLUME_UNITS || first in WEIGHT_UNITS || first in PACK_UNITS || COUNT_UNITS.has(first);
  return known ? first : undefined;
}

/**
 * The most a word may carry in front of a key and still be a kind of it.
 *
 * The suffix rule exists for Danish head-final compounds — `rødløg` is a kind
 * of `løg`, `hvidløg` of `løg` — where the qualifier is short. Unbounded, the
 * same rule reads `frilandsgris` (free-range pork) as a kind of `ris`, and
 * prices a pork dish as rice: `ris` is only three letters, so it turns up at
 * the end of words that have nothing to do with it. Four characters covers
 * the qualifiers Danish actually forms compounds with (`rød`, `hvid`, `grøn`,
 * `sød`) and excludes the eight-letter accidents.
 */
const MAX_COMPOUND_QUALIFIER = 4;

/**
 * Whether an ingredient line names the product a table key stands for.
 *
 * Matched against the line's *words* rather than against the whole string,
 * which is the difference between working and not: `friske krydderurter`
 * contains the letters of `ris`, and a plain substring test priced fresh
 * herbs as dry rice. A word may match a key exactly, start with it (Danish
 * compounds are head-final, so `kyllingebryst` is a kind of `kylling`) or end
 * with it, with a short enough qualifier in front. Multi-word keys are the
 * one case that still has to look at the whole line.
 */
function lineNames(key: string, rest: string, tokens: string[]): boolean {
  if (key.includes(" ")) return rest.includes(key);
  return tokens.some(
    (token) =>
      token === key ||
      token.startsWith(key) ||
      (token.endsWith(key) && token.length - key.length <= MAX_COMPOUND_QUALIFIER),
  );
}

/**
 * Longest key first, so `oksekød` beats `okse` and `hakkede tomater` beats
 * `tomater` — the more specific figure is always the better one, and a
 * shorter key would otherwise win purely by appearing earlier in the object.
 */
const KCAL_KEYS_BY_LENGTH = Object.keys(KCAL_PER_100G).sort((a, b) => b.length - a.length);
const ITEM_KEYS_BY_LENGTH = Object.keys(ITEM_WEIGHTS).sort((a, b) => b.length - a.length);

function wordsOf(rest: string): string[] {
  return rest.split(/[^a-zà-ÿæøå]+/i).filter(Boolean);
}

/**
 * The table key an already-de-quantified ingredient line names, if any.
 *
 * Exported because it is also the app's ingredient-line *vocabulary*: the
 * keys were tuned against the 350 scraped dinners, so "which product is this
 * line about" is a question `nutrition/ingredientTerms.ts` can ask the same
 * way rather than parsing Danish ingredient lines a second time.
 */
export function lookupProduct(rest: string): string | undefined {
  const tokens = wordsOf(rest);
  return KCAL_KEYS_BY_LENGTH.find((key) => lineNames(key, rest, tokens));
}

function itemGrams(rest: string): number {
  const tokens = wordsOf(rest);
  const key = ITEM_KEYS_BY_LENGTH.find((candidate) => lineNames(candidate, rest, tokens));
  return key ? ITEM_WEIGHTS[key]! : DEFAULT_ITEM_GRAMS;
}

/** How many grams of food one ingredient line puts in the pot. */
export function estimateLineGrams(line: string): number {
  const quantity = parseQuantity(line);
  const rest = withoutQuantity(line);
  const unit = parseUnit(rest);

  if (quantity === null) return UNQUANTIFIED_GRAMS;

  const grams =
    unit && unit in WEIGHT_UNITS
      ? quantity * WEIGHT_UNITS[unit]!
      : unit && unit in VOLUME_UNITS
        ? quantity * VOLUME_UNITS[unit]!
        : unit && unit in PACK_UNITS
          ? quantity * PACK_UNITS[unit]!
          : // "2 løg", "1 stk kyllingebryst" — both count the thing itself.
            quantity * itemGrams(rest);

  return Math.min(grams, MAX_LINE_GRAMS);
}
