import { STORE_IDS, type Offer, type StoreId } from "~/domain/types";

/** What a family has settled about which stores they shop at and hold membership at. */
export interface FamilyStoreSettings {
  /** Stores this family shops at — offers are only fetched/shown/matched for these. */
  selectedStores: StoreId[];
  /** Stores whose member-only ("plus") tier this family holds. */
  memberStores: StoreId[];
}

export const DEFAULT_FAMILY_STORE_SETTINGS: FamilyStoreSettings = {
  selectedStores: [...STORE_IDS],
  memberStores: [],
};

/** Stores that publish a member-only ("plus") tier at all, so the UI only offers that toggle where it means something. */
export const STORE_HAS_MEMBERSHIP_TIER: Record<StoreId, boolean> = {
  rema1000: false,
  netto: true,
  foetex: true,
  meny: false,
};

export function isStoreSelected(settings: FamilyStoreSettings, storeId: StoreId): boolean {
  return settings.selectedStores.includes(storeId);
}

export function hasStoreMembership(settings: FamilyStoreSettings, storeId: StoreId): boolean {
  return settings.memberStores.includes(storeId);
}

/**
 * Whether `offer` should actually be used — shown as usable, matched into the
 * shopping list, ranked against recipes — for a family with `settings`.
 *
 * A member-only offer at a store the family hasn't flagged membership for is
 * still fetched and displayed (marked "members only"), but excluded here so
 * it never silently ends up on a shopping list the family can't actually get
 * that price on.
 */
export function offerIsUsable(offer: Pick<Offer, "storeId" | "memberOnly">, settings: FamilyStoreSettings): boolean {
  if (!isStoreSelected(settings, offer.storeId)) return false;
  if (offer.memberOnly && !hasStoreMembership(settings, offer.storeId)) return false;
  return true;
}
