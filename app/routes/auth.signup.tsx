import { Form, Link, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/auth.signup";
import { createSupabaseServerClient } from "~/lib/auth";
import { Button } from "~/ui/components/ui/Button";
import { Input } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "") || "/";

  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("redirectTo", redirectTo);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  return { ok: !error, error: error?.message };
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-8">
      <div>
        <p className="text-sm text-muted">{t("app.title")}</p>
        <h1 className="mt-1 text-3xl">{t("auth.signup.heading")}</h1>
      </div>
      <Form method="post" className="flex flex-col gap-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Input type="email" name="email" required placeholder="dig@example.com" />
        <Input type="password" name="password" required minLength={6} placeholder={t("common.password")} />
        <Button type="submit" variant="primary" block disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </Button>
      </Form>
      {actionData?.ok && <p className="text-sm text-accent-700">{t("auth.signup.confirmEmail")}</p>}
      {actionData?.error && <p className="text-sm text-red-700">{actionData.error}</p>}
      <p className="text-sm text-muted">
        {t("auth.signup.hasAccount")}{" "}
        <Link
          to={`/auth/login${redirectTo !== "/" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-accent hover:text-accent-700"
        >
          {t("auth.signup.link")}
        </Link>
      </p>
    </main>
  );
}
