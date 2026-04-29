"use server";
import * as api from "@/lib/api/endpoints/credit-notes";
import type { CreditNote } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/comprobantes");

export async function getCreditNotes(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<CreditNote>> { return api.getAll(params); }
export async function getCreditNoteById(id: string): Promise<CreditNote> { return api.getById(id); }
export async function createCreditNote(data: Record<string, unknown>): Promise<CreditNote> { const r = await api.create(data); REV(); return r; }
export async function issueCreditNote(id: string): Promise<CreditNote> { const r = await api.issue(id); REV(); return r; }
export async function applyCreditNote(id: string): Promise<CreditNote> { const r = await api.apply(id); REV(); return r; }
export async function cancelCreditNote(id: string): Promise<CreditNote> { const r = await api.cancel(id); REV(); return r; }
export async function getCreditNotesQuery(query: string): Promise<PaginatedResult<CreditNote>> { return api.getAll(new URLSearchParams(query)); }
