"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

function resolveFrom(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw === "/" || raw.startsWith("/login")) return "/dashboard";
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const from = resolveFrom(searchParams.get("from"));

  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <div className="relative min-h-svh overflow-hidden bg-[var(--p5)] flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)" }}
      />

      {/* Glow — centered on card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-[110px] pointer-events-none" />

      <div className="login-enter relative w-full max-w-sm flex flex-col items-center">
        {/* Logo / brand */}
        <div className="mb-9 flex flex-col items-center gap-3">
          <div className="rounded-2xl border backdrop-blur-sm">
            <Image src="/purosoftware-icon.png" alt="Purosoftware" width={168} height={60} className="object-contain" />
          </div>
          <div className="text-center">
            <p className="text-primary/65 text-xs mt-0.5 tracking-wide">Plataforma de gestión AI First</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.045] backdrop-blur-md p-7"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
          <h2 className="text-white/70 text-[13px] font-medium mb-5 tracking-wide">Iniciar sesión</h2>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="from" value={from} />

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                Usuario
              </label>
              <input
                name="email"
                type="text"
                autoComplete="username"
                autoFocus
                required
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.10] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/15 transition-all duration-200"
                placeholder="usuario o email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.10] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/55 focus:ring-2 focus:ring-primary/15 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            {state.error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-primary hover:bg-[var(--p2)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--p5)] font-semibold text-sm py-3 transition-all duration-200 flex items-center justify-center gap-2 mt-1"
              style={{ boxShadow: "0 4px 20px rgba(56,182,255,0.30)" }}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-enter {
          animation: loginFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
