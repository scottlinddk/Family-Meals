import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

/**
 * A thin indeterminate bar under the top nav while a navigation's loader (or
 * a submission) is in flight — the same job as GitHub's or YouTube's page
 * progress bar. Delayed by 100ms so a navigation that resolves from the
 * router cache doesn't flash it for a single frame; once shown it stays
 * until the navigation settles, so it never reads as flickering.
 */
export function RouteProgress() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hiding happens on the next tick rather than synchronously so both
    // branches update state from a callback, not the effect body itself.
    const id = setTimeout(() => setVisible(isNavigating), isNavigating ? 100 : 0);
    return () => clearTimeout(id);
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden motion-reduce:hidden"
    >
      <div className="h-full w-1/3 rounded-full bg-accent-2 animate-route-progress" />
    </div>
  );
}
