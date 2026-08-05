import { ClockIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/**
 * A dish photo, in the two shapes the design system has for one: a hero that
 * runs edge to edge across the top of its card, and a rounded thumbnail
 * beside a row of text. Both are rounded rectangles — never circles, never
 * square corners — and both keep their aspect ratio by cropping.
 *
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
  return (
    <div className={`relative ${className}`}>
      <img src={src} alt="" loading="lazy" className="aspect-[1.6] w-full object-cover" />
      {time && <TimeBadge minutes={time} />}
    </div>
  );
}

export function ThumbPhoto({ src, size = 64 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-sm object-cover"
      style={{ width: size, height: size }}
    />
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
