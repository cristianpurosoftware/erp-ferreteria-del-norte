import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type {
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketsSummary,
  SupportAgentStatus,
} from "@/lib/types";

export type { SupportTicketsSummary, SupportAgentStatus };

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<SupportTicket>> {
  return fetchPaginated<SupportTicket>("/support-tickets", params);
}

export async function getSummary(query?: string): Promise<SupportTicketsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<SupportTicketsSummary>(`/support-tickets/summary${suffix}`);
}

export async function getById(id: string): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}`);
}

export async function update(id: string, data: Record<string, unknown>): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}`, { method: "PUT", body: data });
}

export async function transition(
  id: string,
  to: "in_progress" | "review" | "resolved",
  note?: string,
): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}/status`, {
    method: "POST",
    body: { to, ...(note ? { note } : {}) },
  });
}

export async function listAttachments(id: string): Promise<SupportTicketAttachment[]> {
  return fetchApi<SupportTicketAttachment[]>(`/support-tickets/${id}/attachments`);
}

export async function getAgentStatus(): Promise<SupportAgentStatus> {
  return fetchApi<SupportAgentStatus>(`/support-tickets/agent/status`);
}

export async function sendSupportHumanMessage(id: string, body: string): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}/support-messages`, {
    method: "POST",
    body: { body },
  });
}

export async function reopen(id: string): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}/reopen`, { method: "POST" });
}

export async function escalateHuman(id: string, note?: string): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}/agent-actions/escalate-human`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function returnToAgent(id: string, note?: string): Promise<SupportTicket> {
  return fetchApi<SupportTicket>(`/support-tickets/${id}/agent-actions/return-to-agent`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

// Customer messages + ticket creation use multipart/form-data when attachments
// are involved, so they live in the server-action layer (lib/actions) which
// has access to the raw fetch API with cookies.
