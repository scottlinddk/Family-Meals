import { Link, redirect } from "react-router";
import type { Route } from "./+types/recipes.$id";
import { requireUser } from "~/lib/auth";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { Card, CardTitle } from "~/ui/components/ui/Card";
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

          {recipe.data.description && <p className="mb-3 text-sm">{recipe.data.description}</p>}

          {(recipe.data.servings || recipe.data.totalTimeMinutes) && (
            <p className="mb-3 flex flex-wrap gap-x-4 text-sm text-muted">
              {recipe.data.servings && <span>{t("recipeDetail.servings", { count: recipe.data.servings })}</span>}
              {recipe.data.totalTimeMinutes && (
                <span>{t("recipeDetail.totalTime", { minutes: recipe.data.totalTimeMinutes })}</span>
              )}
            </p>
          )}

          <a
            href={recipe.data.url}
            target="_blank"
            rel="noreferrer"
            className="mb-5 inline-block text-sm text-accent hover:text-accent-700"
          >
            {t("recipeDetail.viewOriginal")}
          </a>

          <Card className="mb-4">
            <CardTitle>{t("recipeDetail.ingredientsHeading")}</CardTitle>
            <ul className="m-0 list-disc pl-4.5 text-sm">
              {recipe.data.ingredients.map((ingredient, i) => (
                <li key={i}>{ingredient}</li>
              ))}
            </ul>
          </Card>

          {recipe.data.instructions.length > 0 && (
            <Card className="mb-4">
              <CardTitle>{t("recipeDetail.instructionsHeading")}</CardTitle>
              <ol className="m-0 list-decimal pl-4.5 text-sm">
                {recipe.data.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
