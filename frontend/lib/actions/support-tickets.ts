"use server";

import * as supportApi from "@/lib/api/endpoints/support-tickets";
import type {
  SupportTicket,
  SupportTicketAttachment,
} from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function forwardMultipart(path: string, fd: FormData): Promise<unknown> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("API_URL no configurada");
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) throw new Error("Sesión no válida");
  const resp = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: fd,
  });
  const json = await resp.json();
  if (!resp.ok || !json?.success) {
    throw new Error(json?.error?.message ?? `Request failed (${resp.status})`);
  }
  return json.data;
}

export async function getSupportTickets(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<SupportTicket>> {
  return supportApi.getAll(params);
}

export async function getSupportTicketsQuery(query: string): Promise<PaginatedResult<SupportTicket>> {
  return supportApi.getAll(new URLSearchParams(query));
}

export async function getSupportTicketsSummary(query?: string): Promise<supportApi.SupportTicketsSummary> {
  return supportApi.getSummary(query);
}

export async function getSupportTicketById(id: string): Promise<SupportTicket> {
  return supportApi.getById(id);
}

export async function getSupportAgentStatus(): Promise<supportApi.SupportAgentStatus> {
  return supportApi.getAgentStatus();
}

export async function createSupportTicket(
  data: {
    title: string;
    description: string;
    type: string;
    priority?: string;
    appEnv?: string;
  },
  files?: File[],
): Promise<SupportTicket> {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description);
  fd.append("type", data.type);
  if (data.priority) fd.append("priority", data.priority);
  if (data.appEnv) fd.append("appEnv", data.appEnv);
  for (const f of files ?? []) fd.append("attachments", f);
  const ticket = (await forwardMultipart(`/support-tickets`, fd)) as SupportTicket;
  revalidatePath("/soporte");
  return ticket;
}

export async function sendCustomerMessage(
  id: string,
  body: string,
  files?: File[],
): Promise<SupportTicket> {
  const fd = new FormData();
  fd.append("body", body);
  for (const f of files ?? []) fd.append("attachments", f);
  const ticket = (await forwardMultipart(`/support-tickets/${id}/messages`, fd)) as SupportTicket;
  revalidatePath(`/soporte/${id}`);
  return ticket;
}

export async function sendSupportHumanMessage(id: string, body: string): Promise<SupportTicket> {
  const ticket = await supportApi.sendSupportHumanMessage(id, body);
  revalidatePath(`/soporte/${id}`);
  return ticket;
}

export async function updateSupportTicket(
  id: string,
  data: Record<string, unknown>
): Promise<SupportTicket> {
  const ticket = await supportApi.update(id, data);
  revalidatePath("/soporte");
  revalidatePath(`/soporte/${id}`);
  return ticket;
}

export async function transitionSupportTicket(
  id: string,
  to: "in_progress" | "review" | "resolved",
  note?: string,
): Promise<SupportTicket> {
  const ticket = await supportApi.transition(id, to, note);
  revalidatePath("/soporte");
  revalidatePath(`/soporte/${id}`);
  return ticket;
}

export async function listSupportTicketAttachments(id: string): Promise<SupportTicketAttachment[]> {
  return supportApi.listAttachments(id);
}

export async function buildAttachmentDownloadUrl(
  ticketId: string,
  attachmentId: string,
): Promise<string> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("API_URL no configurada");
  return `${apiUrl}/support-tickets/${ticketId}/attachments/${attachmentId}/download`;
}

export async function reopenSupportTicket(id: string): Promise<SupportTicket> {
  const t = await supportApi.reopen(id);
  revalidatePath("/soporte");
  revalidatePath(`/soporte/${id}`);
  return t;
}

export async function escalateSupportTicketToHuman(id: string, note?: string): Promise<SupportTicket> {
  const t = await supportApi.escalateHuman(id, note);
  revalidatePath(`/soporte/${id}`);
  return t;
}

export async function returnSupportTicketToAgent(id: string, note?: string): Promise<SupportTicket> {
  const t = await supportApi.returnToAgent(id, note);
  revalidatePath(`/soporte/${id}`);
  return t;
}
