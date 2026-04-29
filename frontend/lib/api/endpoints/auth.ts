import { fetchApi, setAuthCookies, clearAuthCookies } from "../client";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roleId: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string) {
  const result = await fetchApi<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });

  await setAuthCookies(result.accessToken, result.refreshToken);

  return result.user;
}

export async function logout() {
  await clearAuthCookies();
}
