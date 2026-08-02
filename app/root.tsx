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
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

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
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="mt-2 text-gray-600">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded bg-gray-100 p-4 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
