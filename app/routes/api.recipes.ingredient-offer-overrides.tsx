import type { Route } from "./+types/api.recipes.ingredient-offer-overrides";
import { requireFamilyMembership } from "~/lib/auth";
import { ingredientOfferOverrideRepository } from "~/data/repositories/ingredientOfferOverrideRepository";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * Which ingredient↔offer matches this family has flagged as wrong (see
 * `ingredientOfferOverrides` in the schema). `api.recipes.suggestions.tsx`
 * reads these to drop the flagged pairs before ranking; this route is only
 * for writing a flag or clearing one.
 *
 * POST `{ ingredientLabel, offerName }` flags a pairing; DELETE with the same
 * body clears it.
 */
export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  if (request.method !== "POST" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
  }

  const body = await request.json().catch(() => ({}));
  const ingredientLabel = typeof body.ingredientLabel === "string" ? body.ingredientLabel : "";
  const offerName = typeof body.offerName === "string" ? body.offerName : "";
  if (!ingredientLabel || !offerName) {
    return new Response(JSON.stringify({ error: "ingredientLabel and offerName are required" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    if (request.method === "POST") {
      await ingredientOfferOverrideRepository.exclude(family.id, ingredientLabel, offerName, userId);
    } else {
      await ingredientOfferOverrideRepository.unexclude(family.id, ingredientLabel, offerName);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Ingredient/offer overrides hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
