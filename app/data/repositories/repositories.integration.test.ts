import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OfferInput } from "~/adapters/offerSource/offerSchema";
import type { WeekPlan } from "~/domain/types";

/**
 * Integration coverage for the repository layer against a real Postgres.
 *
 * Deliberately gated on `TEST_DATABASE_URL` rather than `DATABASE_URL`: these
 * tests write rows, and `DATABASE_URL` is the variable that points at the
 * family's actual Supabase database. Skipped entirely when unset, so
 * `npm test` stays a pure unit run.
 *
 *   createdb familymeals_test
 *   psql ... -f app/data/db/migrations/*.sql   # or npm run db:migrate
 *   TEST_DATABASE_URL=postgres://... npm test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const DAY_MS = 86_400_000;

function offer(name: string, fromDays: number, toDays: number, storeId = "rema1000"): OfferInput {
  return {
    storeId,
    memberOnly: false,
    name,
    unitSizeFrom: 400,
    unitSizeTo: 400,
    unitSymbol: "g",
    price: 30,
    currencyCode: "DKK",
    unitPrice: 75,
    baseUnit: "kilogram",
    departmentSlug: "meat-and-fish",
    validFrom: new Date(Date.now() + fromDays * DAY_MS).toISOString(),
    validUntil: new Date(Date.now() + toDays * DAY_MS).toISOString(),
  } as OfferInput;
}

function weekPlanFixture(
  familyId: string,
  weekStartDate: string,
  offerSnapshotId: string | null,
  recipeId: string,
  sequence = 0,
): WeekPlan {
  const now = new Date().toISOString();
  return {
    familyId,
    weekStartDate,
    days: [
      {
        date: weekStartDate,
        mealSlot: "dinner",
        baseRecipeId: recipeId,
        recipeSnapshot: {
          title: recipeId,
          source: "external",
          tags: [],
          ingredientLines: [],
          instructionLines: [],
        },
        adultVariant: { baseRecipeId: recipeId, substitutions: [], portioningNotes: [], curated: false },
        childVariant: {
          baseRecipeId: recipeId,
          additions: [],
          textureNotes: [],
          saltSugarNotes: [],
          curated: false,
        },
        isManualOverride: false,
        editedAt: now,
        sequence,
      },
    ],
    generatedFrom: { offerSnapshotId, generatorVersion: "test" },
    createdAt: now,
    updatedAt: now,
  };
}

describe.skipIf(!TEST_DATABASE_URL)("repositories against Postgres", () => {
  let offerRepository: typeof import("~/data/repositories/offerRepository")["offerRepository"];
  let weekPlanRepository: typeof import("~/data/repositories/weekPlanRepository")["weekPlanRepository"];
  let userPreferenceRepository: typeof import("~/data/repositories/userPreferenceRepository")["userPreferenceRepository"];
  let familyStoreSettingsRepository: typeof import("~/data/repositories/familyStoreSettingsRepository")["familyStoreSettingsRepository"];
  let shoppingListMarkRepository: typeof import("~/data/repositories/shoppingListMarkRepository")["shoppingListMarkRepository"];
  let shoppingListShareRepository: typeof import("~/data/repositories/shoppingListShareRepository")["shoppingListShareRepository"];
  let db: typeof import("~/data/db/client")["db"];
  let families: typeof import("~/data/db/schema")["families"];
  let userPreferences: typeof import("~/data/db/schema")["userPreferences"];
  let eq: typeof import("drizzle-orm")["eq"];

  let familyA = "";
  let familyB = "";
  const preferenceUserId = crypto.randomUUID();

  beforeAll(async () => {
    // Imported dynamically so the db client picks up the test URL — it reads
    // DATABASE_URL once, at module load.
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    ({ offerRepository } = await import("~/data/repositories/offerRepository"));
    ({ weekPlanRepository } = await import("~/data/repositories/weekPlanRepository"));
    ({ userPreferenceRepository } = await import("~/data/repositories/userPreferenceRepository"));
    ({ familyStoreSettingsRepository } = await import(
      "~/data/repositories/familyStoreSettingsRepository"
    ));
    ({ shoppingListMarkRepository } = await import(
      "~/data/repositories/shoppingListMarkRepository"
    ));
    ({ shoppingListShareRepository } = await import(
      "~/data/repositories/shoppingListShareRepository"
    ));
    ({ db } = await import("~/data/db/client"));
    ({ families, userPreferences } = await import("~/data/db/schema"));
    ({ eq } = await import("drizzle-orm"));

    const rows = await db
      .insert(families)
      .values([
        { ownerUserId: crypto.randomUUID(), name: "Test A", calendarToken: crypto.randomUUID() },
        { ownerUserId: crypto.randomUUID(), name: "Test B", calendarToken: crypto.randomUUID() },
      ])
      .returning();
    familyA = rows[0]!.id;
    familyB = rows[1]!.id;
  });

  afterAll(async () => {
    for (const id of [familyA, familyB]) {
      if (id) await db.delete(families).where(eq(families.id, id));
    }
    await db.delete(userPreferences).where(eq(userPreferences.userId, preferenceUserId));
  });

  it("scopes an offer import to the importing family and hides expired offers", async () => {
    const snapshotA = await offerRepository.replaceCurrentOffers(
      familyA,
      "rema1000",
      [offer("Hakket oksekød", -2, 4), offer("Broccoli", -9, -2)],
      "manual",
    );
    await offerRepository.replaceCurrentOffers(familyB, "rema1000", [offer("Laks", -1, 5)], "etilbudsavis");

    // Family B importing must not disturb family A's set.
    expect((await offerRepository.listCurrentOffers(familyA, ["rema1000"])).map((o) => o.name)).toEqual([
      "Hakket oksekød",
    ]);
    expect((await offerRepository.listCurrentOffers(familyB, ["rema1000"])).map((o) => o.name)).toEqual([
      "Laks",
    ]);

    // The expired offer is still part of the import, just not "current".
    expect((await offerRepository.listOffersInSnapshot(snapshotA.id)).length).toBe(2);

    const latest = await offerRepository.getLatestSnapshot(familyA, "rema1000");
    expect(latest?.id).toBe(snapshotA.id);
    expect(latest?.offerCount).toBe(2);
    expect(latest?.source).toBe("manual");
  });

  it("keeps a store's refresh from disturbing another store's still-current snapshot", async () => {
    const remaSnapshot = await offerRepository.replaceCurrentOffers(
      familyA,
      "rema1000",
      [offer("Rema-vare", -1, 5, "rema1000")],
      "manual",
    );
    await offerRepository.replaceCurrentOffers(familyA, "netto", [offer("Netto-vare", -1, 5, "netto")], "manual");

    // Refreshing Netto again must not touch REMA's latest snapshot.
    await offerRepository.replaceCurrentOffers(
      familyA,
      "netto",
      [offer("Netto-vare-2", -1, 5, "netto")],
      "etilbudsavis",
    );

    expect(await offerRepository.getLatestSnapshot(familyA, "rema1000")).toEqual(remaSnapshot);
    expect((await offerRepository.listCurrentOffers(familyA, ["netto"])).map((o) => o.name)).toEqual([
      "Netto-vare-2",
    ]);
    expect((await offerRepository.listCurrentOffers(familyA, ["rema1000", "netto"])).map((o) => o.name).sort()).toEqual(
      ["Netto-vare-2", "Rema-vare"],
    );
  });

  it("returns offers whose validity overlaps the requested window", async () => {
    const during = await offerRepository.listOffersValidDuring(
      familyA,
      new Date(Date.now() + 2 * DAY_MS),
      new Date(Date.now() + 3 * DAY_MS),
      ["rema1000"],
    );
    expect(during.map((o) => o.name)).toEqual(["Rema-vare"]);

    const beyondValidity = await offerRepository.listOffersValidDuring(
      familyA,
      new Date(Date.now() + 30 * DAY_MS),
      new Date(Date.now() + 31 * DAY_MS),
      ["rema1000"],
    );
    expect(beyondValidity).toEqual([]);
  });

  it("defaults a family's store settings, then upserts the same row on every change", async () => {
    expect(await familyStoreSettingsRepository.get(familyA)).toEqual({
      selectedStores: ["rema1000", "netto", "foetex", "meny"],
      memberStores: [],
    });

    await familyStoreSettingsRepository.set(familyA, {
      selectedStores: ["rema1000", "netto"],
      memberStores: ["netto"],
    });
    expect(await familyStoreSettingsRepository.get(familyA)).toEqual({
      selectedStores: ["rema1000", "netto"],
      memberStores: ["netto"],
    });

    await familyStoreSettingsRepository.set(familyA, { selectedStores: ["rema1000"], memberStores: [] });
    expect(await familyStoreSettingsRepository.get(familyA)).toEqual({
      selectedStores: ["rema1000"],
      memberStores: [],
    });
  });

  it("upserts a week in place and reports recipes from other recent weeks", async () => {
    const snapshot = await offerRepository.getLatestSnapshot(familyB, "rema1000");

    await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyB, "2026-07-27", snapshot!.id, "recipe-old", 2));
    await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyB, "2026-08-03", snapshot!.id, "recipe-new", 0));
    // The value saveWeekPlan hands back must itself be the just-written state
    // — a regenerate that returns what it wrote a moment behind is exactly
    // as broken as one that errors, just silently ("Genskab hele ugen").
    const saved = await weekPlanRepository.saveWeekPlan(
      weekPlanFixture(familyB, "2026-08-03", snapshot!.id, "recipe-new-2", 1),
    );
    expect(saved.days).toHaveLength(1);
    expect(saved.days[0]!.baseRecipeId).toBe("recipe-new-2");
    expect(saved.days[0]!.sequence).toBe(1);

    const reread = await weekPlanRepository.getWeekPlan(familyB, "2026-08-03");
    expect(reread?.days).toHaveLength(1);
    expect(reread?.days[0]!.baseRecipeId).toBe("recipe-new-2");
    expect(reread?.days[0]!.sequence).toBe(1);
    expect(reread?.generatedFrom.offerSnapshotId).toBe(snapshot!.id);

    expect(await weekPlanRepository.listRecentRecipeIds(familyB, "2026-08-03")).toEqual(["recipe-old"]);
  });

  it("stores a null offer snapshot id for a plan generated without offers", async () => {
    const saved = await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyA, "2026-09-07", null, "r"));
    expect(saved.generatedFrom.offerSnapshotId).toBeNull();
  });

  it("defaults a user's preferences, then upserts the same row on every change", async () => {
    // No row yet — a user who has never changed anything still gets an answer.
    expect(await userPreferenceRepository.get(preferenceUserId)).toEqual({ cookViewMode: "steps" });

    await userPreferenceRepository.setCookViewMode(preferenceUserId, "all");
    expect(await userPreferenceRepository.get(preferenceUserId)).toEqual({ cookViewMode: "all" });

    await userPreferenceRepository.setCookViewMode(preferenceUserId, "steps");
    expect(await userPreferenceRepository.get(preferenceUserId)).toEqual({ cookViewMode: "steps" });

    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, preferenceUserId));
    expect(rows).toHaveLength(1);
  });

  it("shares shopping-list marks within a family and keeps them off other families", async () => {
    const week = "2026-09-14";
    const shopper = crypto.randomUUID();
    const partner = crypto.randomUUID();
    const sorted = async (familyId: string) =>
      (await shoppingListMarkRepository.listMarks(familyId, week)).sort((a, b) =>
        a.label.localeCompare(b.label),
      );

    expect(await sorted(familyA)).toEqual([]);

    // One member ticks; the whole family's marks come back, so the other
    // member's phone sees it on its next poll.
    const afterFirst = await shoppingListMarkRepository.setMark(familyA, week, "2 løg", "checked", shopper);
    expect(afterFirst).toEqual([{ label: "2 løg", status: "checked" }]);

    // The same line marked again by someone else is the same row, not a second one.
    const afterSecond = await shoppingListMarkRepository.setMark(familyA, week, "2 løg", "checked", partner);
    expect(afterSecond).toEqual([{ label: "2 løg", status: "checked" }]);

    // Another family shopping the same ingredient in the same week is untouched.
    expect(await sorted(familyB)).toEqual([]);

    // Someone at home says there's already flour in the cupboard — the same
    // row, moved from the trolley to at-home in one write.
    await shoppingListMarkRepository.setMark(familyA, week, "1 kg mel", "checked", shopper);
    await shoppingListMarkRepository.setMark(familyA, week, "1 kg mel", "at_home", partner);
    expect(await sorted(familyA)).toEqual([
      { label: "1 kg mel", status: "at_home" },
      { label: "2 løg", status: "checked" },
    ]);

    // A null status is an unmark, not a third state.
    await shoppingListMarkRepository.setMark(familyA, week, "2 løg", null, shopper);
    expect(await sorted(familyA)).toEqual([{ label: "1 kg mel", status: "at_home" }]);

    // Clearing only reaches the lines the caller could see — and takes the
    // at-home marks with it, since "start over" means all of it.
    await shoppingListMarkRepository.setMark(familyA, week, "salt og peber", "checked", shopper);
    await shoppingListMarkRepository.clear(familyA, week, ["1 kg mel"]);
    expect(await sorted(familyA)).toEqual([{ label: "salt og peber", status: "checked" }]);

    await shoppingListMarkRepository.clear(familyA, week);
    expect(await sorted(familyA)).toEqual([]);
  });

  it("reuses a week's share link until it's revoked, and never revives a revoked token", async () => {
    const week = "2026-09-21";
    const creator = crypto.randomUUID();

    const first = await shoppingListShareRepository.getOrCreate(familyA, week, creator);
    const again = await shoppingListShareRepository.getOrCreate(familyA, week, creator);
    // Pressing "share" twice must not kill the link already sent to someone.
    expect(again.token).toBe(first.token);

    expect((await shoppingListShareRepository.getActiveByToken(first.token))?.familyId).toBe(familyA);

    await shoppingListShareRepository.revokeAll(familyA, week);
    expect(await shoppingListShareRepository.getActiveByToken(first.token)).toBeUndefined();
    expect(await shoppingListShareRepository.getActive(familyA, week)).toBeUndefined();

    // A new link is a genuinely new token — the revoked one stays dead.
    const reissued = await shoppingListShareRepository.getOrCreate(familyA, week, creator);
    expect(reissued.token).not.toBe(first.token);
    expect(await shoppingListShareRepository.getActiveByToken(first.token)).toBeUndefined();
  });
});
