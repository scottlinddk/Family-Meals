import type { Route } from "./+types/api.family.store-settings";
import { requireFamily } from "~/lib/auth";
import { familyStoreSettingsRepository } from "~/data/repositories/familyStoreSettingsRepository";
import { DEFAULT_FAMILY_STORE_SETTINGS } from "~/domain/familyStoreSettings";
import { STORE_IDS, type StoreId } from "~/domain/types";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

function json(body: unknown, headers: Headers, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

function isStoreId(value: unknown): value is StoreId {
  return typeof value === "string" && (STORE_IDS as readonly string[]).includes(value);
}

function parseStoreIdArray(value: unknown): StoreId[] | null {
  if (!Array.isArray(value) || !value.every(isStoreId)) return null;
  return [...new Set(value)];
}

/** GET: the signed-in family's store selection and membership settings. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);

  try {
    return json(await familyStoreSettingsRepository.get(family.id), headers);
  } catch (error) {
    if (isMissingSchemaError(error)) return json(DEFAULT_FAMILY_STORE_SETTINGS, headers);
    throw error;
  }
}

/** PATCH { selectedStores, memberStores }: replace the family's store settings. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);

  const body = await request.json().catch(() => ({}));
  const selectedStores = parseStoreIdArray(body.selectedStores);
  const memberStores = parseStoreIdArray(body.memberStores);
  if (!selectedStores || !memberStores) {
    return json({ error: "invalid_store_settings" }, headers, 400);
  }

  try {
    return json(await familyStoreSettingsRepository.set(family.id, { selectedStores, memberStores }), headers);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return new Response(SCHEMA_OUT_OF_DATE_BODY, {
        status: SCHEMA_OUT_OF_DATE_STATUS,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw error;
  }
}
