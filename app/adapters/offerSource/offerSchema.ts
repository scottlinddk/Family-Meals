import { z } from "zod";
import { STORE_IDS } from "~/domain/types";

/**
 * Validates data entered/pasted through the manual weekly-offer form against
 * the reference schema the user supplied (sample REMA 1000 offer JSON).
 *
 * `storeId` is required with no default — a manual paste that omitted it
 * would otherwise have to guess which store the pasted catalog is for, and a
 * silent guess of "rema1000" would misfile a Netto/Føtex/Meny paste. Only the
 * auto-fetch source (`EtilbudsavisOfferSource`), which knows its own store,
 * is allowed to stamp the field itself before validation.
 */
export const offerSchema = z.object({
  storeId: z.enum(STORE_IDS),
  memberOnly: z.boolean().default(false),
  name: z.string().min(1),
  unitSizeFrom: z.number().positive(),
  unitSizeTo: z.number().positive(),
  unitSymbol: z.string().min(1),
  price: z.number().nonnegative(),
  currencyCode: z.literal("DKK"),
  unitPrice: z.number().nonnegative(),
  baseUnit: z.string().min(1),
  departmentSlug: z.string().min(1),
  // Accept any parseable timestamp string (the reference sample uses
  // "+0000"-style offsets without a colon, which z.string().datetime()
  // rejects) rather than enforcing strict RFC3339.
  validFrom: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "validFrom must be a parseable date string",
  }),
  validUntil: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "validUntil must be a parseable date string",
  }),
});

export const offerListSchema = z.array(offerSchema);

export type OfferInput = z.infer<typeof offerSchema>;
