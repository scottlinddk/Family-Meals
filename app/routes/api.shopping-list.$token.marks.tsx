import type { Route } from "./+types/api.shopping-list.$token.marks";
import { shoppingListShareRepository } from "~/data/repositories/shoppingListShareRepository";
import { shoppingListMarkRepository } from "~/data/repositories/shoppingListMarkRepository";
import { parseItemStatus } from "~/domain/planning/shoppingListMarks";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

const NOT_FOUND = () =>
  new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders });

/** GET: the marks on the shared week, for the holder of the link. */
export async function loader({ params }: Route.LoaderArgs) {
  try {
    const share = await shoppingListShareRepository.getActiveByToken(params.token!);
    if (!share) return NOT_FOUND();

    const marks = await shoppingListMarkRepository.listMarks(share.familyId, share.weekStartDate);
    return new Response(JSON.stringify({ marks }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shared shopping list marks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, { status: SCHEMA_OUT_OF_DATE_STATUS, headers: jsonHeaders });
  }
}

/**
 * POST `{ label, status }` marks a line from the shared link.
 *
 * Link holders can mark, deliberately: the link exists to be sent to whoever
 * is actually in the shop, and a list they could only read would leave the
 * family's marks wrong for everyone else. Both marks are theirs to make — the
 * person in the aisle is as likely to be told "we've got some of that at
 * home" as to put it in the trolley. It's the *only* thing they can write —
 * the marks the family already shares, on one week — and `markedByUserId` is
 * left null because there's no account behind it.
 *
 * Clearing the whole list is not offered here: emptying someone else's list is
 * a bigger action than the link is meant to carry, and it's the one action
 * that can't be undone by looking at the shelf.
 */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const share = await shoppingListShareRepository.getActiveByToken(params.token!);
    if (!share) return NOT_FOUND();

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : "";
    const status = parseItemStatus(body.status);
    if (!label || status === undefined) {
      return new Response(JSON.stringify({ error: "label and a valid status are required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const marks = await shoppingListMarkRepository.setMark(
      share.familyId,
      share.weekStartDate,
      label,
      status,
      null,
    );
    return new Response(JSON.stringify({ marks }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shared shopping list marks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, { status: SCHEMA_OUT_OF_DATE_STATUS, headers: jsonHeaders });
  }
}
