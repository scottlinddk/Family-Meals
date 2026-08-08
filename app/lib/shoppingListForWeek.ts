import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { familyStoreSettingsRepository } from "~/data/repositories/familyStoreSettingsRepository";
import { shoppingListExtraItemRepository } from "~/data/repositories/shoppingListExtraItemRepository";
import { offerIsUsable } from "~/domain/familyStoreSettings";
import { buildShoppingList, type ShoppingList } from "~/domain/planning/shoppingList";

/**
 * A family's shopping list for one week, or null when that week has no plan.
 *
 * Shared by the two routes that serve the same list to different callers —
 * the signed-in family member (`/api/weeks/:weekStart/shopping-list`) and
 * whoever holds the share link (`/api/shopping-list/:token`) — so the person
 * shopping from a link can never be looking at a differently-built list from
 * the person who sent it.
 *
 * Departments and "on offer" marks come from the offers valid now, not the
 * ones the plan was generated against: you shop with this week's prices.
 * Only the family's selected stores are fetched, and member-only offers are
 * dropped unless the family holds that store's membership — see
 * `offerIsUsable`.
 *
 * Also folds in whatever the family has added to this week's list by hand
 * (see `shoppingListExtraItems` in the schema) — an ingredient from a recipe
 * suggestion that isn't part of the plan, say. Still null when the week has
 * no plan at all: with no `WeekPlan` to build against there's nothing to
 * merge hand-added items into, so "list" and "week is planned" stay the same
 * question everywhere else in the app already treats them as.
 */
export async function shoppingListForWeek(
  familyId: string,
  weekStartDate: string,
): Promise<ShoppingList | null> {
  const week = await weekPlanRepository.getWeekPlan(familyId, weekStartDate);
  if (!week) return null;

  const [settings, extraLabels] = await Promise.all([
    familyStoreSettingsRepository.get(familyId),
    shoppingListExtraItemRepository.listLabels(familyId, weekStartDate),
  ]);
  const offers = await offerRepository.listCurrentOffers(familyId, settings.selectedStores);
  const usableOffers = offers.filter((offer) => offerIsUsable(offer, settings));
  return buildShoppingList(week, usableOffers, settings.selectedStores, extraLabels);
}
