import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
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
 */
export async function shoppingListForWeek(
  familyId: string,
  weekStartDate: string,
): Promise<ShoppingList | null> {
  const week = await weekPlanRepository.getWeekPlan(familyId, weekStartDate);
  if (!week) return null;

  const offers = await offerRepository.listCurrentOffers(familyId);
  return buildShoppingList(week, offers);
}
