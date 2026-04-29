import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { User } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<User>> {
  return fetchPaginated<User>("/users", params);
}

export async function getById(id: string): Promise<User> {
  return fetchApi<User>(`/users/${id}`);
}

export async function getMe(): Promise<User> {
  return fetchApi<User>("/users/me");
}

export async function create(data: unknown): Promise<User> {
  return fetchApi<User>("/users", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<User> {
  return fetchApi<User>(`/users/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/users/${id}`, { method: "DELETE" });
}
