import { INFANT_NOTE } from "~/domain/infant/infantNote";

/** Static, non-personalized reminder — the only infant-related content in the app. */
export function InfantNote() {
  return (
    <aside className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">6-month-old</p>
      <p className="mt-1">{INFANT_NOTE.text}</p>
    </aside>
  );
}
