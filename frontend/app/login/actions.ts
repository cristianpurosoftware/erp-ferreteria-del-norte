"use server";

import * as authApi from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/client";
import { redirect } from "next/navigation";

function resolveLoginTarget(raw: string | null): string {
  // Evitar el doble redirect /login -> / -> /dashboard, y rechazar destinos
  // externos o que vuelvan al login (por seguridad y para no loopear).
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw === "/" || raw.startsWith("/login")) return "/dashboard";
  return raw;
}

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const target = resolveLoginTarget(formData.get("from") as string | null);

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos." };
  }

  try {
    await authApi.login(email, password);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: "Credenciales incorrectas." };
    }
    return { error: "Error al conectar con el servidor." };
  }

  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await authApi.logout();
  redirect("/login");
}
