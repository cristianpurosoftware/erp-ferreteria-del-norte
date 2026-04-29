"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Play, Check, Package, XCircle, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getPickingTaskById, assignPickingTask, startPickingTask, pickItem as pickItemAction, completePickingTask, stagePickingTask, cancelPickingTask } from "@/lib/actions/picking";
import { getTeam } from "@/lib/actions/team";
import { getLots } from "@/lib/actions/lots";
import { getWarehouseLocations } from "@/lib/actions/warehouse-locations";
import { Checkbox } from "@/components/ui/checkbox";
import type { PickingTask, PickingTaskItem, User, Lot, WarehouseLocation } from "@/lib/types";
import { PICKING_STATUS_LABELS, PICKING_ITEM_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PickingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<PickingTask | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [pickDialog, setPickDialog] = useState<PickingTaskItem | null>(null);
  const [pickQty, setPickQty] = useState<number>(0);
  const [pickLotId, setPickLotId] = useState<string>("");
  const [pickLocationId, setPickLocationId] = useState<string>("");
  const [pickShort, setPickShort] = useState<boolean>(false);

  const id = params.id;

  const refetch = useCallback(async () => setTask(await getPickingTaskById(id)), [id]);

  useEffect(() => {
    Promise.all([
      getPickingTaskById(id),
      getTeam({ limit: 200 }),
      getLots({ limit: 1000 }).catch(() => ({ items: [] })),
      getWarehouseLocations({ limit: 500 }).catch(() => ({ items: [] })),
    ])
      .then(([t, u, l, loc]) => {
        setTask(t);
        setUsers(u.items);
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

  const handlePickSubmit = async () => {
    if (!pickDialog) return;
    const payload: { pickedQty: number; lotId?: string; locationId?: string; short?: boolean } = {
      pickedQty: pickQty,
    };
    if (pickLotId) payload.lotId = pickLotId;
    if (pickLocationId) payload.locationId = pickLocationId;
    if (pickShort) payload.short = true;
    await act("pick", () => pickItemAction(id, pickDialog.id, payload), "Ítem pickeado");
    setPickDialog(null);
    setPickLotId("");
    setPickLocationId("");
    setPickShort(false);
  };

  const openPickDialog = (it: PickingTaskItem) => {
    setPickDialog(it);
    setPickQty(Number(it.requestedQty));
    setPickLotId(it.lotId ?? "");
    setPickLocationId(it.sourceLocationId ?? "");
    setPickShort(false);
  };

  if (loading || !task) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;

  const items = task.items ?? [];
  const totalRequested = items.reduce((s, i) => s + Number(i.requestedQty), 0);
  const totalPicked = items.reduce((s, i) => s + Number(i.pickedQty), 0);
  const progress = totalRequested > 0 ? (totalPicked / totalRequested) * 100 : 0;
  const allPicked = items.length > 0 && items.every((i) => i.status === "picked");

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <Link href="/logistica/picking" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />Volver al picking
            </Link>
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <ClipboardList className="size-6 text-p3" />
                  Picking {task.orderNumber ? `#${task.orderNumber}` : 'Pedido eliminado'}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {task.warehouseName ?? "—"} · {task.assignedToName ?? "Sin asignar"}
                </p>
              </div>
              <Badge variant="outline">{PICKING_STATUS_LABELS[task.status]}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso: {totalPicked}/{totalRequested}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(task.status === "pending" || task.status === "assigned") && (
              <div className="flex items-center gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  onChange={(e) => e.target.value && act("assign", () => assignPickingTask(id, e.target.value), "Asignado")}
                  defaultValue=""
                >
                  <option value="">Asignar a…</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>
                <UserPlus className="size-3.5 text-muted-foreground" />
              </div>
            )}
            {(task.status === "assigned" || task.status === "pending") && (
              <Button size="sm" className="gap-1.5" disabled={!!acting} onClick={() => act("start", () => startPickingTask(id), "Iniciado")}>
                {acting === "start" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}Iniciar
              </Button>
            )}
            {task.status === "in_progress" && allPicked && (
              <Button size="sm" className="gap-1.5" disabled={!!acting} onClick={() => act("complete", () => completePickingTask(id), "Completado")}>
                <Check className="size-3.5" />Completar
              </Button>
            )}
            {task.status === "picked" && (
              <Button size="sm" className="gap-1.5" disabled={!!acting} onClick={() => act("stage", () => stagePickingTask(id), "Staged")}>
                <Package className="size-3.5" />Mover a staging
              </Button>
            )}
            {(task.status === "pending" || task.status === "assigned" || task.status === "in_progress") && (
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={!!acting} onClick={() => act("cancel", () => cancelPickingTask(id), "Cancelado")}>
                <XCircle className="size-3.5" />Cancelar
              </Button>
            )}
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-2">Ítems ({items.length})</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Requerido</TableHead><TableHead className="text-right">Pickeado</TableHead>
                  <TableHead>Estado</TableHead><TableHead className="w-24" />
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-sm">{it.productName ?? "Producto eliminado"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{it.lotCode ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{it.locationCode ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{it.requestedQty}</TableCell>
                      <TableCell className={cn("text-right tabular-nums text-sm", it.status === "short" && "text-destructive")}>{it.pickedQty}</TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{PICKING_ITEM_STATUS_LABELS[it.status]}</Badge></TableCell>
                      <TableCell>
                        {task.status === "in_progress" && it.status === "pending" && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => openPickDialog(it)}>Pickear</Button>
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

      <Dialog open={!!pickDialog} onOpenChange={(o) => !o && setPickDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pickear ítem</DialogTitle></DialogHeader>
          {pickDialog && (() => {
            // FEFO: lots for this product, active, ordered by expirationDate asc
            const productLots = lots
              .filter((l) => l.productId === pickDialog.productId && l.status === "active")
              .sort((a, b) => {
                const ae = a.expirationDate ?? "9999-12-31";
                const be = b.expirationDate ?? "9999-12-31";
                return ae.localeCompare(be);
              });
            const suggestedLot = productLots[0];
            const warehouseLocations = locations.filter((l) => l.warehouseId === task.warehouseId);
            return (
              <div className="space-y-3">
                <p className="text-sm font-medium">{pickDialog.productName}</p>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Cantidad pickeada</label>
                  <Input
                    type="number"
                    min={0}
                    max={pickDialog.requestedQty}
                    value={pickQty}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPickQty(v);
                      if (v < Number(pickDialog.requestedQty)) setPickShort(true);
                      else setPickShort(false);
                    }}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Requerido: {pickDialog.requestedQty}</p>
                </div>
                {productLots.length > 0 && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">
                      Lote {suggestedLot && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">(FEFO sugerido)</span>
                      )}
                    </label>
                    <select
                      value={pickLotId}
                      onChange={(e) => setPickLotId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">—</option>
                      {productLots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code}
                          {l.expirationDate ? ` · vence ${l.expirationDate.slice(0, 10)}` : ""}
                          {l.id === suggestedLot?.id ? " ★" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {warehouseLocations.length > 0 && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Ubicación de origen</label>
                    <select
                      value={pickLocationId}
                      onChange={(e) => setPickLocationId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">—</option>
                      {warehouseLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code}
                          {loc.kind ? ` · ${loc.kind}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="pickShort"
                    checked={pickShort}
                    onCheckedChange={(c) => setPickShort(!!c)}
                  />
                  <label htmlFor="pickShort" className="text-sm cursor-pointer">
                    Marcar como faltante
                    <span className="block text-xs text-muted-foreground">
                      Registra la línea como corta (`short`). El resto queda pendiente para reprogramación.
                    </span>
                  </label>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickDialog(null)} disabled={!!acting}>Cancelar</Button>
            <Button onClick={handlePickSubmit} disabled={!!acting}>{acting === "pick" && <Loader2 className="size-4 mr-2 animate-spin" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
