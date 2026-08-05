import { OfferJsonPasteForm } from "~/ui/components/OfferJsonPasteForm";
import { RecipeSuggestions } from "~/ui/components/RecipeSuggestions";
import { t } from "~/i18n/t";

export default function OffersPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl">{t("offers.pageTitle")}</h1>
      <OfferJsonPasteForm />
      <RecipeSuggestions />
    </>
  );
}
