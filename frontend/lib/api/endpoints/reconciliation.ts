import { fetchApi } from "../client";
import type { ReconciliationMatch } from "@/lib/types";

export async function getSuggestions(bankStatementId?: string): Promise<ReconciliationMatch[]> {
  return fetchApi<ReconciliationMatch[]>("/reconciliation/suggestions", { params: bankStatementId ? { bankStatementId } : undefined });
}
export async function confirm(data: { bankStatementLineId: string; paymentId?: string; checkId?: string }): Promise<ReconciliationMatch> {
  return fetchApi<ReconciliationMatch>("/reconciliation/confirm", { method: "POST", body: data });
}
export async function reject(id: string): Promise<void> {
  return fetchApi<void>(`/reconciliation/${id}/reject`, { method: "POST" });
}
