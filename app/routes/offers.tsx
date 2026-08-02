import { Link, redirect } from "react-router";
import type { Route } from "./+types/offers";
import { requireUser } from "~/lib/auth";
import { OfferJsonPasteForm } from "~/ui/components/OfferJsonPasteForm";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function OffersPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-sm text-gray-500">
        ← Back to plan
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Weekly offers</h1>
      <OfferJsonPasteForm />
    </main>
  );
}
