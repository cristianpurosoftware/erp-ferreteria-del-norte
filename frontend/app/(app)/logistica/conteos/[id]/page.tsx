"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Warehouse as WarehouseIcon, Loader2, Play, Check, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventoryCountById, startInventoryCount, approveInventoryCount, applyInventoryCount, cancelInventoryCount, addInventoryCountLines, recreateInventoryCountFromStock } from "@/lib/actions/inventory-counts";
import { usePermissions } from "@/hooks/use-permissions";
import { getActiveProducts } from "@/lib/actions/products";
import { getLots } from "@/lib/actions/lots";
import { getWarehouseLocations } from "@/lib/actions/warehouse-locations";
import type { InventoryCount, Product, Lot, WarehouseLocation } from "@/lib/types";
import { INVENTORY_COUNT_STATUS_LABELS, INVENTORY_COUNT_KIND_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ConteoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const [count, setCount] = useState<InventoryCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [lineDialog, setLineDialog] = useState(false);
  const [lineForm, setLineForm] = useState({
    productId: "",
    lotId: "",
    locationId: "",
    systemQty: "",
    countedQty: "",
    reasonCode: "",
  });

  const id = params.id;
  const refetch = useCallback(async () => setCount(await getInventoryCountById(id)), [id]);
  useEffect(() => {
    Promise.all([
      getInventoryCountById(id),
      getActiveProducts(),
      getLots({ limit: 500 }).catch(() => ({ items: [] })),
      getWarehouseLocations({ limit: 500 }).catch(() => ({ items: [] })),
    ])
      .then(([c, p, l, loc]) => {
        setCount(c);
        setProducts(p.items);
        setLots(l.items);
        setLocations(loc.items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setActing(key);
    try { await fn(); toast.success(msg); await refetch(); router.refresh(); }
    catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  const addLine = async () => {
    if (!lineForm.productId) return;
    setActing("addLine");
    try {
      const line: Record<string, unknown> = { productId: lineForm.productId };
      if (lineForm.lotId) line.lotId = lineForm.lotId;
      if (lineForm.locationId) line.locationId = lineForm.locationId;
      if (lineForm.systemQty !== "") line.systemQty = Number(lineForm.systemQty);
      if (lineForm.countedQty !== "") line.countedQty = Number(lineForm.countedQty);
      if (lineForm.reasonCode) line.reasonCode = lineForm.reasonCode;
      await addInventoryCountLines(id, { lines: [line as Parameters<typeof addInventoryCountLines>[1]["lines"][number]] });
      toast.success("Línea agregada");
      setLineDialog(false);
      setLineForm({ productId: "", lotId: "", locationId: "", systemQty: "", countedQty: "", reasonCode: "" });
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(null);
    }
  };

  if (loading || !count) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;
  const lines = count.lines ?? [];

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link href="/logistica/conteos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Volver</Link>
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><WarehouseIcon className="size-6 text-p3" />Conteo</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{count.warehouseName ?? "—"} · {INVENTORY_COUNT_KIND_LABELS[count.kind]}</p>
            </div>
            <Badge>{INVENTORY_COUNT_STATUS_LABELS[count.status]}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {count.status === "draft" && <Button size="sm" disabled={!!acting} onClick={() => act("start", () => startInventoryCount(id), "Iniciado")}><Play className="size-3.5 mr-1" />Iniciar</Button>}
          {(count.status === "in_progress" || count.status === "pending_approval") && <Button size="sm" disabled={!!acting} onClick={() => act("approve", () => approveInventoryCount(id), "Aprobado")}>Aprobar</Button>}
          {count.status === "approved" && <Button size="sm" disabled={!!acting} onClick={() => act("apply", () => applyInventoryCount(id), "Aplicado")}><Check className="size-3.5 mr-1" />Aplicar</Button>}
          {count.status !== "applied" && count.status !== "cancelled" && (
            <Button size="sm" variant="outline" className="text-destructive" disabled={!!acting} onClick={() => act("cancel", () => cancelInventoryCount(id), "Cancelado")}>Cancelar</Button>
          )}
          {can("inventory_counts:create") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!!acting}
              onClick={async () => {
                setActing("recreate");
                try {
                  const fresh = await recreateInventoryCountFromStock(id);
                  toast.success("Conteo recreado desde stock");
                  router.push(`/logistica/conteos/${fresh.id}`);
                } catch (err) {
                  toast.error("Error", { description: err instanceof Error ? err.message : "" });
                } finally {
                  setActing(null);
                }
              }}
            >
              {acting === "recreate" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Recrear desde stock
            </Button>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Líneas ({lines.length})</h2>
            {(count.status === "draft" || count.status === "in_progress") && (
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setLineDialog(true)}>
                <Plus className="size-3" />
                Agregar línea
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Producto</TableHead><TableHead>Ubicación</TableHead><TableHead>Lote</TableHead>
                <TableHead className="text-right">Sistema</TableHead><TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin líneas.</TableCell></TableRow>
                ) : lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.productName ?? "Producto eliminado"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.locationCode ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.lotCode ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{l.systemQty}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{l.countedQty}</TableCell>
                    <TableCell className={cn("text-right tabular-nums text-sm font-medium", Number(l.difference) !== 0 && "text-destructive")}>{l.difference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={lineDialog} onOpenChange={setLineDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar línea al conteo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Producto *</label>
              <select
                value={lineForm.productId}
                onChange={(e) => setLineForm((p) => ({ ...p, productId: e.target.value, lotId: "" }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccioná un producto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ""}{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Lote</label>
                <select
                  value={lineForm.lotId}
                  onChange={(e) => setLineForm((p) => ({ ...p, lotId: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!lineForm.productId}
                >
                  <option value="">—</option>
                  {lots.filter((l) => l.productId === lineForm.productId).map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Ubicación</label>
                <select
                  value={lineForm.locationId}
                  onChange={(e) => setLineForm((p) => ({ ...p, locationId: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {locations.filter((l) => l.warehouseId === count.warehouseId).map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Qty sistema</label>
                <Input type="number" min={0} value={lineForm.systemQty} onChange={(e) => setLineForm((p) => ({ ...p, systemQty: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Qty contada</label>
                <Input type="number" min={0} value={lineForm.countedQty} onChange={(e) => setLineForm((p) => ({ ...p, countedQty: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Motivo de discrepancia</label>
              <Input value={lineForm.reasonCode} onChange={(e) => setLineForm((p) => ({ ...p, reasonCode: e.target.value }))} className="h-9 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLineDialog(false)}>Cancelar</Button>
            <Button onClick={addLine} disabled={!lineForm.productId || acting === "addLine"}>
              {acting === "addLine" && <Loader2 className="size-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
