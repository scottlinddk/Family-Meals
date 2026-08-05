import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { AdultVariant, ChildVariant } from "~/domain/types";
import { buildCookSteps } from "~/domain/recipes/cookSteps";
import { useKeepScreenAwake, type KeepScreenAwake } from "~/ui/hooks/useKeepScreenAwake";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { Button } from "~/ui/components/ui/Button";
import { Tag } from "~/ui/components/ui/Tag";
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

function clampStep(index: number, stepCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(stepCount - 1, 0));
}

/**
 * Cook mode: the recipe reduced to one step at a time, at arm's length, with
 * the screen held awake.
 *
 * It deliberately drops the app's chrome — nav, week context, edit controls —
 * because everything on screen while cooking competes with the pan. What's
 * left is the current step in large type, the ingredients one tap away, and
 * full-width Previous/Next targets usable with a knuckle. Arrow keys work too,
 * for a laptop on the counter.
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
  const onOffer = new Set(offerIngredientLines);
  const goPrevious = () => setStepIndex((i) => clampStep(i - 1, stepCount));
  const goNext = () => setStepIndex((i) => clampStep(i + 1, stepCount));

  // Arrow keys move between steps, for a laptop propped on the counter. The
  // listener is on the document rather than a focusable element, so it keeps
  // working after a tap lands somewhere harmless.
  useEffect(() => {
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
  }, [stepCount]);

  const toggleTicked = (index: number) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  const ingredientList = (
    <ul className="m-0 flex list-none flex-col p-0">
      {ingredientLines.map((line, i) => {
        const isTicked = ticked.has(i);
        return (
          <li key={i} className="border-b border-divider last:border-0">
            <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={isTicked}
                onChange={() => toggleTicked(i)}
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

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-divider bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2">
          <Link
            to={exitTo}
            aria-label={t("cook.exit")}
            className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none hover:bg-text/7"
          >
            <span aria-hidden="true">✕</span>
          </Link>

          <h1 className="min-w-0 flex-1 truncate font-heading text-lg leading-tight font-semibold">
            {title}
          </h1>

          <KeepAwakeToggle screen={screen} />
        </div>

        {steps.length > 1 && (
          <div className="h-0.5 w-full bg-divider">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${((currentIndex + 1) / stepCount) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <KeepAwakeStatus screen={screen} />

        {!step && (
          <>
            <p className="text-lg text-muted">{t("cook.nothingToCook")}</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-accent hover:text-accent-700"
              >
                {t("recipeDetail.viewOriginal")}
              </a>
            )}
          </>
        )}

        {step?.kind === "ingredients" && (
          <>
            <h2 className="mb-1 text-3xl">{t("recipeDetail.ingredientsHeading")}</h2>
            <RecipeMeta servings={servings} totalTimeMinutes={totalTimeMinutes} />
            {ingredientList}
            <p className="mt-4 text-sm text-muted">{t("cook.noMethod")}</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm text-accent hover:text-accent-700"
              >
                {t("recipeDetail.viewOriginal")}
              </a>
            )}
          </>
        )}

        {step?.kind === "instruction" && (
          <>
            <p className="m-0 text-xs tracking-[0.1em] text-accent uppercase">
              {t("cook.stepCounter", { current: step.number, total: instructionStepCount(steps) })}
            </p>
            <p className="mt-2 mb-6 text-2xl leading-relaxed sm:text-3xl">{step.text}</p>

            {ingredientLines.length > 0 && (
              <section className="border-t border-divider pt-3">
                <button
                  type="button"
                  onClick={() => setIngredientsOpen((open) => !open)}
                  aria-expanded={ingredientsOpen}
                  aria-controls={INGREDIENTS_PANEL_ID}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 text-left text-sm hover:bg-text/7"
                >
                  <span className="font-heading font-semibold">
                    {t("recipeDetail.ingredientsHeading")}
                    <span className="ml-2 text-muted">
                      {t("cook.tickedCount", {
                        ticked: ticked.size,
                        total: ingredientLines.length,
                      })}
                    </span>
                  </span>
                  <span aria-hidden="true">{ingredientsOpen ? "▲" : "▼"}</span>
                </button>
                <div id={INGREDIENTS_PANEL_ID} hidden={!ingredientsOpen}>
                  <RecipeMeta servings={servings} totalTimeMinutes={totalTimeMinutes} />
                  {ingredientList}
                </div>
              </section>
            )}
          </>
        )}

        {step?.kind === "serving" && adultVariant && childVariant && (
          <>
            <h2 className="mb-1 text-3xl">{t("cook.servingHeading")}</h2>
            <p className="mt-0 mb-4 text-base text-muted">{t("cook.servingIntro")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdultVariantPanel variant={adultVariant} />
              <ChildVariantPanel variant={childVariant} />
            </div>
          </>
        )}
      </main>

      {steps.length > 0 && (
        <footer className="sticky bottom-0 border-t border-divider bg-bg/95 px-3 py-3 backdrop-blur">
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
            className="-ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none hover:bg-text/7"
          >
            <span aria-hidden="true">✕</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <p className="text-lg text-muted">{t(loading ? "week.loading" : "cook.notFound")}</p>
      </main>
    </div>
  );
}

function instructionStepCount(steps: ReturnType<typeof buildCookSteps>): number {
  return steps.filter((step) => step.kind === "instruction").length;
}

function RecipeMeta({
  servings,
  totalTimeMinutes,
}: {
  servings?: number;
  totalTimeMinutes?: number;
}) {
  if (!servings && !totalTimeMinutes) return null;
  return (
    <p className="mt-0 mb-2 flex flex-wrap gap-x-4 text-sm text-muted">
      {servings && <span>{t("recipeDetail.servings", { count: servings })}</span>}
      {totalTimeMinutes && <span>{t("recipeDetail.totalTime", { minutes: totalTimeMinutes })}</span>}
    </p>
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
    <p aria-live="polite" className="mt-0 mb-4 min-h-4 text-xs text-muted">
      {key && t(key)}
    </p>
  );
}
