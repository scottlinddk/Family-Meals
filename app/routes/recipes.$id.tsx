import type { Route } from "./+types/recipes.$id";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { NutritionPanel } from "~/ui/components/NutritionPanel";
import { ShareButton } from "~/ui/components/ShareButton";
import { LinkButton } from "~/ui/components/ui/Button";
import { BackLink } from "~/ui/components/ui/BackLink";
import { HeroPhoto } from "~/ui/components/ui/Photo";
import { t } from "~/i18n/t";

export default function RecipeDetailPage({ params }: Route.ComponentProps) {
  const recipe = useExternalRecipe(params.id);

  return (
    <>
      <BackLink to="/recipes">{t("recipeDetail.backToRecipes")}</BackLink>

      {recipe.isLoading && <p className="mt-4 text-muted">{t("week.loading")}</p>}
      {recipe.data === null && <p className="mt-4 text-muted">{t("recipeDetail.notFound")}</p>}

      {recipe.data && (
        <>
          {recipe.data.imageUrl && (
            <HeroPhoto
              src={recipe.data.imageUrl}
              time={recipe.data.totalTimeMinutes}
              className="mt-2 mb-4 overflow-hidden rounded-md"
            />
          )}

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
            <h1 className="m-0 text-2xl">{recipe.data.title}</h1>
            <div className="flex flex-wrap gap-2">
              <LinkButton to={`/recipes/${params.id}/cook`}>{t("cook.open")}</LinkButton>
              <ShareButton target={{ kind: "recipe", recipeId: params.id! }} size="md" />
            </div>
          </div>

          {recipe.data.nutrition && <NutritionPanel nutrition={recipe.data.nutrition} />}

          <RecipeBody
            description={recipe.data.description}
            servings={recipe.data.servings}
            totalTimeMinutes={recipe.data.totalTimeMinutes}
            ingredientLines={recipe.data.ingredients}
            instructionLines={recipe.data.instructions}
            url={recipe.data.url}
          />
        </>
      )}
    </>
  );
}
