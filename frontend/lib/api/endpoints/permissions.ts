import { fetchApi } from "../client";
import type { Permission } from "@/lib/types";

export async function getAll(): Promise<Permission[]> {
  return fetchApi<Permission[]>("/permissions");
}
