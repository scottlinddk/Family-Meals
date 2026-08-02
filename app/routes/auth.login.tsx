import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";
import { createSupabaseServerClient } from "~/lib/auth";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Sign in to Family Meals</h1>
      <p className="text-sm text-gray-600">
        We'll email you a magic link — no password needed.
      </p>
      <Form method="post" className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={navigation.state === "submitting"}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {navigation.state === "submitting" ? "Sending..." : "Send magic link"}
        </button>
      </Form>
      {actionData?.ok && <p className="text-sm text-green-700">Check your inbox for the link.</p>}
      {actionData?.error && <p className="text-sm text-red-700">{actionData.error}</p>}
    </main>
  );
}
