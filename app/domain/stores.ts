import type { StoreId } from "~/domain/types";

/** Human-readable store names, shared by the fetch adapter's error messages and the UI. */
export const STORE_NAMES: Record<StoreId, string> = {
  rema1000: "REMA 1000",
  netto: "Netto",
  foetex: "Føtex",
  meny: "Meny",
};
