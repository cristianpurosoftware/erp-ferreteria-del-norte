"use server";
import * as api from "@/lib/api/endpoints/debit-notes";
import type { DebitNote } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/comprobantes");

export async function getDebitNotes(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<DebitNote>> { return api.getAll(params); }
export async function getDebitNoteById(id: string): Promise<DebitNote> { return api.getById(id); }
export async function createDebitNote(data: Record<string, unknown>): Promise<DebitNote> { const r = await api.create(data); REV(); return r; }
export async function issueDebitNote(id: string): Promise<DebitNote> { const r = await api.issue(id); REV(); return r; }
export async function cancelDebitNote(id: string): Promise<DebitNote> { const r = await api.cancel(id); REV(); return r; }
export async function getDebitNotesQuery(query: string): Promise<PaginatedResult<DebitNote>> { return api.getAll(new URLSearchParams(query)); }
