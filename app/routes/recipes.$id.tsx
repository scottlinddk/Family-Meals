import { Link } from "react-router";
import type { Route } from "./+types/recipes.$id";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { LinkButton } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export default function RecipeDetailPage({ params }: Route.ComponentProps) {
  const recipe = useExternalRecipe(params.id);

  return (
    <>
      <Link to="/recipes" className="text-sm text-accent hover:text-accent-700">
        {t("recipeDetail.backToRecipes")}
      </Link>

      {recipe.isLoading && <p className="mt-4 text-muted">{t("week.loading")}</p>}
      {recipe.data === null && <p className="mt-4 text-muted">{t("recipeDetail.notFound")}</p>}

      {recipe.data && (
        <>
          <div className="mt-3 mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h1 className="m-0 text-3xl">{recipe.data.title}</h1>
            <LinkButton to={`/recipes/${params.id}/cook`}>{t("cook.open")}</LinkButton>
          </div>

          {recipe.data.imageUrl && (
            <img
              src={recipe.data.imageUrl}
              alt=""
              width={1280}
              height={720}
              className="mb-3 aspect-video w-full rounded-md object-cover"
            />
          )}

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
