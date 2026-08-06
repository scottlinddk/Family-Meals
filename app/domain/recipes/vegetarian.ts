import type { ExternalRecipe } from "~/domain/types";

/**
 * Is this recipe meat-free?
 *
 * REMA's recipes don't say. They carry a title, an ingredient list, an image
 * and a set of theme slugs, so "vegetarian" has to be *read off the
 * ingredients* — which makes this text matching, with all the same hazards as
 * `ingredientOfferScore`, and one important asymmetry:
 *
 *   A recipe wrongly called vegetarian puts meat on the plate of someone who
 *   asked for none. A vegetarian recipe wrongly left out of the list costs
 *   them one suggestion.
 *
 * So the rules below lean towards *finding* meat. Anything derived from an
 * animal counts — `kyllingebouillon` is chicken here, even though
 * `ingredientOfferScore` deliberately treats it as a different product from
 * chicken (you can't buy the stock cube and get the bird). The two modules
 * ask different questions about the same word.
 *
 * Vegetarian, not vegan: eggs, milk and cheese stay in. The ask was meat-free
 * dinners, and a family that eats æg og ost is the one this is planning for.
 */

/**
 * Meat and fish words matched as a *prefix* of a token, because Danish
 * compounds are head-final: the leading element names the animal, so
 * `kylling` reaches `kyllingebryst`, `kyllingelår` and `kyllingebouillon`
 * alike, and plurals (`pølser`, `kyllinger`) come for free.
 *
 * Every entry has to be long enough that its prefix can't lead somewhere
 * else. `lam` is not here — it would claim `lampe` — and appears in
 * `EXACT_MEAT_TOKENS` below instead.
 */
const MEAT_PREFIXES = [
  // Meat and poultry.
  "kylling", "kalkun", "okse", "kalve", "svine", "grise", "flæsk", "bacon",
  "skinke", "pølse", "kød", "fars", "pålæg", "medister", "frikadelle",
  "lamme", "ande", "vildt", "hjorte", "kanin", "lever", "chorizo", "salami",
  "serrano", "pancetta", "kebab", "schnitzel", "ribbens", "nakkefilet",
  "culotte", "kotelet", "prosciutto", "mørbrad", "hønse", "høne", "spareribs",
  // Fish and shellfish.
  "fisk", "laks", "torsk", "tunfisk", "reje", "musling", "ansjos", "sardin",
  "makrel", "sild", "ørred", "hellefisk", "rødspætte", "krebs", "blæksprutte",
  "calamari", "kaviar", "skaldyr", "hummer", "krabbe", "havkat", "havtaske",
  "stenbider",
];

/**
 * Words matched at the *end* of a token, for the compounds whose head — not
 * their modifier — is the animal: `hakkekød`, `vegetarens spegepølse`,
 * `leverpostej`. Kept short, because a suffix match is the easiest way to
 * hit an unrelated word.
 */
const MEAT_SUFFIXES = [
  "kød", "pølse", "pølser", "bacon", "skinke", "fars", "postej", "bøf",
  "bøffer", "fisk", "laks", "steak", "steaks", "kotelet", "koteletter",
];

/**
 * Words too short or too collision-prone to match as part of anything, so
 * they only count as a whole token: `and` (duck) is inside `vand`, `tun`
 * inside `tunge` and `tunnel`, `lam` inside `lampe`, `gris` inside
 * `grissini`.
 */
const EXACT_MEAT_TOKENS = new Set([
  "and", "ænder", "lam", "tun", "ål", "sej", "gris", "okse", "kalv", "svin",
]);

/**
 * A line that says outright that it isn't meat, which the rules above would
 * otherwise flag on the word being imitated: `vegetarpølser`,
 * `plantefars`, `vegansk bacon`. The claim is on the line, so it's read from
 * the line rather than from a single token.
 */
const NOT_MEAT_MARKERS = [
  "vegetar", "vegansk", "vegan", "veggie", "kødfri", "kodfri", "plantebaseret", "plantefars",
];

