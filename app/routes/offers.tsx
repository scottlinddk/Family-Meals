import { Link, redirect } from "react-router";
import type { Route } from "./+types/offers";
import { requireUser } from "~/lib/auth";
import { OfferJsonPasteForm } from "~/ui/components/OfferJsonPasteForm";
import { RecipeSuggestions } from "~/ui/components/RecipeSuggestions";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function OffersPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-sm text-accent hover:text-accent-700">
        {t("offers.backToPlan")}
      </Link>
      <h1 className="mt-3 mb-5 text-3xl">{t("offers.pageTitle")}</h1>
      <OfferJsonPasteForm />
      <RecipeSuggestions />
    </main>
  );
}
