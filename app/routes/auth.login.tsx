import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";
import { createSupabaseServerClient } from "~/lib/auth";
import { Button } from "~/ui/components/ui/Button";
import { Input } from "~/ui/components/ui/Input";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL("/auth/callback", request.url).toString() },
  });

  return { ok: !error, error: error?.message };
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-8">
      <div>
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Family Meals</p>
        <h1 className="mt-2 font-display text-4xl">Sign in.</h1>
      </div>
      <p className="text-sm text-ink-2">We'll email you a magic link — no password needed.</p>
      <Form method="post" className="flex flex-col gap-3">
        <Input type="email" name="email" required placeholder="you@example.com" />
        <Button type="submit" variant="primary" disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? "Sending..." : "Send magic link"}
        </Button>
      </Form>
      {actionData?.ok && <p className="text-sm text-olive">Check your inbox for the link.</p>}
      {actionData?.error && <p className="text-sm text-brick">{actionData.error}</p>}
    </main>
  );
}
