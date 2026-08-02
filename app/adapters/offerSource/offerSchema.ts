import { z } from "zod";

/**
 * Validates data entered/pasted through the manual weekly-offer form against
 * the reference schema the user supplied (sample REMA 1000 offer JSON).
 */
export const offerSchema = z.object({
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
