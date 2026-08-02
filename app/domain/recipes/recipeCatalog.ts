import type { BaseRecipe, Ingredient, Substitution } from "~/domain/types";

/**
 * Authored content: for each base recipe, a template describing how to
 * derive the adult (calorie-minimized) and child (calorie-dense-addition)
 * variants. These are hand-written per recipe because the "right"
 * substitution/addition depends on the dish — variantDerivation.ts applies
 * them mechanically, it doesn't invent them.
 */
export interface RecipeVariantTemplate {
  adultSubstitutions: Substitution[];
  adultPortioningNotes: string[];
  childAdditions: Ingredient[];
  childTextureNotes: string[];
  childSaltSugarNotes: string[];
}

export interface CatalogEntry {
  recipe: BaseRecipe;
  template: RecipeVariantTemplate;
}

const defaultChildSaltSugarNotes = [
  "No added salt or sugar in the child's portion.",
  "Season the adult portions after plating the child's portion, not in the shared pot.",
];

export const RECIPE_CATALOG: CatalogEntry[] = [
  {
    recipe: {
      id: "beef-mince-veg-sauce",
      title: "Hakket oksekød i grøntsagssauce (beef mince & vegetable sauce)",
      proteinType: "beef",
      tags: ["one-pot", "pasta-side"],
      ingredients: [
        { name: "Hakket oksekød", quantity: 400, unit: "g" },
        { name: "Løg", quantity: 1, unit: "stk" },
        { name: "Hvidløg", quantity: 2, unit: "fed" },
        { name: "Flåede tomater", quantity: 400, unit: "g" },
        { name: "Gulerødder", quantity: 200, unit: "g" },
        { name: "Fuldkornspasta", quantity: 300, unit: "g" },
      ],
      instructions: [
        "Finhak løg, hvidløg og gulerødder.",
        "Brun oksekødet, tilsæt grøntsagerne og sauter 5 min.",
        "Tilsæt flåede tomater, lad simre 15-20 min.",
        "Kog pasta efter anvisning og server.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Hakket oksekød",
          substituteIngredient: "5% fedt hakket oksekød (i stedet for 10-15%)",
          reason: "Lower-fat cut cuts calories without reducing protein or portion volume.",
        },
      ],
      adultPortioningNotes: [
        "Bulk the adult plate with extra grated carrot/courgette stirred into the sauce instead of extra pasta.",
        "Serve adults a smaller pasta portion (80g dry) with a larger sauce-to-pasta ratio.",
      ],
      childAdditions: [
        { name: "Revet cheddar", quantity: 15, unit: "g" },
        { name: "Olivenolie", quantity: 1, unit: "tsk" },
      ],
      childTextureNotes: [
        "Chop or mash to a soft, easily-gummed texture appropriate for a 2.5-year-old.",
        "Cut pasta pieces short to reduce choking risk.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "chicken-traybake",
      title: "Ovnbagt kylling med rodfrugter (chicken & root vegetable traybake)",
      proteinType: "chicken",
      tags: ["oven", "one-tray"],
      ingredients: [
        { name: "Kyllingelår uden ben", quantity: 500, unit: "g" },
        { name: "Kartofler", quantity: 500, unit: "g" },
        { name: "Gulerødder", quantity: 300, unit: "g" },
        { name: "Rødløg", quantity: 2, unit: "stk" },
        { name: "Olivenolie", quantity: 2, unit: "spsk" },
        { name: "Timian", quantity: 1, unit: "tsk" },
      ],
      instructions: [
        "Skær kartofler, gulerødder og løg i tern.",
        "Vend grøntsager og kylling med olie og timian på en bageplade.",
        "Bag ved 200°C i 30-35 min til kyllingen er gennemstegt.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Kyllingelår uden ben",
          substituteIngredient: "Kyllingebryst (leaner cut)",
          reason: "Chicken breast has less fat per gram than thigh for the same protein.",
        },
        {
          originalIngredient: "Olivenolie (2 spsk)",
          substituteIngredient: "Olivenolie (1 spsk) + ekstra grøntsager",
          reason: "Reduce added oil, replace bulk with more root vegetables.",
        },
      ],
      adultPortioningNotes: ["Increase the vegetable-to-potato ratio on the adult plate."],
      childAdditions: [
        { name: "Smør", quantity: 1, unit: "tsk" },
        { name: "Avocado", quantity: 30, unit: "g" },
      ],
      childTextureNotes: [
        "Shred or finely dice the chicken; mash potato/carrot to a soft consistency.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "pork-apple-skillet",
      title: "Svinemørbrad med æble og kål (pork tenderloin, apple & cabbage)",
      proteinType: "pork",
      tags: ["skillet"],
      ingredients: [
        { name: "Svinemørbrad", quantity: 400, unit: "g" },
        { name: "Æble", quantity: 2, unit: "stk" },
        { name: "Hvidkål", quantity: 300, unit: "g" },
        { name: "Løg", quantity: 1, unit: "stk" },
        { name: "Smør", quantity: 1, unit: "spsk" },
        { name: "Kartofler", quantity: 400, unit: "g" },
      ],
      instructions: [
        "Skær mørbrad i skiver, brun i smør, tag ud.",
        "Sauter løg, kål og æble i samme pande.",
        "Læg kødet tilbage, lad simre 10 min.",
        "Server med kogte kartofler.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Smør (1 spsk)",
          substituteIngredient: "1 tsk smør + bredpandestegning med lidt vand/bouillon",
          reason: "Reduce added fat while keeping the pan sauce.",
        },
      ],
      adultPortioningNotes: ["Reduce potato portion slightly, add extra cabbage."],
      childAdditions: [
        { name: "Cremefraiche 38%", quantity: 1, unit: "spsk" },
      ],
      childTextureNotes: ["Dice pork finely; ensure apple is cooked soft, not raw/crisp."],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "salmon-veg",
      title: "Ovnbagt laks med dampede grøntsager (baked salmon & steamed vegetables)",
      proteinType: "fish",
      tags: ["oven", "fish"],
      ingredients: [
        { name: "Laksefilet", quantity: 500, unit: "g" },
        { name: "Broccoli", quantity: 300, unit: "g" },
        { name: "Ris", quantity: 250, unit: "g" },
        { name: "Citron", quantity: 1, unit: "stk" },
        { name: "Olivenolie", quantity: 1, unit: "spsk" },
      ],
      instructions: [
        "Bag laks ved 200°C i 12-15 min med citron.",
        "Damp broccoli 5-6 min.",
        "Kog ris efter anvisning.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Ris (portion)",
          substituteIngredient: "Mindre ris + mere broccoli",
          reason: "Shift carb-heavy volume toward vegetables to reduce calorie density.",
        },
      ],
      adultPortioningNotes: ["Keep salmon portion full-size — it's the protein, not the cut to reduce."],
      childAdditions: [
        { name: "Olivenolie", quantity: 1, unit: "tsk" },
        { name: "Revet ost", quantity: 15, unit: "g" },
      ],
      childTextureNotes: [
        "Flake salmon carefully and check thoroughly for bones before serving.",
        "Mash or finely chop broccoli florets.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "veggie-lentil-stew",
      title: "Linsegryde med grøntsager (vegetable & lentil stew)",
      proteinType: "vegetarian",
      tags: ["one-pot", "vegetarian"],
      ingredients: [
        { name: "Røde linser", quantity: 250, unit: "g" },
        { name: "Gulerødder", quantity: 200, unit: "g" },
        { name: "Squash", quantity: 200, unit: "g" },
        { name: "Løg", quantity: 1, unit: "stk" },
        { name: "Flåede tomater", quantity: 400, unit: "g" },
        { name: "Grøntsagsbouillon", quantity: 500, unit: "ml" },
      ],
      instructions: [
        "Sauter løg og gulerødder.",
        "Tilsæt linser, tomater og bouillon, kog 20 min.",
        "Tilsæt squash og kog yderligere 8-10 min.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [],
      adultPortioningNotes: [
        "Naturally lower-calorie dish; keep the adult portion full-size — no cuts needed here beyond normal serving size.",
      ],
      childAdditions: [
        { name: "Olivenolie", quantity: 1, unit: "spsk" },
        { name: "Cremefraiche 38%", quantity: 1, unit: "spsk" },
      ],
      childTextureNotes: ["Mash to a soft, spoonable consistency."],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "chicken-veg-stirfry",
      title: "Kylling-grøntsagswok (chicken & vegetable stir-fry)",
      proteinType: "chicken",
      tags: ["wok", "quick"],
      ingredients: [
        { name: "Kyllingebryst", quantity: 400, unit: "g" },
        { name: "Broccoli", quantity: 200, unit: "g" },
        { name: "Peberfrugt", quantity: 2, unit: "stk" },
        { name: "Gulerødder", quantity: 150, unit: "g" },
        { name: "Sojasovs (lavt natrium)", quantity: 2, unit: "spsk" },
        { name: "Ris", quantity: 250, unit: "g" },
      ],
      instructions: [
        "Skær kylling og grøntsager i strimler.",
        "Wok kylling til gennemstegt, tag ud.",
        "Wok grøntsager sprødt, bland med kylling og sojasovs.",
        "Server med ris.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Ris (portion)",
          substituteIngredient: "Mindre ris, mere wok-grøntsager",
          reason: "Reduce carb-heavy volume, add vegetable bulk instead.",
        },
      ],
      adultPortioningNotes: [],
      childAdditions: [
        { name: "Sesamolie", quantity: 1, unit: "tsk" },
        { name: "Avocado", quantity: 30, unit: "g" },
      ],
      childTextureNotes: [
        "Cut vegetables and chicken into small, soft pieces; avoid large raw-crisp pepper chunks.",
        "Use a low-sodium soy sauce and go very light — high-sodium sauces aren't appropriate for toddlers.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "fish-cakes-veg",
      title: "Fiskefrikadeller med grøntsager (fish cakes & vegetables)",
      proteinType: "fish",
      tags: ["pan-fried"],
      ingredients: [
        { name: "Torskefilet", quantity: 400, unit: "g" },
        { name: "Æg", quantity: 1, unit: "stk" },
        { name: "Havregryn", quantity: 50, unit: "g" },
        { name: "Persille", quantity: 1, unit: "bundt" },
        { name: "Kartofler", quantity: 400, unit: "g" },
        { name: "Ærter", quantity: 200, unit: "g" },
      ],
      instructions: [
        "Blend fisk, æg, havregryn og persille til en jævn masse.",
        "Form frikadeller og steg gyldne på panden.",
        "Server med kogte kartofler og ærter.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Stegning i olie",
          substituteIngredient: "Steg i minimal olie / non-stick pande",
          reason: "Reduce added fat from pan-frying.",
        },
      ],
      adultPortioningNotes: ["Slightly smaller potato portion, extra peas."],
      childAdditions: [
        { name: "Smør", quantity: 1, unit: "tsk" },
      ],
      childTextureNotes: [
        "Mash fish cakes and check carefully for any bones before serving.",
        "Mash peas to reduce choking risk.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "beef-veg-soup",
      title: "Oksekødssuppe med rodfrugter (beef & root vegetable soup)",
      proteinType: "beef",
      tags: ["soup", "one-pot"],
      ingredients: [
        { name: "Oksekød i tern", quantity: 400, unit: "g" },
        { name: "Gulerødder", quantity: 250, unit: "g" },
        { name: "Persillerod", quantity: 150, unit: "g" },
        { name: "Kartofler", quantity: 300, unit: "g" },
        { name: "Oksebouillon", quantity: 1000, unit: "ml" },
      ],
      instructions: [
        "Brun oksekødet, tilsæt bouillon og simre 1 time.",
        "Tilsæt rodfrugter og kartofler, kog yderligere 25-30 min.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [],
      adultPortioningNotes: ["Naturally balanced and filling; serve a normal-size bowl, add extra vegetables if desired."],
      childAdditions: [
        { name: "Cremefraiche 38%", quantity: 1, unit: "spsk" },
        { name: "Smør", quantity: 1, unit: "tsk" },
      ],
      childTextureNotes: ["Mash or finely chop the vegetables and meat pieces before serving."],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "veggie-frittata",
      title: "Grøntsagsfrittata (vegetable frittata)",
      proteinType: "vegetarian",
      tags: ["oven", "vegetarian", "egg"],
      ingredients: [
        { name: "Æg", quantity: 8, unit: "stk" },
        { name: "Spinat", quantity: 150, unit: "g" },
        { name: "Peberfrugt", quantity: 1, unit: "stk" },
        { name: "Feta", quantity: 100, unit: "g" },
        { name: "Kartofler", quantity: 300, unit: "g" },
      ],
      instructions: [
        "Kog kartofler i tern, sauter med peberfrugt og spinat.",
        "Pisk æg, hæld over grøntsagerne i en ovnfast pande.",
        "Drys med feta, bag ved 180°C i 15-18 min.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [
        {
          originalIngredient: "Feta (100g)",
          substituteIngredient: "Feta (60g), mere spinat",
          reason: "Trim the higher-fat cheese slightly, replace bulk with extra greens.",
        },
      ],
      adultPortioningNotes: [],
      childAdditions: [
        { name: "Revet cheddar", quantity: 15, unit: "g" },
        { name: "Avocado", quantity: 30, unit: "g" },
      ],
      childTextureNotes: ["Cut into small, soft wedges; ensure eggs are fully cooked through."],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
  {
    recipe: {
      id: "pork-veg-skewers",
      title: "Svinekødsspyd med grøntsager og bulgur (pork skewers, vegetables & bulgur)",
      proteinType: "pork",
      tags: ["oven", "skewers"],
      ingredients: [
        { name: "Svinefilet", quantity: 400, unit: "g" },
        { name: "Zucchini", quantity: 200, unit: "g" },
        { name: "Peberfrugt", quantity: 2, unit: "stk" },
        { name: "Bulgur", quantity: 250, unit: "g" },
        { name: "Olivenolie", quantity: 1, unit: "spsk" },
      ],
      instructions: [
        "Skær kød og grøntsager i tern, sæt på spyd.",
        "Pensl med lidt olivenolie, bag/grill 15-18 min.",
        "Kog bulgur efter anvisning og server til.",
      ],
      dinnerTimeLocal: "18:00",
    },
    template: {
      adultSubstitutions: [],
      adultPortioningNotes: ["Slightly smaller bulgur portion, extra grilled vegetables."],
      childAdditions: [
        { name: "Olivenolie", quantity: 1, unit: "tsk" },
        { name: "Cremefraiche 38%", quantity: 1, unit: "spsk" },
      ],
      childTextureNotes: [
        "Remove from skewers and dice small before serving — never serve skewered food on the stick to a toddler.",
      ],
      childSaltSugarNotes: defaultChildSaltSugarNotes,
    },
  },
];

export function getRecipeById(id: string): CatalogEntry | undefined {
  return RECIPE_CATALOG.find((entry) => entry.recipe.id === id);
}
