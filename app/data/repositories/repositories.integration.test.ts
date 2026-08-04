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

function offer(name: string, fromDays: number, toDays: number): OfferInput {
  return {
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
  let db: typeof import("~/data/db/client")["db"];
  let families: typeof import("~/data/db/schema")["families"];
  let eq: typeof import("drizzle-orm")["eq"];

  let familyA = "";
  let familyB = "";

  beforeAll(async () => {
    // Imported dynamically so the db client picks up the test URL — it reads
    // DATABASE_URL once, at module load.
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    ({ offerRepository } = await import("~/data/repositories/offerRepository"));
    ({ weekPlanRepository } = await import("~/data/repositories/weekPlanRepository"));
    ({ db } = await import("~/data/db/client"));
    ({ families } = await import("~/data/db/schema"));
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
  });

  it("scopes an offer import to the importing family and hides expired offers", async () => {
    const snapshotA = await offerRepository.replaceCurrentOffers(
      familyA,
      [offer("Hakket oksekød", -2, 4), offer("Broccoli", -9, -2)],
      "manual",
    );
    await offerRepository.replaceCurrentOffers(familyB, [offer("Laks", -1, 5)], "etilbudsavis");

    // Family B importing must not disturb family A's set.
    expect((await offerRepository.listCurrentOffers(familyA)).map((o) => o.name)).toEqual([
      "Hakket oksekød",
    ]);
    expect((await offerRepository.listCurrentOffers(familyB)).map((o) => o.name)).toEqual(["Laks"]);

    // The expired offer is still part of the import, just not "current".
    expect((await offerRepository.listOffersInSnapshot(snapshotA.id)).length).toBe(2);

    const latest = await offerRepository.getLatestSnapshot(familyA);
    expect(latest?.id).toBe(snapshotA.id);
    expect(latest?.offerCount).toBe(2);
    expect(latest?.source).toBe("manual");
  });

  it("returns offers whose validity overlaps the requested window", async () => {
    const during = await offerRepository.listOffersValidDuring(
      familyA,
      new Date(Date.now() + 2 * DAY_MS),
      new Date(Date.now() + 3 * DAY_MS),
    );
    expect(during.map((o) => o.name)).toEqual(["Hakket oksekød"]);

    const beyondValidity = await offerRepository.listOffersValidDuring(
      familyA,
      new Date(Date.now() + 30 * DAY_MS),
      new Date(Date.now() + 31 * DAY_MS),
    );
    expect(beyondValidity).toEqual([]);
  });

  it("upserts a week in place and reports recipes from other recent weeks", async () => {
    const snapshot = await offerRepository.getLatestSnapshot(familyB);

    await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyB, "2026-07-27", snapshot!.id, "recipe-old", 2));
    await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyB, "2026-08-03", snapshot!.id, "recipe-new", 0));
    await weekPlanRepository.saveWeekPlan(weekPlanFixture(familyB, "2026-08-03", snapshot!.id, "recipe-new-2", 1));

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
});
