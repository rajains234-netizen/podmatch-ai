import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { signIn } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_35%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-center lg:px-8">
          <section className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-100 shadow-sm">
              <ShieldCheck className="mr-2 h-4 w-4 text-emerald-300" />
              Secure freight billing workspace
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Log in and keep your freight billing moving.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Review signed PODs, invoices, rate confirmations, lumper receipts,
              and detention evidence before sending billing packets.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                icon={<UploadCloud className="h-5 w-5 text-emerald-300" />}
                title="Upload packets"
                description="Add freight documents from desktop or mobile."
              />
              <FeatureCard
                icon={<FileCheck2 className="h-5 w-5 text-sky-300" />}
                title="Check readiness"
                description="Spot missing documents and billing blockers."
              />
              <FeatureCard
                icon={<CheckCircle2 className="h-5 w-5 text-amber-300" />}
                title="Submit cleaner"
                description="Know what is ready before you invoice."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
                <FileCheck2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold">Welcome back</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Log in to PODMatch AI.
                </p>
              </div>
            </div>

            {params.error ? (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {params.error}
              </div>
            ) : null}

            <form action={signIn} className="mt-7 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-200"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none ring-offset-slate-950 transition placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-200"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Your password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none ring-offset-slate-950 transition placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                Log in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-300">
                New to PODMatch AI?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
        {icon}
      </div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}