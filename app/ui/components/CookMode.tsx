import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { AdultVariant, ChildVariant } from "~/domain/types";
import { buildCookSteps, type CookStep } from "~/domain/recipes/cookSteps";
import { COOK_VIEW_MODES, DEFAULT_USER_PREFERENCES, type CookViewMode } from "~/domain/preferences";
import { useKeepScreenAwake, type KeepScreenAwake } from "~/ui/hooks/useKeepScreenAwake";
import { useSetCookViewMode, useUserPreferences } from "~/ui/hooks/useUserPreferences";
import { VariantsGrid, VariantGuidanceNote } from "~/ui/components/VariantPanel";
import { Button } from "~/ui/components/ui/Button";
import { Tag } from "~/ui/components/ui/Tag";
import { ChevronDownIcon, CloseIcon } from "~/ui/components/Icon";
import { useCalorieEstimate } from "~/ui/components/RecipeCalories";
import { t, type TranslationKey } from "~/i18n/t";

export interface CookModeProps {
  title: string;
  /** Where the ✕ and the final "done" button go back to. */
  exitTo: string;
  ingredientLines: string[];
  instructionLines: string[];
  /** Subset of `ingredientLines` on offer this week, badged in the list. */
  offerIngredientLines?: string[];
  servings?: number;
  totalTimeMinutes?: number;
  url?: string;
  /** Present only for a day of the plan; drives the closing serving step. */
  adultVariant?: AdultVariant;
  childVariant?: ChildVariant;
}

const INGREDIENTS_PANEL_ID = "cook-ingredients";

const VIEW_MODE_LABEL_KEYS: Record<CookViewMode, TranslationKey> = {
  steps: "cook.viewSteps",
  all: "cook.viewAll",
};

function clampStep(index: number, stepCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(stepCount - 1, 0));
}

/**
 * Cook mode: the recipe with the app taken away from around it, at arm's
 * length, with the screen held awake.
 *
 * It deliberately drops the chrome — nav, week context, edit controls —
 * because everything on screen while cooking competes with the pan. What's
 * left comes in two layouts, remembered per user: `steps` walks through one
 * step at a time with full-width Previous/Next targets usable with a knuckle
 * (arrow keys too, for a laptop on the counter), and `all` puts the whole
 * recipe on one scrollable page for reading it through or cooking from a
 * glance without touching the phone.
 */
