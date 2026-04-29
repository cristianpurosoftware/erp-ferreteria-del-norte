import { decodeJwt } from "jose";
import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "access_token";

export interface SessionUser {
  id: string;
  email: string;
  roleId: string;
  permissions: string[];
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = decodeJwt(token);
    return {
      id: payload.id as string,
      email: payload.email as string,
      roleId: payload.roleId as string,
      permissions: (payload.permissions as string[]) || [],
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session as SessionUser;
}

export function hasPermission(session: SessionUser, permission: string): boolean {
  return session.permissions.includes(permission);
}
