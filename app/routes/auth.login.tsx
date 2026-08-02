import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";
import { createSupabaseServerClient } from "~/lib/auth";
import { t } from "~/i18n/t";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  return redirect("/", { headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">{t("auth.login.heading")}</h1>
      <Form method="post" className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="dig@example.com"
          className="rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          name="password"
          required
          placeholder={t("common.password")}
          className="rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={navigation.state === "submitting"}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {navigation.state === "submitting" ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </Form>
      {actionData?.error && <p className="text-sm text-red-700">{actionData.error}</p>}
      <p className="text-sm text-gray-600">
        {t("auth.login.noAccount")}{" "}
        <Link to="/auth/signup" className="underline">
          {t("auth.login.link")}
        </Link>
      </p>
    </main>
  );
}
