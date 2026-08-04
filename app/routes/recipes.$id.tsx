import { Link, redirect } from "react-router";
import type { Route } from "./+types/recipes.$id";
import { requireUser } from "~/lib/auth";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function RecipeDetailPage({ params }: Route.ComponentProps) {
  const recipe = useExternalRecipe(params.id);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/recipes" className="text-sm text-accent hover:text-accent-700">
        {t("recipeDetail.backToRecipes")}
      </Link>

      {recipe.isLoading && <p className="mt-4 text-muted">{t("week.loading")}</p>}
      {recipe.data === null && <p className="mt-4 text-muted">{t("recipeDetail.notFound")}</p>}

      {recipe.data && (
        <>
          <h1 className="mt-3 mb-2 text-3xl">{recipe.data.title}</h1>

          {recipe.data.imageUrl && (
            <img
              src={recipe.data.imageUrl}
              alt=""
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
    </main>
  );
}
