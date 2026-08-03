import { Link, redirect } from "react-router";
import type { Route } from "./+types/recipes.$id";
import { requireUser } from "~/lib/auth";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { useRelatedRecipes } from "~/ui/hooks/useRelatedRecipes";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function RecipeDetailPage({ params }: Route.ComponentProps) {
  const entry = getRecipeById(params.id);
  const related = useRelatedRecipes(params.id);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/recipes" className="text-sm text-accent hover:text-accent-700">
        {t("recipeDetail.backToRecipes")}
      </Link>

      {!entry && <p className="mt-4 text-muted">{t("recipeDetail.notFound")}</p>}

      {entry && (
        <>
          <h1 className="mt-3 mb-2 text-3xl">{entry.recipe.title}</h1>
          <div className="mb-5 flex flex-wrap gap-1.5">
            <Tag variant="neutral">{entry.recipe.proteinType}</Tag>
            {entry.recipe.tags.map((tag) => (
              <Tag key={tag} variant="outline">
                {tag}
              </Tag>
            ))}
          </div>

          <Card className="mb-4">
            <CardTitle>{t("recipeDetail.ingredientsHeading")}</CardTitle>
            <ul className="m-0 list-disc pl-4.5 text-sm">
              {entry.recipe.ingredients.map((ingredient, i) => (
                <li key={i}>
                  {ingredient.quantity}
                  {ingredient.unit} {ingredient.name}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mb-4">
            <CardTitle>{t("recipeDetail.instructionsHeading")}</CardTitle>
            <ol className="m-0 list-decimal pl-4.5 text-sm">
              {entry.recipe.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Card>

          <div className="mt-4">
            <h3 className="text-lg">{t("recipeDetail.relatedHeading")}</h3>
            <p className="-mt-1 text-sm opacity-80">{t("recipeDetail.relatedDescription")}</p>

            {related.isLoading && <p className="mt-2 text-sm text-muted">{t("week.loading")}</p>}
            {related.data && related.data.length === 0 && (
              <p className="mt-2 text-sm text-muted">{t("recipeDetail.relatedNone")}</p>
            )}
            {related.data && related.data.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {related.data.map(({ recipe: externalRecipe }) => (
                  <Card as="li" key={externalRecipe.id}>
                    <a
                      href={externalRecipe.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-accent hover:text-accent-700"
                    >
                      {externalRecipe.title} →
                    </a>
                  </Card>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}
