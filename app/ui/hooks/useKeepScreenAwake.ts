import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface KeepScreenAwake {
  /**
   * Whether this browser has the Screen Wake Lock API at all — `null` until
   * the client has had a chance to answer, so the server-rendered pass
   * doesn't claim the screen will dim on a browser that supports it fine.
   */
  supported: boolean | null;
  /** What the cook asked for. Stays true across a lock the OS took back. */
  enabled: boolean;
  /** Whether a wake lock is actually held right now. */
  active: boolean;
  /** The browser refused the lock — typically battery saver or a hidden tab. */
  refused: boolean;
  toggle: () => void;
}

function subscribeNever(): () => void {
  return () => {};
}

function isSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * Holds a screen wake lock while cook mode is open, so a phone propped up on
 * the counter doesn't dim and lock halfway through a step with wet hands.
 *
 * Two things make this more than one `request()` call:
 *
 * - The OS releases the lock whenever the page is hidden (switching apps,
 *   screen off), and re-showing the page does *not* restore it. So the
 *   cook's intent (`enabled`) is kept separately from the lock itself
 *   (`active`), and the lock is re-acquired on every return to visibility.
 * - The API is unavailable in some browsers and can be refused in others
 *   (battery saver). Both are reported rather than swallowed, so the UI can
 *   say the screen will dim instead of quietly promising it won't.
 */
export function useKeepScreenAwake(initiallyEnabled = false): KeepScreenAwake {
  // Read as an external store rather than in render: the server has no
  // `navigator` to ask, and this is the shape that hydrates to the client's
  // answer without a mismatch. Nothing ever changes it, so there's nothing
  // to subscribe to.
  const supported = useSyncExternalStore(subscribeNever, isSupported, () => null);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [active, setActive] = useState(false);
  const [refused, setRefused] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!supported || !enabled) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinelRef.current || document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        // Cook mode may have been left while the request was in flight.
        if (cancelled) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setActive(true);
        setRefused(false);
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
          setActive(false);
        });
      } catch {
        // Battery saver, a permissions policy, or a document that stopped
        // being visible. Recoverable — a later visibility change retries.
        setActive(false);
        setRefused(true);
      }
    };

    void acquire();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      setActive(false);
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [supported, enabled]);

  const toggle = useCallback(() => {
    setRefused(false);
    setEnabled((on) => !on);
  }, []);

  return { supported, enabled, active, refused, toggle };
}
