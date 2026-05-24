import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { resetPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>

          <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />
            Secure account recovery
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Reset your password
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Enter the email address connected to your PODMatch AI account.
            We&apos;ll send you a password reset link if an account exists.
          </p>

          {params.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}

          {params.success ? (
            <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Check your email</p>
                <p className="mt-1">
                  If an account exists for that email, a password reset link has
                  been sent.
                </p>
              </div>
            </div>
          ) : null}

          <form action={resetPassword} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl">
              Send reset link
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline"
            >
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}