import { useState, type ReactNode } from "react";
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

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t("app.title")}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Lora:ital,wght@0,400;0,500;1,400&display=swap"
        />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-bg font-body text-text antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
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
