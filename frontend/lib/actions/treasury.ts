"use server";
import * as checksApi from "@/lib/api/endpoints/checks";
import * as bankAccountsApi from "@/lib/api/endpoints/bank-accounts";
import * as renditionsApi from "@/lib/api/endpoints/collector-renditions";
import * as bankStatementsApi from "@/lib/api/endpoints/bank-statements";
import * as reconciliationApi from "@/lib/api/endpoints/reconciliation";
import * as withholdingsApi from "@/lib/api/endpoints/withholdings";
import * as paymentOrdersApi from "@/lib/api/endpoints/payment-orders";
import type { Check, BankAccount, CollectorRendition, BankStatement, ReconciliationMatch, Withholding, WithholdingPadron, PaymentOrder, PaymentBatch } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (p: string) => revalidatePath(p);

// Checks
export async function getChecks(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Check>> { return checksApi.getAll(params); }
export async function getCheckById(id: string): Promise<Check> { return checksApi.getById(id); }
export async function createCheck(data: Record<string, unknown>): Promise<Check> { const r = await checksApi.create(data); REV("/tesoreria/cheques"); return r; }
export async function getCheckPortfolio(): Promise<Check[]> { return checksApi.portfolio(); }
export async function depositCheck(id: string, bankAccountId: string): Promise<Check> { const r = await checksApi.deposit(id, bankAccountId); REV("/tesoreria/cheques"); return r; }
export async function clearCheck(id: string): Promise<Check> { const r = await checksApi.clear(id); REV("/tesoreria/cheques"); return r; }
export async function bounceCheck(id: string, reason: string): Promise<Check> { const r = await checksApi.bounce(id, reason); REV("/tesoreria/cheques"); return r; }
export async function endorseCheck(id: string, supplierId: string): Promise<Check> { const r = await checksApi.endorse(id, supplierId); REV("/tesoreria/cheques"); return r; }
export async function returnCheck(id: string): Promise<Check> { const r = await checksApi.returnToCustomer(id); REV("/tesoreria/cheques"); return r; }
export async function cancelCheck(id: string): Promise<Check> { const r = await checksApi.cancel(id); REV("/tesoreria/cheques"); return r; }

// Bank accounts
export async function getBankAccounts(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<BankAccount>> { return bankAccountsApi.getAll(params); }
export async function createBankAccount(data: Record<string, unknown>): Promise<BankAccount> { const r = await bankAccountsApi.create(data); REV("/tesoreria/cuentas-bancarias"); return r; }
export async function updateBankAccount(id: string, data: Record<string, unknown>): Promise<BankAccount> { const r = await bankAccountsApi.update(id, data); REV("/tesoreria/cuentas-bancarias"); return r; }
export async function deleteBankAccount(id: string): Promise<void> { await bankAccountsApi.remove(id); REV("/tesoreria/cuentas-bancarias"); }

// Renditions
export async function getRenditions(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<CollectorRendition>> { return renditionsApi.getAll(params); }
export async function getRenditionById(id: string): Promise<CollectorRendition> { return renditionsApi.getById(id); }
export async function createRendition(data: Record<string, unknown>): Promise<CollectorRendition> { const r = await renditionsApi.create(data); REV("/tesoreria/rendiciones"); return r; }
export async function submitRendition(id: string): Promise<CollectorRendition> { const r = await renditionsApi.submit(id); REV("/tesoreria/rendiciones"); return r; }
export async function approveRendition(id: string): Promise<CollectorRendition> { const r = await renditionsApi.approve(id); REV("/tesoreria/rendiciones"); return r; }
export async function rejectRendition(id: string, reason?: string): Promise<CollectorRendition> { const r = await renditionsApi.reject(id, reason); REV("/tesoreria/rendiciones"); return r; }

// Bank statements
export async function getBankStatements(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<BankStatement>> { return bankStatementsApi.getAll(params); }
export async function getBankStatementById(id: string): Promise<BankStatement> { return bankStatementsApi.getById(id); }
export async function createBankStatement(data: Record<string, unknown>): Promise<BankStatement> { const r = await bankStatementsApi.create(data); REV("/tesoreria/conciliacion"); return r; }
export async function reconcileStatement(id: string): Promise<BankStatement> { const r = await bankStatementsApi.reconcile(id); REV("/tesoreria/conciliacion"); return r; }

// Reconciliation
export async function getReconciliationSuggestions(bankStatementId?: string): Promise<ReconciliationMatch[]> { return reconciliationApi.getSuggestions(bankStatementId); }
export async function confirmReconciliation(data: { bankStatementLineId: string; paymentId?: string; checkId?: string }): Promise<ReconciliationMatch> { const r = await reconciliationApi.confirm(data); REV("/tesoreria/conciliacion"); return r; }
export async function rejectReconciliation(id: string): Promise<void> { await reconciliationApi.reject(id); REV("/tesoreria/conciliacion"); }

// Withholdings
export async function getWithholdings(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Withholding>> { return withholdingsApi.getAll(params); }
export async function lookupPadron(params: { kind: string; jurisdictionId?: string; cuit: string }): Promise<WithholdingPadron | null> { return withholdingsApi.padronLookup(params); }
export async function importPadron(data: unknown): Promise<{ imported: number }> { const r = await withholdingsApi.padronImport(data); REV("/tesoreria/retenciones"); return r; }

// Payment orders
export async function getPaymentOrders(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<PaymentOrder>> { return paymentOrdersApi.getAll(params); }
export async function getPaymentOrderById(id: string): Promise<PaymentOrder> { return paymentOrdersApi.getById(id); }
export async function createPaymentOrder(data: Record<string, unknown>): Promise<PaymentOrder> { const r = await paymentOrdersApi.create(data); REV("/tesoreria/ordenes-pago"); return r; }
export async function approvePaymentOrder(id: string): Promise<PaymentOrder> { const r = await paymentOrdersApi.approve(id); REV("/tesoreria/ordenes-pago"); return r; }
export async function payPaymentOrder(id: string): Promise<PaymentOrder> { const r = await paymentOrdersApi.pay(id); REV("/tesoreria/ordenes-pago"); return r; }
export async function cancelPaymentOrder(id: string): Promise<PaymentOrder> { const r = await paymentOrdersApi.cancel(id); REV("/tesoreria/ordenes-pago"); return r; }

// Payment batches
export async function getPaymentBatches(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<PaymentBatch>> { return paymentOrdersApi.getBatches(params); }
export async function createPaymentBatch(data: Record<string, unknown>): Promise<PaymentBatch> { const r = await paymentOrdersApi.createBatch(data); REV("/tesoreria/batches"); return r; }
export async function generatePaymentBatchFile(id: string): Promise<PaymentBatch> { const r = await paymentOrdersApi.generateBatchFile(id); REV("/tesoreria/batches"); return r; }
export async function markPaymentBatchProcessed(id: string): Promise<PaymentBatch> { const r = await paymentOrdersApi.markBatchProcessed(id); REV("/tesoreria/batches"); return r; }

// ─── Server-side table query + summary ─────────────────────
export async function getChecksQuery(query: string): Promise<PaginatedResult<Check>> { return checksApi.getAll(new URLSearchParams(query)); }
export async function getChecksSummary(query?: string): Promise<checksApi.ChecksSummary> { return checksApi.getSummary(query); }

export async function getBankAccountsQuery(query: string): Promise<PaginatedResult<BankAccount>> { return bankAccountsApi.getAll(new URLSearchParams(query)); }
export async function getBankAccountsSummary(query?: string): Promise<bankAccountsApi.BankAccountsSummary> { return bankAccountsApi.getSummary(query); }

export async function getRenditionsQuery(query: string): Promise<PaginatedResult<CollectorRendition>> { return renditionsApi.getAll(new URLSearchParams(query)); }
export async function getRenditionsSummary(query?: string): Promise<renditionsApi.RenditionsSummary> { return renditionsApi.getSummary(query); }

export async function getBankStatementsQuery(query: string): Promise<PaginatedResult<BankStatement>> { return bankStatementsApi.getAll(new URLSearchParams(query)); }
export async function getBankStatementsSummary(query?: string): Promise<bankStatementsApi.BankStatementsSummary> { return bankStatementsApi.getSummary(query); }

export async function getWithholdingsQuery(query: string): Promise<PaginatedResult<Withholding>> { return withholdingsApi.getAll(new URLSearchParams(query)); }
export async function getWithholdingsSummary(query?: string): Promise<withholdingsApi.WithholdingsSummary> { return withholdingsApi.getSummary(query); }

export async function getPaymentOrdersQuery(query: string): Promise<PaginatedResult<PaymentOrder>> { return paymentOrdersApi.getAll(new URLSearchParams(query)); }
export async function getPaymentOrdersSummary(query?: string): Promise<paymentOrdersApi.PaymentOrdersSummary> { return paymentOrdersApi.getSummary(query); }

export async function getPaymentBatchesQuery(query: string): Promise<PaginatedResult<PaymentBatch>> { return paymentOrdersApi.getBatches(new URLSearchParams(query)); }
