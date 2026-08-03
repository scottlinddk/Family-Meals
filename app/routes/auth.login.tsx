import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-8">
      <div>
        <p className="text-sm text-muted">{t("app.title")}</p>
        <h1 className="mt-1 text-4xl">{t("auth.login.heading")}</h1>
      </div>
      <Form method="post" className="flex flex-col gap-3">
        <Input type="email" name="email" required placeholder="dig@example.com" />
        <Input type="password" name="password" required placeholder={t("common.password")} />
        <Button type="submit" variant="primary" block disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </Form>
      {actionData?.error && <p className="text-sm text-red-700">{actionData.error}</p>}
      <p className="text-sm opacity-80">
        {t("auth.login.noAccount")}{" "}
        <Link to="/auth/signup" className="text-accent hover:text-accent-700">
          {t("auth.login.link")}
        </Link>
      </p>
    </main>
  );
}
