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
  // "græsk" is provenance like "dansk", and it is also a prefix of "græskar"
  // (pumpkin) — which had "græskarkerner" and "1 stk græskar" matching an
  // "Athena græsk yoghurt" offer. Dropped from both sides, "græsk yoghurt"
  // still meets the offer on "yoghurt".
  "græsk", "græske",
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

/**
 * The product identity of an ingredient line, as one comparable string —
 * "1 stk squash", "2 stk squash" and "140 g squash" all reduce to "squash".
 *
 * This is the granularity a match is *made* at, so it is also the granularity
 * anything recording a decision about a match has to be keyed at. Keying on
 * the raw line instead means a family flagging "1 stk squash" against a
 * Coca-Cola "Squash" offer still sees the same wrong pairing on every recipe
 * that happens to say "2 stk squash".
 */
export function ingredientMatchKey(ingredientName: string): string {
  return productTokens(ingredientName).join(" ");
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
 * ingredient; "grønne citroner" are limes, not lemons. Kept short and
 * evidence-driven like `DERIVED_COMPOUND_TAILS`.
 */
const GUARDED_NOUN_STEMS = new Set(["bønn", "citron"]);

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
 * For a guarded noun, true only when the ingredient and the offer agree about
 * its colour — both naming the same one, or neither naming any.
 *
 * The comparison is symmetric because the mismatch runs both ways: "sorte
 * bønner" must not reach a plain "bønner" coffee offer, and a recipe's plain
 * "citron" must not reach "grønne citroner", which are limes.
 */
function guardedQualifierMatches(ingredientToken: string, ingredientName: string, offerAlternative: string): boolean {
  if (!GUARDED_NOUN_STEMS.has(ingredientToken)) return true;

  return (
    colorQualifierBefore(ingredientName, ingredientToken) ===
    colorQualifierBefore(offerAlternative, ingredientToken)
  );
}

/**
 * Tails that turn a compound into a different product. A compound whose
 * *tail* is one of these is not the thing its prefix names: a jar of
 * kyllinge|bouillon is not chicken, bacon|postej is not bacon, smør|e|ost is
 * not butter, and an ingefær|shot is not ginger. Buying the offer would not
 * get you the ingredient.
 *
 * Entries are stored stemmed as well as whole where the stemmer changes them
 * ("marinade" → "marinad", "cremefine" → "cremefin"), since the comparison
 * runs on already-stemmed tokens.
 *
 * Derived from the mismatches an actual offer set produced — "smør" matched
 * "smøreost" on 117 ingredient lines and "grøntsagsbouillon" matched the
 * "35% grønt" in a mince offer on 52 — rather than from a general theory of
 * Danish compounds, which is also why it stays short.
 */
const DERIVED_COMPOUND_TAILS = [
  "bouillon", "bouillion", "fond", "terning", "pulver", "krydderi",
  "postej", "paté", "pate", "pesto", "ost", "shot", "saft", "snacks",
  "sauce", "sauc", "mel", "sukker", "sukk", "bog", "stativ", "glas",
  // "lage" (brine, as in "rejer i lage") is not "lagereddike".
  "eddike", "eddik",
  // From the reported mismatches: "vand" is not "vandmelon" or a "vandskål"
  // (a dog's water bowl), "hvidløg" is not "hvidløgsmarinade", "smør" is not
  // "smørrebrød", and "creme" is not "cremefine".
  "melon", "marinade", "marinad", "skål", "brød", "fine", "fin",
];

/**
 * Words that, standing as a word of their own in an offer name, say the offer
 * is a *processed form* of an ingredient rather than the ingredient: "Go-Tan
 * chili saucer" is not a chili, "Beauvais tomat ketchup" is not a tomato,
 * "Zelected syltede rødløg" is not an onion.
 *
 * Deliberately narrower than the compound tails above, because the two roles
 * are not the same: "brød" as a tail marks a processed form ("smørre|brød"),
 * but as a word of its own it names bread, which is exactly what a recipe
 * asking for bread wants. Only words that are a preparation in their own
 * right belong here.
 */
const PROCESSED_FORM_WORDS = [
  "sauce", "sauc", "ketchup", "paste", "past", "mayonnaise", "mayo",
  "dressing", "sylted", "syltede", "pesto", "krydderi", "postej", "paté",
  "pate", "bouillon", "bouillion", "fond",
];

/**
 * True when the offer alternative names a processed form of the ingredient —
 * "chili saucer" for a fresh chili, "tomat ketchup" for tinned tomatoes.
 *
 * The word stands on its own here rather than as a compound tail, so the
 * ingredient token matches the offer's exactly and `tokensMatch` has nothing
 * to object to. Rejecting the whole alternative is the point: it is the
 * *combination* that names the other product.
 *
 * An ingredient that asks for the processed form itself is unaffected — "2
 * spsk ketchup" against a ketchup offer, "1 spsk fiskesauce" against a fish
 * sauce — since its own tokens carry the same word.
 */
function namesProcessedForm(offerTokens: string[], ingredientTokens: string[]): boolean {
  return offerTokens.some(
    (offerToken) =>
      PROCESSED_FORM_WORDS.includes(offerToken) &&
      !ingredientTokens.some(
        (ingredientToken) => ingredientToken === offerToken || ingredientToken.endsWith(offerToken),
      ),
  );
}

/**
 * One alternative up to its "med": what that product *is*, without what it is
 * flavoured with. "Hel kylling med hvidløgsmarinade" is chicken, not garlic;
 * "Hakkebøffer med bøgerøget bacon" are patties, not bacon.
 *
 * Applied per alternative, *after* the split, which is what makes it safe:
 * REMA also uses "med" ahead of a list of sibling products ("Hakket oksekød
 * med 35% grønt, kyllingekød, grise- og kalvekød"), where cutting the whole
 * name at the first "med" would throw away three real products. Splitting
 * first leaves each sibling to be judged on its own.
 */
function stripFlavourClause(alternative: string): string {
  return alternative.split(/\s+med\s+/i)[0]!;
}

/**
 * True when `longer` is `shorter` plus one of the tails in
 * `DERIVED_COMPOUND_TAILS`.
 *
 * Danish compounds insert a joining letter ("smør·e·ost", "kylling·e·fond",
 * "grøntsag·s·bouillon"), so the remainder is tested both as-is and with a
 * leading `e`/`s` removed — as-is matters, because stripping it blindly turns
 * "ingefær|shot" into "hot" and lets the ginger shot through.
 */
function isDerivedCompound(shorter: string, longer: string): boolean {
  const remainder = longer.slice(shorter.length);
  const candidates = [remainder, remainder.replace(/^[es]/, "")];
  return candidates.some((candidate) =>
    DERIVED_COMPOUND_TAILS.some((tail) => candidate === tail || candidate.endsWith(tail)),
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
  if (shorter.length >= 4 && longer.startsWith(shorter) && !isDerivedCompound(shorter, longer)) return true;

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

/**
 * True when one of the offer's alternatives names the same product as the
 * ingredient line.
 *
 * Each alternative is judged as a whole before its tokens are compared: an
 * alternative naming a processed form ("chili saucer") is not the ingredient
 * however well its individual words line up.
 */
function ingredientMatchesOfferName(ingredientTokens: string[], ingredientName: string, offerName: string): boolean {
  if (ingredientTokens.length === 0) return false;

  return splitOfferAlternatives(offerName).some((whole) => {
    const alternative = stripFlavourClause(whole);
    const offerTokens = productTokens(alternative);
    if (namesProcessedForm(offerTokens, ingredientTokens)) return false;

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
