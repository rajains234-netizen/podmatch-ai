import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
      <div className="grid w-full gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <section>
          <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />
            Start checking billing packets before submission
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Create your PODMatch AI account
          </h1>

          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Upload PODs, invoices, BOLs, rate confirmations, lumper receipts,
            and detention backup to catch payment blockers before you submit
            billing.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <FeatureCard title="Billing readiness score" />
            <FeatureCard title="Payment delay risk" />
            <FeatureCard title="Fix packet assistant" />
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-2xl font-semibold">Sign up</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your workspace and start your first packet review.
            </p>
          </div>

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
                  We sent you a confirmation link. Once confirmed, you can log
                  in and start reviewing packets.
                </p>
              </div>
            </div>
          ) : null}

          <form action={signUp} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="text-sm font-medium text-foreground"
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="Raja Singh"
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="company_name"
                className="text-sm font-medium text-foreground"
              >
                Company name
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                required
                placeholder="Your trucking or dispatch company"
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

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

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl">
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
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

function FeatureCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium">{title}</p>
      </div>
    </div>
  );
}