/**
 * REMA's own theme slugs for a meat-free dish.
 *
 * `kodfri` is the one that actually appears — it's on 68 of the 350 scraped
 * dinner recipes — and it is the *primary* signal here, because it is the
 * publisher's own classification rather than something inferred from text.
 * The others are listed in case the theme vocabulary grows.
 */
const MEAT_FREE_TAGS = ["kodfri", "kødfri", "vegetar", "vegansk", "vegan"];

/** Lowercased word tokens. Deliberately not `productTokens` — that stems and
 * drops stopwords for offer matching, and stemming `pølser` to `pøls` would
 * only make the prefixes below harder to write. */
function words(line: string): string[] {
  return line
    .toLowerCase()
    .split(/[^a-zà-ÿæøå]+/i)
    .filter((word) => word.length > 1);
}

function isMeatToken(token: string): boolean {
  if (EXACT_MEAT_TOKENS.has(token)) return true;
  if (MEAT_PREFIXES.some((meat) => token.startsWith(meat))) return true;
  return MEAT_SUFFIXES.some((meat) => token.endsWith(meat));
}

/** The meat or fish word found in this ingredient line, if there is one. */
export function meatTermIn(line: string): string | undefined {
  const lower = line.toLowerCase();
  if (NOT_MEAT_MARKERS.some((marker) => lower.includes(marker))) return undefined;
  return words(line).find(isMeatToken);
}

export interface VegetarianAssessment {
  vegetarian: boolean;
  /** The ingredient lines that vetoed a meat-free tag, with the word that did it. */
  meatLines: { line: string; term: string }[];
  /**
   * What the verdict rests on:
   *   * `tag` — REMA files it as meat-free and the ingredients agree
   *   * `meat-found` — it's tagged meat-free, but an ingredient says otherwise
   *   * `untagged` — REMA doesn't file it as meat-free, so this doesn't claim it is
   */
  basis: "tag" | "meat-found" | "untagged";
}

/**
 * Whether a recipe is meat-free.
 *
 * Two signals, and the order between them is the whole design:
 *
 *   1. **REMA's `kodfri` tag decides.** It is the publisher's own
 *      classification of its own recipe, and nothing read out of free text
 *      beats that. Measured against the 350 scraped dinners, the text scan
 *      alone called 115 of them meat-free, including *Pasta, kødboller og
 *      tomatsovs* — one pass over real data was enough to settle which signal
 *      leads.
 *   2. **The ingredient scan can only take it away.** A tagged recipe whose
 *      ingredients name an animal is not served up as meat-free: the same
 *      pass found *Aspargessuppe* tagged `kodfri` with "1 pakke bacon i tern"
 *      in it, and several tagged soups built on kyllingefond or oksebouillon.
 *      Whether those are REMA's mistakes or garnishes doesn't matter — the
 *      person filtering for meat-free is better served by the stricter
 *      reading.
 *
 * The cost is recipes that are genuinely meat-free but untagged, which this
 * won't find. That's the right way round: a missing suggestion costs one
 * dinner idea, a wrong one puts meat on the plate of someone who asked for
 * none.
 */
export function assessVegetarian(recipe: Pick<ExternalRecipe, "ingredients" | "tags">): VegetarianAssessment {
  const taggedMeatFree = (recipe.tags ?? []).some((tag) =>
    MEAT_FREE_TAGS.some((meatFreeTag) => tag.toLowerCase().includes(meatFreeTag)),
  );
  if (!taggedMeatFree) return { vegetarian: false, meatLines: [], basis: "untagged" };

  const meatLines = recipe.ingredients
    .map((line) => ({ line, term: meatTermIn(line) }))
    .filter((found): found is { line: string; term: string } => found.term !== undefined);

  return meatLines.length > 0
    ? { vegetarian: false, meatLines, basis: "meat-found" }
    : { vegetarian: true, meatLines: [], basis: "tag" };
}
