import type { Route } from "./+types/recipes.$id.cook";
import { useExternalRecipe } from "~/ui/hooks/useExternalRecipes";
import { CookMode, CookModeFallback } from "~/ui/components/CookMode";

/** Cook mode for a browsed recipe, reached from its detail page. */
export default function RecipeCookPage({ params }: Route.ComponentProps) {
  const exitTo = `/recipes/${params.id}`;
  const recipe = useExternalRecipe(params.id);

  if (!recipe.data) {
    return <CookModeFallback exitTo={exitTo} loading={recipe.isLoading} />;
  }

  return (
    <CookMode
      title={recipe.data.title}
      exitTo={exitTo}
      ingredientLines={recipe.data.ingredients}
      instructionLines={recipe.data.instructions}
      servings={recipe.data.servings}
      totalTimeMinutes={recipe.data.totalTimeMinutes}
      url={recipe.data.url}
    />
  );
}
