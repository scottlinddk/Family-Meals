import { useState } from "react";
import { ClockIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/**
 * A dish photo, in the two shapes the design system has for one: a hero that
 * runs edge to edge across the top of its card, and a rounded thumbnail
 * beside a row of text. Both are rounded rectangles — never circles, never
 * square corners — and both keep their aspect ratio by cropping.
 *
 * Every photo comes from a scrape, over a connection that isn't always fast,
 * so every photo needs a between state: a pulsing tint the same shape as the
 * photo, in place until `onLoad` fires, rather than the blank white (or
 * broken-image icon) a bare `<img>` shows meanwhile.
 */
function usePhotoLoaded() {
  const [loaded, setLoaded] = useState(false);
  return { loaded, onLoad: () => setLoaded(true) };
}

/**
 * `time` puts the recipe's total time in a translucent badge over the top-left
 * corner, which is where the design system keeps it.
 */
export function HeroPhoto({
  src,
  time,
  className = "",
}: {
  src: string;
  time?: number;
  className?: string;
}) {
  const { loaded, onLoad } = usePhotoLoaded();
  return (
    <div className={`relative bg-neutral-200 ${className}`}>
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-neutral-300" />}
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={onLoad}
        className={`aspect-[1.6] w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {time && <TimeBadge minutes={time} />}
    </div>
  );
}

export function ThumbPhoto({ src, size = 64 }: { src: string; size?: number }) {
  const { loaded, onLoad } = usePhotoLoaded();
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-sm bg-neutral-200"
      style={{ width: size, height: size }}
    >
      {!loaded && <span aria-hidden="true" className="absolute inset-0 block animate-pulse bg-neutral-300" />}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onLoad={onLoad}
        className={`h-full w-full rounded-sm object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}

/** Reads over any photograph, dark or light, which a tinted pill would not. */
export function TimeBadge({ minutes }: { minutes: number }) {
  return (
    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-sm bg-[rgb(15_20_13/0.55)] px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-[2px]">
      <ClockIcon size={12} />
      {t("recipeDetail.totalTime", { minutes })}
    </span>
  );
}
