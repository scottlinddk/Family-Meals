import type { Route } from "./+types/recipes.$id";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { useOffers } from "~/ui/hooks/useOffers";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { ShareButton } from "~/ui/components/ShareButton";
import { LinkButton } from "~/ui/components/ui/Button";
import { BackLink } from "~/ui/components/ui/BackLink";
import { HeroPhoto } from "~/ui/components/ui/Photo";
import { t } from "~/i18n/t";

export default function RecipeDetailPage({ params }: Route.ComponentProps) {
  const recipe = useExternalRecipe(params.id);
  const offers = useOffers();
  const currentOffers = Object.values(offers.data?.stores ?? {}).flatMap((store) => store?.offers ?? []);

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

          <div className="mb-6 flex flex-col gap-4">
            <h1 className="m-0 text-3xl">{recipe.data.title}</h1>
            <div className="grid grid-cols-2 gap-3">
              <LinkButton to={`/recipes/${params.id}/cook`} size="md" block>
                {t("cook.open")}
              </LinkButton>
              <ShareButton target={{ kind: "recipe", recipeId: params.id! }} size="md" block />
            </div>
          </div>

          <RecipeBody
            description={recipe.data.description}
            servings={recipe.data.servings}
            totalTimeMinutes={recipe.data.totalTimeMinutes}
            ingredientLines={recipe.data.ingredients}
            instructionLines={recipe.data.instructions}
            offers={currentOffers}
            source={recipe.data.source}
            url={recipe.data.url}
          />
        </>
      )}
    </>
  );
}
