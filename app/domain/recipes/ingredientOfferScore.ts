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
 * Colours, dropped as stopwords below because as standalone tokens they were
 * the single largest source of false matches (see the comment on `STOPWORDS`)
 * — but named separately so `guardedQualifierBefore` can still look them up
 * for the small set of nouns where the colour *does* name a different product
 * (`GUARDED_NOUN_STEMS`).
 */
const COLOR_WORDS = new Set([
  "hvid", "hvide", "rød", "røde", "grøn", "grønne", "grønt", "gul", "gule", "brun",
  "brune", "sort", "sorte",
]);

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
  /*
   * Colours, qualities and containers. These are modifiers, not products, and
   * as standalone tokens they were the single largest source of false matches
   * against a real offer set: "hvid-" in "Chilensk rød-, hvid- eller rosévin"
   * matched every "hvidløg" in 184 ingredient lines, "grøn" matched
   * "grøntsager"/"grønkål"/"grønlandske rejer", and "flaske" (a jar-and-bottle
   * offer) matched every "1 flaske øl". Dropping them from both sides leaves
   * the noun that actually names the product.
   */
  ...COLOR_WORDS,
  "blandet", "blandede", "flydende", "spicy", "sød",
  "søde", "mager", "magre", "let", "lette", "kold", "kolde", "varm", "varme",
  "fin", "fint", "fine", "grov", "groft", "grove",
  "flaske", "flasker", "krukke", "potte", "spand", "rulle",
  // Non-food that collides with a food word: a "shampoo eller balsam" offer
  // matched every "balsamico"/"balsamicoeddike" line. Nothing cooks with
  // conditioner, so the word only ever costs precision here.
  "balsam",
  // "…, kan udelades" — an optionality note, not part of the product.
  "kan", "udelades",
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
 * Stemmed nouns whose colour names a different product, not a variant of the
 * same one — unlike most food words, where colour is safely dropped (see
 * `COLOR_WORDS`). "sorte bønner" (black beans) and "hele bønner" (whole
 * coffee beans, as sold loose or in an instant-coffee offer) share the bare
 * noun once colour is stripped, which let a coffee offer match a bean
 * ingredient. Kept short and evidence-driven like `DERIVED_PRODUCT_HEADS`.
 */
const GUARDED_NOUN_STEMS = new Set(["bønn"]);

/**
 * The colour word immediately before an occurrence of `nounStem` in `text`,
 * if any — e.g. `colorQualifierBefore("252 g sorte bønner", "bønn")` is
 * `"sort"`. Scans the raw word sequence (quantities stripped, but *before*
 * colours are dropped as stopwords) since `productTokens` has already thrown
 * that information away by the time matching runs.
 */
function colorQualifierBefore(text: string, nounStem: string): string | undefined {
  const words = stripQuantities(text.toLowerCase())
    .split(/[^a-zà-ÿæøå0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 1);

  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const previous = words[i - 1]!;
    if (stem(word) === nounStem && COLOR_WORDS.has(previous)) {
      return stem(previous);
    }
  }
  return undefined;
}

/**
 * False when `ingredientToken` names a guarded noun, the ingredient text
 * gives it a colour (e.g. "sorte bønner"), and the matched offer alternative
 * either has no colour for that noun or a different one. An ingredient
 * without a colour qualifier is unconstrained, same as before this rule
 * existed.
 */
function guardedQualifierMatches(ingredientToken: string, ingredientName: string, offerAlternative: string): boolean {
  if (!GUARDED_NOUN_STEMS.has(ingredientToken)) return true;

  const ingredientQualifier = colorQualifierBefore(ingredientName, ingredientToken);
  if (!ingredientQualifier) return true;

  return colorQualifierBefore(offerAlternative, ingredientToken) === ingredientQualifier;
}

/**
 * Heads that turn a raw ingredient into a different product. A compound whose
 * *tail* is one of these is not the thing its prefix names: a jar of
 * kyllinge|bouillon is not chicken, bacon|postej is not bacon, smør|e|ost is
 * not butter, and an ingefær|shot is not ginger. Buying the offer would not
 * get you the ingredient.
 *
 * Derived from the mismatches an actual offer set produced — "smør" matched
 * "smøreost" on 117 ingredient lines and "grøntsagsbouillon" matched the
 * "35% grønt" in a mince offer on 52 — rather than from a general theory of
 * Danish compounds, which is also why it stays short.
 */
const DERIVED_PRODUCT_HEADS = [
  "bouillon", "bouillion", "fond", "terning", "pulver", "krydderi",
  "postej", "paté", "pate", "pesto", "ost", "shot", "saft", "snacks",
  "sauce", "sauc", "mel", "sukker", "sukk", "bog", "stativ", "glas",
  // "lage" (brine, as in "rejer i lage") is not "lagereddike".
  "eddike", "eddik",
  // "vand" (water) is not "vandmelon" (watermelon); "hvidløg" (garlic) is not
  // "hvidløgsmarinade" (a marinade). Both are compound-prefix false matches
  // against real offer names.
  // The stemmer turns "marinade" into "marinad" before this list is checked
  // against it, so both forms are listed.
  "melon", "marinade", "marinad",
];

/**
 * True when `longer` is `shorter` plus one of the heads above.
 *
 * Danish compounds insert a joining letter ("smør·e·ost", "kylling·e·fond",
 * "grøntsag·s·bouillon"), so the remainder is tested both as-is and with a
 * leading `e`/`s` removed — as-is matters, because stripping it blindly turns
 * "ingefær|shot" into "hot" and lets the ginger shot through.
 */
function isDerivedProduct(shorter: string, longer: string): boolean {
  const remainder = longer.slice(shorter.length);
  const candidates = [remainder, remainder.replace(/^[es]/, "")];
  return candidates.some((candidate) =>
    DERIVED_PRODUCT_HEADS.some((head) => candidate === head || candidate.endsWith(head)),
  );
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
  if (shorter.length >= 4 && longer.startsWith(shorter) && !isDerivedProduct(shorter, longer)) return true;

  /*
   * There used to be a third rule: any two tokens of 6+ characters sharing
   * their first five matched, to absorb stem alternations like
   * "kartofler"/"kartoffel". Measured against a real offer set it produced 115
   * distinct pairs, and most were two unrelated products that happen to share
   * a compound modifier: "spids"kommen with "spids"kål, "sylte"de asier with a
   * "sylte"bog, "frisk"revet parmesan with "frisk"ost, "fuldkorns"tortilla
   * with "fuldkorns"pasta. The alternation it was for barely occurs — both
   * sides normally say "kartofler", which the stemmer already equalizes — so
   * shared leads are no longer accepted at all.
   *
   * What that costs: "kyllingebryst" no longer reaches "kyllingekød" directly,
   * since neither is a prefix of the other. In practice REMA's bundled offer
   * names spell the family out anyway ("… eller hel kylling"), which the
   * prefix rule above matches.
   */
  return false;
}

/** True when any product token of the ingredient matches any of the offer name's. */
function ingredientMatchesOfferName(ingredientTokens: string[], ingredientName: string, offerName: string): boolean {
  if (ingredientTokens.length === 0) return false;

  return splitOfferAlternatives(offerName).some((alternative) => {
    const offerTokens = productTokens(alternative);
    return offerTokens.some((offerToken) =>
      ingredientTokens.some(
        (ingredientToken) =>
          tokensMatch(ingredientToken, offerToken) &&
          guardedQualifierMatches(ingredientToken, ingredientName, alternative),
      ),
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
  return offers.filter((offer) => ingredientMatchesOfferName(ingredientTokens, ingredientName, offer.name));
}