export function CookMode({
  title,
  exitTo,
  ingredientLines,
  instructionLines,
  offerIngredientLines = [],
  servings,
  totalTimeMinutes,
  url,
  adultVariant,
  childVariant,
}: CookModeProps) {
  const navigate = useNavigate();
  const hasVariants = Boolean(adultVariant && childVariant);
  const steps = buildCookSteps({
    instructionLines,
    hasIngredients: ingredientLines.length > 0,
    hasVariants,
  });

  // Cooking is the last moment the figure is any use, and the one place the
  // recipe is on screen without the meta line the other views carry.
  const calories = useCalorieEstimate(ingredientLines, servings);

  const preferences = useUserPreferences();
  const setViewMode = useSetCookViewMode();
  // The defaults stand in until the saved preference arrives, so cook mode
  // opens on the first paint rather than waiting on a round trip.
  const viewMode = (preferences.data ?? DEFAULT_USER_PREFERENCES).cookViewMode;

  const [stepIndex, setStepIndex] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());

  // Entering cook mode is itself the request to keep the screen on — the
  // toggle in the bar is there to take it back, not to have to ask first.
  const screen = useKeepScreenAwake(true);

  const stepCount = steps.length;
  // Clamped on read as well as on write, so a recipe that shrinks underneath
  // cook mode (a refetch, a swapped day) lands on its last step rather than
  // on nothing at all.
  const currentIndex = clampStep(stepIndex, stepCount);
  const step = steps[currentIndex];
  const isLast = currentIndex === stepCount - 1;

  const goPrevious = () => setStepIndex((i) => clampStep(i - 1, stepCount));
  const goNext = () => setStepIndex((i) => clampStep(i + 1, stepCount));

  // Arrow keys move between steps, for a laptop propped on the counter. The
  // listener is on the document rather than a focusable element, so it keeps
  // working after a tap lands somewhere harmless.
  const steppingThrough = viewMode === "steps";
  useEffect(() => {
    if (!steppingThrough) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Never steal a key from a control the cook is actually using.
      if (event.target instanceof HTMLElement && event.target.closest("input, button, a, select")) {
        return;
      }
      if (event.key === "ArrowRight") setStepIndex((i) => clampStep(i + 1, stepCount));
      if (event.key === "ArrowLeft") setStepIndex((i) => clampStep(i - 1, stepCount));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [steppingThrough, stepCount]);

  const toggleTicked = (index: number) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  const ingredients = (
    <IngredientList
      lines={ingredientLines}
      offerLines={offerIngredientLines}
      ticked={ticked}
      onToggle={toggleTicked}
    />
  );

  const sourceLink = url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-block text-sm text-accent hover:text-accent-700"
    >
      {t("recipeDetail.viewOriginal")}
    </a>
  ) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-divider bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2">
          <Link
            to={exitTo}
            aria-label={t("cook.exit")}
            className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-100 hover:text-text"
          >
            <CloseIcon />
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-lg leading-tight font-bold">
            {title}
          </h1>

          <KeepAwakeToggle screen={screen} />
        </div>

        {steppingThrough && stepCount > 1 && (
          <div className="h-0.5 w-full bg-divider">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${((currentIndex + 1) / stepCount) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ViewModeToggle
            viewMode={viewMode}
            onChange={(mode) => setViewMode.mutate(mode)}
            failed={setViewMode.isError}
          />
          <KeepAwakeStatus screen={screen} />
        </div>

        {/* Above the pane rather than inside it: in the stepping layout the
            meta used to live in the ingredients step, so from step two
            onwards the cook could no longer see what they were serving or
            what it costs them. */}
        <RecipeMeta
          servings={servings}
          totalTimeMinutes={totalTimeMinutes}
          calorieKcal={calories?.perServingKcal}
        />

        {stepCount === 0 && (
          <>
            <p className="text-lg text-muted">{t("cook.nothingToCook")}</p>
            {sourceLink}
          </>
        )}

        {stepCount > 0 &&
          (steppingThrough ? (
            <StepPane
              step={step}
              instructionCount={countInstructions(steps)}
              ingredients={ingredients}
              ingredientCount={ingredientLines.length}
              tickedCount={ticked.size}
              ingredientsOpen={ingredientsOpen}
              onToggleIngredients={() => setIngredientsOpen((open) => !open)}
              sourceLink={sourceLink}
              adultVariant={adultVariant}
              childVariant={childVariant}
            />
          ) : (
            <AllStepsPane
              steps={steps}
              ingredients={ingredients}
              ingredientCount={ingredientLines.length}
              sourceLink={sourceLink}
              adultVariant={adultVariant}
              childVariant={childVariant}
            />
          ))}
      </main>

      {steppingThrough && stepCount > 0 && (
        <footer className="sticky bottom-0 border-t border-divider bg-surface/95 px-3 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="min-h-13 flex-1 text-base"
            >
              {t("cook.previous")}
            </Button>
            {isLast ? (
              <Button
                type="button"
                onClick={() => void navigate(exitTo)}
                className="min-h-13 flex-1 text-base"
              >
                {t("cook.finish")}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} className="min-h-13 flex-1 text-base">
                {t("cook.next")}
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/**
 * Cook mode before its recipe has arrived (or when it never will). Keeps the
 * same full-screen shell and, above all, the way out — a cook-mode URL opened
 * cold shouldn't strand anyone on a blank screen with no nav to fall back on.
 */
export function CookModeFallback({ exitTo, loading }: { exitTo: string; loading: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-divider">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2">
          <Link
            to={exitTo}
            aria-label={t("cook.exit")}
            className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-100 hover:text-text"
          >
            <CloseIcon />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <p className="text-lg text-muted">{t(loading ? "week.loading" : "cook.notFound")}</p>
      </main>
    </div>
  );
}

interface PaneCommonProps {
  ingredients: ReactNode;
  ingredientCount: number;
  sourceLink: ReactNode;
  adultVariant?: AdultVariant;
  childVariant?: ChildVariant;
}

/** One step, filling the screen, with the ingredients a tap away beneath it. */
function StepPane({
  step,
  instructionCount,
  ingredients,
  ingredientCount,
  tickedCount,
  ingredientsOpen,
  onToggleIngredients,
  sourceLink,
  adultVariant,
  childVariant,
}: PaneCommonProps & {
  step: CookStep | undefined;
  instructionCount: number;
  tickedCount: number;
  ingredientsOpen: boolean;
  onToggleIngredients: () => void;
}) {
  if (!step) return null;

  return (
    <>
      {step.kind === "ingredients" && (
        <>
          <h2 className="mb-1 text-2xl">{t("recipeDetail.ingredientsHeading")}</h2>
          {ingredients}
          <p className="mt-4 text-sm text-muted">{t("cook.noMethod")}</p>
          {sourceLink}
        </>
      )}

      {step.kind === "instruction" && (
        <>
          <p className="m-0 text-[11px] font-semibold tracking-[0.08em] text-accent-700 uppercase">
            {t("cook.stepCounter", { current: step.number, total: instructionCount })}
          </p>
          <p className="mt-2 mb-6 text-2xl leading-relaxed sm:text-[28px]">{step.text}</p>

          {ingredientCount > 0 && (
            <section className="border-t border-divider pt-3">
              <button
                type="button"
                onClick={onToggleIngredients}
                aria-expanded={ingredientsOpen}
                aria-controls={INGREDIENTS_PANEL_ID}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-sm px-1 text-left text-sm transition-colors hover:bg-neutral-100"
              >
                <span className="font-semibold">
                  {t("recipeDetail.ingredientsHeading")}
                  <span className="ml-2 text-muted">
                    {t("cook.tickedCount", { ticked: tickedCount, total: ingredientCount })}
                  </span>
                </span>
                <ChevronDownIcon
                  size={16}
                  className={`text-muted transition-transform ${ingredientsOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div id={INGREDIENTS_PANEL_ID} hidden={!ingredientsOpen}>
                {ingredients}
              </div>
            </section>
          )}
        </>
      )}

      {step.kind === "serving" && adultVariant && childVariant && (
        <ServingSection adultVariant={adultVariant} childVariant={childVariant} />
      )}
    </>
  );
}

/**
 * The whole recipe on one page: ingredients, then every step numbered, then
 * serving. Still cook-scaled rather than the reading-sized recipe page —
 * this is the layout for someone who'd rather scroll once than tap eight
 * times, not a way back to the browsing view.
 */
function AllStepsPane({
  steps,
  ingredients,
  ingredientCount,
  sourceLink,
  adultVariant,
  childVariant,
}: PaneCommonProps & { steps: CookStep[] }) {
  const instructions = steps.filter((step) => step.kind === "instruction");
  const hasServing = steps.some((step) => step.kind === "serving");

  return (
    <>
      {ingredientCount > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 text-2xl">{t("recipeDetail.ingredientsHeading")}</h2>
          {ingredients}
        </section>
      )}

      {instructions.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-2xl">{t("recipeDetail.instructionsHeading")}</h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {instructions.map((step) => (
              <li key={step.number} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-accent-100 text-sm font-bold text-accent-700"
                >
                  {step.number}
                </span>
                <p className="m-0 text-lg leading-relaxed sm:text-xl">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mb-3 text-sm text-muted">{t("cook.noMethod")}</p>
      )}

      {hasServing && adultVariant && childVariant && (
        <ServingSection adultVariant={adultVariant} childVariant={childVariant} />
      )}

      {sourceLink}
    </>
  );
}

function ServingSection({
  adultVariant,
  childVariant,
}: {
  adultVariant: AdultVariant;
  childVariant: ChildVariant;
}) {
  return (
    <section>
      <h2 className="mb-1 text-2xl">{t("cook.servingHeading")}</h2>
      <p className="mt-0 mb-4 text-base text-muted">{t("cook.servingIntro")}</p>
      <VariantsGrid adultVariant={adultVariant} childVariant={childVariant} />
      <div className="mt-3">
        <VariantGuidanceNote adultVariant={adultVariant} childVariant={childVariant} />
      </div>
    </section>
  );
}

function IngredientList({
  lines,
  offerLines,
  ticked,
  onToggle,
}: {
  lines: string[];
  offerLines: string[];
  ticked: ReadonlySet<number>;
  onToggle: (index: number) => void;
}) {
  const onOffer = new Set(offerLines);

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {lines.map((line, i) => {
        const isTicked = ticked.has(i);
        return (
          <li key={i} className="border-b border-divider last:border-0">
            <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={isTicked}
                onChange={() => onToggle(i)}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span className={`flex-1 text-lg ${isTicked ? "text-muted line-through" : ""}`}>
                {line}
                {onOffer.has(line) && (
                  <>
                    {" "}
                    <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>
                  </>
                )}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function countInstructions(steps: CookStep[]): number {
  return steps.filter((step) => step.kind === "instruction").length;
}

function RecipeMeta({
  servings,
  totalTimeMinutes,
  calorieKcal,
}: {
  servings?: number;
  totalTimeMinutes?: number;
  calorieKcal?: number | null;
}) {
  if (!servings && !totalTimeMinutes && !calorieKcal) return null;
  return (
    <p className="mt-0 mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {servings && <span>{t("recipeDetail.servings", { count: servings })}</span>}
      {totalTimeMinutes && <span>{t("recipeDetail.totalTime", { minutes: totalTimeMinutes })}</span>}
      {calorieKcal && <span>{t("recipeDetail.kcalPerServing", { kcal: calorieKcal })}</span>}
    </p>
  );
}

/**
 * Switches between the two layouts. A segmented control rather than a menu:
 * both options stay visible and one tap wide, and which one is on is legible
 * across a kitchen. The choice is saved per user (see `useSetCookViewMode`),
 * so it holds for the next recipe and the next device — and says so when the
 * save didn't land, since a preference that silently isn't kept is worse
 * than one that never claimed to be.
 */
function ViewModeToggle({
  viewMode,
  onChange,
  failed,
}: {
  viewMode: CookViewMode;
  onChange: (mode: CookViewMode) => void;
  failed: boolean;
}) {
  return (
    <div>
      <div role="group" aria-label={t("cook.viewLabel")} className="flex gap-1">
        {COOK_VIEW_MODES.map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={mode === viewMode ? "primary" : "secondary"}
            aria-pressed={mode === viewMode}
            onClick={() => mode !== viewMode && onChange(mode)}
            className="min-h-9"
          >
            {t(VIEW_MODE_LABEL_KEYS[mode])}
          </Button>
        ))}
      </div>
      {failed && <p className="mt-1 mb-0 text-xs text-muted">{t("cook.viewSaveFailed")}</p>}
    </div>
  );
}

/**
 * The keep-screen-on switch. Icon-only, because the header is the one place
 * the title needs, with the state spelled out in words by `KeepAwakeStatus`
 * below it — an icon alone can't say whether the promise is being kept.
 */
function KeepAwakeToggle({ screen }: { screen: KeepScreenAwake }) {
  const on = screen.enabled && screen.active;
  return (
    <Button
      type="button"
      variant={on ? "primary" : "secondary"}
      size="sm"
      onClick={screen.toggle}
      disabled={screen.supported === false}
      aria-pressed={on}
      aria-label={t("cook.keepAwakeLabel")}
      title={t("cook.keepAwakeLabel")}
      className="h-11 w-11 shrink-0 p-0 text-base"
    >
      <span aria-hidden="true">{on ? "☀" : "☾"}</span>
    </Button>
  );
}

/**
 * One muted line saying, in words, whether the screen is actually being held
 * awake — including when the browser can't or wouldn't. Rendered only once
 * the client has answered, so the server pass never guesses wrong.
 */
function KeepAwakeStatus({ screen }: { screen: KeepScreenAwake }) {
  const key: TranslationKey | null =
    screen.supported === null
      ? null
      : screen.supported === false
        ? "cook.keepAwakeUnsupported"
        : screen.refused
          ? "cook.keepAwakeRefused"
          : screen.enabled && screen.active
            ? "cook.keepAwakeStatusOn"
            : "cook.keepAwakeStatusOff";

  // The line keeps its space while the answer is still unknown, so the first
  // step doesn't jump down the screen a moment after the page appears.
  return (
    <p aria-live="polite" className="m-0 min-h-4 flex-1 text-xs text-muted sm:text-right">
      {key && t(key)}
    </p>
  );
}
