import { fetchApi } from "../client";
import type { Company } from "@/lib/types";

export async function get(): Promise<Company> {
  return fetchApi<Company>("/company");
}

export async function update(data: unknown): Promise<Company> {
  return fetchApi<Company>("/company", { method: "PUT", body: data });
}
