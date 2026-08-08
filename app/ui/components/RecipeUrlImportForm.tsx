import { useState } from "react";
import { useImportRecipeFromUrl } from "~/ui/hooks/useExternalRecipes";
import { Card } from "~/ui/components/ui/Card";
import { Button } from "~/ui/components/ui/Button";
import { Input } from "~/ui/components/ui/Input";
import { Accordion } from "~/ui/components/ui/Accordion";
import { ThumbPhoto } from "~/ui/components/ui/Photo";
import { t } from "~/i18n/t";

/**
 * Paste-a-URL recipe import: fetches the page server-side and runs it
 * through the shared schema.org/Recipe extraction pipeline
 * (`fetchRecipeFromUrl`). Mirrors the `/offers` page's JSON-paste
 * accordion — an escape hatch alongside the curated/scraped catalog, not a
 * replacement for it.
 */
export function RecipeUrlImportForm() {
  const [url, setUrl] = useState("");
  const importRecipe = useImportRecipeFromUrl();

  function handleImport() {
    importRecipe.mutate(url.trim(), {
      onSuccess: () => setUrl(""),
    });
  }

  return (
    <Card as="section" className="mb-4">
      <Accordion title={t("recipeImport.formHeading")} defaultOpen={false}>
        <p className="-mt-1 text-sm text-muted">{t("recipeImport.formDescription")}</p>
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              importRecipe.reset();
              setUrl(e.target.value);
            }}
            placeholder={t("recipeImport.urlPlaceholder")}
            aria-label={t("recipeImport.urlPlaceholder")}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleImport}
            disabled={importRecipe.isPending || url.trim().length === 0}
          >
            {importRecipe.isPending ? t("recipeImport.importing") : t("recipeImport.import")}
          </Button>
        </div>
        {importRecipe.isError && (
          <p className="mt-2 text-sm text-red-700">
            {importRecipe.error instanceof Error ? importRecipe.error.message : t("recipeImport.genericError")}
          </p>
        )}
        {importRecipe.isSuccess && (
          <div className="mt-3 flex items-center gap-3">
            {importRecipe.data.imageUrl && <ThumbPhoto src={importRecipe.data.imageUrl} size={56} />}
            <p className="m-0 text-sm text-text">
              {t("recipeImport.success", { title: importRecipe.data.title })}
            </p>
          </div>
        )}
      </Accordion>
    </Card>
  );
}
