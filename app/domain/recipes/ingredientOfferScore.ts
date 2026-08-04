import type { Offer } from "~/domain/types";

/**
 * Matching between recipe ingredient lines and REMA 1000 offer names.
 *
 * Both sides are messy free text pulled from different systems, and a plain
 * substring test between them fails on almost every real pair:
 *
 *   ingredient "500 g hakket oksekød"
 *   offer      "Friland Hakket dansk oksekød 8-12%"
 *
 * Neither string contains the other, so the naive check scored 0. The fix is
 * to reduce both sides to comparable *product* tokens first — drop
 * quantities, units, preparation notes and brand/marketing filler — and then
 * compare token-by-token with Danish compound nouns in mind.
 *
 * Offer names also routinely bundle several products into one string
 * ("REMA 1000 Dansk kyllingebrystfilet, -inderfilet eller hel kylling"), so
 * they are split into alternatives before tokenizing; matching any one
 * alternative counts as matching the offer.
 */

/**
 * Words that carry no product identity on either side. Removing them from
 * *both* the ingredient and the offer keeps the comparison symmetric — e.g.
 * "hakket" drops out of both "500 g hakket oksekød" and "Friland Hakket
 * dansk oksekød", leaving "oksekød" on each side.
 */
const STOPWORDS = new Set([
  // Quantities and units.
  "g", "gram", "kg", "ml", "cl", "dl", "l", "liter", "tsk", "spsk", "knivspids",
  "knsp", "stk", "styk", "dåse", "dåser", "pakke", "pakker", "pk", "pose", "poser",
  "bundt", "fed", "håndfuld", "nip", "kvist", "kviste", "skive", "skiver", "ca",
  "portion", "portioner", "bakke", "glas", "brev",
  // Preparation notes.
  "hakket", "hakkede", "finthakket", "finthakkede", "revet", "revne", "snittet",
  "snittede", "skåret", "skårne", "tern", "strimler", "kogt", "kogte", "stegt",
  "stegte", "friskkværnet", "knust", "knuste", "presset", "pressede", "flåede",
  "tørret", "tørrede", "frossen", "frosne", "optøet", "udblødt", "smeltet",
  // Marketing and provenance filler common in REMA offer names.
  "rema", "1000", "dansk", "danske", "økologisk", "økologiske", "øko", "frisk",
  "friske", "hel", "hele", "ready", "to", "go", "serve", "mini", "stor", "store",
  "lille", "små", "ny", "nye", "original",
  // Function words.
  "og", "eller", "med", "uden", "i", "til", "af", "på", "for", "samt", "en", "et",
  "den", "det", "de", "der", "som", "fra",
]);

/** Offer names bundle alternatives; each is matched independently. */
function splitOfferAlternatives(offerName: string): string[] {
  return offerName
    .split(/\s+eller\s+|,|\/|\bsamt\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Strips a leading quantity ("500 g", "1½", "2-3 spsk") and any trailing
 * parenthetical or post-comma preparation note, which otherwise contribute
 * tokens that never appear in an offer name.
 */
function stripQuantities(text: string): string {
  return text
    .replace(/\([^)]*\)/g, " ")
    .replace(/[\d]+([.,]\d+)?(\s*[-–/]\s*[\d]+([.,]\d+)?)?/g, " ")
    .replace(/[½¼¾⅓⅔]/g, " ")
    .replace(/\d+\s*%/g, " ");
}

/**
 * Light Danish stemmer: strips the common plural/definite endings so
 * "bønner"/"bønne" and "tomater"/"tomat" compare equal. Deliberately
 * conservative — it only strips when enough stem remains to stay meaningful.
 */
function stem(word: string): string {
  for (const suffix of ["erne", "ene", "er", "en", "et", "e"]) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/** Product-identifying tokens: lowercased, de-quantified, stopword-free, stemmed. */
export function productTokens(text: string): string[] {
  return stripQuantities(text.toLowerCase())
    .split(/[^a-zà-ÿæøå0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem)
    .filter(Boolean);
}

/**
 * Compares two product tokens, allowing for Danish compound nouns.
 *
 * Compounds are head-final ("kyllinge|bryst"), so the *leading* element names
 * the product family: "kyllingebryst" should match an offer for "kylling".
 * Suffix containment is deliberately not accepted — it would make "hvidløg"
 * (garlic) match an offer for "løg" (onion).
 */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];

  // Compound prefix: "kyllingebrystfilet" starts with "kyllingebryst".
  if (shorter.length >= 4 && longer.startsWith(shorter)) return true;

  // Shared lead for longer words absorbs irregular plurals the stemmer
  // misses ("kartofler" / "kartoffel") without matching on short stems.
  if (shorter.length >= 6 && longer.slice(0, 5) === shorter.slice(0, 5)) return true;

  return false;
}

/** True when any product token of the ingredient matches any of the offer name's. */
function ingredientMatchesOfferName(ingredientTokens: string[], offerName: string): boolean {
  if (ingredientTokens.length === 0) return false;

  return splitOfferAlternatives(offerName).some((alternative) => {
    const offerTokens = productTokens(alternative);
    return offerTokens.some((offerToken) =>
      ingredientTokens.some((ingredientToken) => tokensMatch(ingredientToken, offerToken)),
    );
  });
}

/**
 * Offers whose product matches the given ingredient line. Shared by
 * `offerAwareSelection` (curated catalog, structured ingredient names) and
 * `externalRecipeMatch` (scraped recipes, free-text ingredient lines).
 */
export function offersMatchingIngredient(ingredientName: string, offers: Offer[]): Offer[] {
  const ingredientTokens = productTokens(ingredientName);
  return offers.filter((offer) => ingredientMatchesOfferName(ingredientTokens, offer.name));
}
