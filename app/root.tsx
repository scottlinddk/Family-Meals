import { useEffect, useState, type ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./app.css";
import { t } from "~/i18n/t";
import { DEFAULT_LOCALE } from "~/i18n/locale";
import { RouteProgress } from "~/ui/components/RouteProgress";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t("app.title")}</title>

        {/*
          Installable web app. The manifest carries the name, colours, icons
          and shortcuts a home-screen launch needs; the Apple meta tags do the
          same job for iOS, which still doesn't read all of it. Icons are
          generated from one definition — see scripts/generateIcons.mjs.
        */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0e3b27" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={t("app.title")} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
        />
        <Meta />
        <Links />
      </head>
      {/*
        `min-h-dvh` rather than `min-h-screen` (`100vh`): iOS Safari sizes
        `100vh` to the page with its toolbar collapsed, which is taller than
        what's actually visible whenever the toolbar is showing. That left
        the fixed bottom nav floating above a strip of blank body with
        nothing below it — `dvh` tracks the toolbar and always matches what's
        on screen.
      */}
      <body className="min-h-dvh overflow-x-hidden bg-bg font-body text-text antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Registers the service worker that makes the installed app usable without a
 * connection (see `public/sw.js` for what it does and doesn't cache).
 *
 * Production only: in dev, a worker caching Vite's asset URLs would serve
 * yesterday's modules over today's edits, and the offline behaviour it exists
 * to provide isn't what's being worked on there.
 */
function useServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    // After load, so registering never competes with the first render for
    // bandwidth on the connection this is all meant to help with.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
}

export default function App() {
  useServiceWorker();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Offers, recipes and plans change on human timescales, not by the
            // second — without this every mount refetched everything, so
            // moving between pages re-fired the same queries constantly.
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouteProgress />
      <Outlet />
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = t("error.title.oops");
  let details = t("error.details.generic");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? t("error.title.404") : "Error";
    details =
      error.status === 404
        ? t("error.details.404")
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-4xl">{message}</h1>
      <p className="mt-2 text-muted">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-md border border-divider bg-surface p-4 font-mono text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
