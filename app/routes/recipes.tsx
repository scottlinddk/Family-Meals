import { Link, redirect } from "react-router";
import type { Route } from "./+types/recipes";
import { requireUser } from "~/lib/auth";
import { RECIPE_CATALOG } from "~/domain/recipes/recipeCatalog";
import { filterRecipes } from "~/domain/recipes/recipeFilters";
import { useRecipeFilters } from "~/ui/hooks/useRecipeFilters";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { FieldLabel, Input } from "~/ui/components/ui/Input";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

const ALL_PROTEINS = [...new Set(RECIPE_CATALOG.map((entry) => entry.recipe.proteinType))].sort();
const ALL_TAGS = [...new Set(RECIPE_CATALOG.flatMap((entry) => entry.recipe.tags))].sort();

export default function RecipesPage() {
  const { filters, setQuery, toggleProtein, toggleTag, clear } = useRecipeFilters();
  const results = filterRecipes(RECIPE_CATALOG, filters);
  const hasActiveFilters = filters.q !== "" || filters.proteins.length > 0 || filters.tags.length > 0;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-sm text-accent hover:text-accent-700">
        {t("offers.backToPlan")}
      </Link>
      <h1 className="mt-3 mb-5 text-3xl">{t("recipesPage.title")}</h1>

      <div className="mb-3">
        <FieldLabel htmlFor="recipe-search">{t("recipesPage.searchLabel")}</FieldLabel>
        <Input
          id="recipe-search"
          value={filters.q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("recipesPage.searchPlaceholder")}
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {ALL_PROTEINS.map((protein) => (
          <button key={protein} type="button" onClick={() => toggleProtein(protein)}>
            <Tag variant={filters.proteins.includes(protein) ? "accent" : "outline"}>{protein}</Tag>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALL_TAGS.map((tag) => (
          <button key={tag} type="button" onClick={() => toggleTag(tag)}>
            <Tag variant={filters.tags.includes(tag) ? "accent-2" : "outline"}>{tag}</Tag>
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="m-0 text-sm text-muted">{t("recipesPage.resultCount", { count: results.length })}</p>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            {t("recipesPage.clearFilters")}
          </Button>
        )}
      </div>

      {results.length === 0 && <p className="text-sm text-muted">{t("recipesPage.none")}</p>}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {results.map(({ recipe }) => (
          <li key={recipe.id}>
            <Link to={`/recipes/${recipe.id}`} className="block">
              <Card>
                <CardTitle>{recipe.title}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Tag variant="neutral">{recipe.proteinType}</Tag>
                  {recipe.tags.map((tag) => (
                    <Tag key={tag} variant="outline">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
