"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Package, Loader2, Check, Eye, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getReturnById, confirmReturn, receiveReturn, inspectReturn, closeReturn, cancelReturn } from "@/lib/actions/returns";
import type { ReturnOrder } from "@/lib/types";
import { RETURN_STATUS_LABELS, RETURN_KIND_LABELS, RETURN_CONDITION_LABELS } from "@/lib/types";

export default function DevolucionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ret, setRet] = useState<ReturnOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Record<string, string>>({});

  const id = params.id;
  const refetch = useCallback(async () => setRet(await getReturnById(id)), [id]);
  useEffect(() => { refetch().finally(() => setLoading(false)); }, [refetch]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setActing(key);
    try { await fn(); toast.success(msg); await refetch(); router.refresh(); }
    catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  const handleInspect = async () => {
    if (!ret || !ret.items) return;
    const lines = ret.items.map((i) => ({ itemId: i.id, condition: conditions[i.id] ?? i.condition }));
    await act("inspect", () => inspectReturn(id, { lines }), "Inspeccionada");
  };

  if (loading || !ret) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;

  const items = ret.items ?? [];

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link href="/logistica/devoluciones" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />Volver
          </Link>
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><Package className="size-6 text-p3" />Devolución</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {ret.customerName ?? "Cliente no disponible"} · {RETURN_KIND_LABELS[ret.kind]}
              </p>
            </div>
            <Badge>{RETURN_STATUS_LABELS[ret.status]}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ret.status === "draft" && <Button size="sm" disabled={!!acting} onClick={() => act("confirm", () => confirmReturn(id), "Confirmada")}><Check className="size-3.5 mr-1" />Confirmar</Button>}
          {ret.status === "confirmed" && <Button size="sm" disabled={!!acting} onClick={() => act("receive", () => receiveReturn(id), "Recibida")}>Recibir</Button>}
          {ret.status === "received" && <Button size="sm" disabled={!!acting} onClick={handleInspect}>{acting === "inspect" && <Loader2 className="size-3.5 mr-1 animate-spin" />}<Eye className="size-3.5 mr-1" />Inspeccionar</Button>}
          {ret.status === "inspected" && <Button size="sm" disabled={!!acting} onClick={() => act("close", () => closeReturn(id), "Cerrada")}>Cerrar</Button>}
          {(ret.status === "draft" || ret.status === "confirmed") && (
            <Button size="sm" variant="outline" className="text-destructive" disabled={!!acting} onClick={() => act("cancel", () => cancelReturn(id), "Cancelada")}><XCircle className="size-3.5 mr-1" />Cancelar</Button>
          )}
        </div>

        <section>
          <h2 className="text-sm font-semibold mb-2">Ítems ({items.length})</h2>
          {ret.status === "received" && (
            <p className="text-xs text-muted-foreground mb-2">
              Marcá la condición de cada ítem antes de confirmar. Revendible vuelve a pick; dañado/vencido se manda a cuarentena.
            </p>
          )}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead><TableHead>Condición</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin ítems.</TableCell></TableRow>
                ) : items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{it.productName ?? "Producto no disponible"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.lotCode ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{it.quantity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.reasonCode ?? "—"}</TableCell>
                    <TableCell>
                      {ret.status === "received" ? (
                        <select className="h-7 rounded-md border border-input bg-background px-2 text-xs" value={conditions[it.id] ?? it.condition} onChange={(e) => setConditions((p) => ({ ...p, [it.id]: e.target.value }))}>
                          <option value="resellable">Revendible</option>
                          <option value="damaged">Dañado</option>
                          <option value="expired">Vencido</option>
                          <option value="quarantine">Cuarentena</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className="font-normal">{RETURN_CONDITION_LABELS[it.condition] ?? it.condition}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
