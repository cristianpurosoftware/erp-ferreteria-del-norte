"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Truck, Loader2, Play, Flag, Check, XCircle, Plus, MapPin, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShipmentForm } from "@/components/forms/shipment-form";
import { getShipmentById, loadShipment, departShipment, completeShipment, cancelShipment, addShipmentStop, arriveStop, deliverStop, rejectStop, partialStop } from "@/lib/actions/shipments";
import { getOrders } from "@/lib/actions/orders";
import { getWarehouses } from "@/lib/actions/settings";
import { getVehicles } from "@/lib/actions/vehicles";
import { getDrivers } from "@/lib/actions/drivers";
import { getDispatchSheets } from "@/lib/actions/dispatch-sheets";
import type { Shipment, ShipmentStop, Order, Warehouse, Vehicle, Driver, DispatchSheet } from "@/lib/types";
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STOP_STATUS_LABELS } from "@/lib/types";

export default function EnvioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [stopDialog, setStopDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchSheets, setDispatchSheets] = useState<DispatchSheet[]>([]);
  const [newStop, setNewStop] = useState({ orderId: "", sequence: 1, plannedWindow: "" });
  const [rejectDialog, setRejectDialog] = useState<ShipmentStop | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const id = params.id;

  const refetch = useCallback(async () => setShipment(await getShipmentById(id)), [id]);

  useEffect(() => {
    Promise.all([
      getShipmentById(id),
      getOrders({ status: "ready_to_dispatch", limit: 200 }).catch(() => ({ items: [] })),
      getWarehouses().catch(() => ({ items: [] })),
      getVehicles({ limit: 500 }).catch(() => ({ items: [] })),
      getDrivers({ limit: 500 }).catch(() => ({ items: [] })),
      getDispatchSheets({ limit: 200 }).catch(() => ({ items: [] })),
    ])
      .then(([s, o, w, v, d, ds]) => {
        setShipment(s);
        setOrders(o.items);
        setWarehouses(w.items);
        setVehicles(v.items);
        setDrivers(d.items);
        setDispatchSheets(ds.items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setActing(key);
    try { await fn(); toast.success(msg); await refetch(); router.refresh(); }
    catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  const handleAddStop = async () => {
    if (!newStop.orderId) return;
    const order = orders.find((o) => o.id === newStop.orderId);
    if (!order) return;
    await act("addStop", () => addShipmentStop(id, { orderId: newStop.orderId, customerId: order.customerId, sequence: newStop.sequence, plannedWindow: newStop.plannedWindow || undefined }), "Parada agregada");
    setStopDialog(false);
    setNewStop({ orderId: "", sequence: 1, plannedWindow: "" });
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason) return;
    await act(`reject-${rejectDialog.id}`, () => rejectStop(id, rejectDialog.id, { reason: rejectReason }), "Stop rechazado");
    setRejectDialog(null);
    setRejectReason("");
  };

  if (loading || !shipment) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;

  const stops = (shipment.stops ?? []).sort((a, b) => a.sequence - b.sequence);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <Link href="/logistica/envios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />Volver
            </Link>
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <Truck className="size-6 text-p3" />Envío {shipment.plannedDate.slice(0, 10)}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {shipment.warehouseName ?? "—"} · {shipment.vehiclePlate ?? "Sin vehículo"} · {shipment.driverName ?? "Sin chofer"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>
                {shipment.status === "planned" && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditDialog(true)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {shipment.status === "planned" && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStopDialog(true)}><Plus className="size-3.5" />Agregar parada</Button>
                <Button size="sm" className="gap-1.5" disabled={!!acting || stops.length === 0} onClick={() => act("load", () => loadShipment(id), "Cargado")}>
                  {acting === "load" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Cargar
                </Button>
              </>
            )}
            {shipment.status === "loaded" && (
              <Button size="sm" className="gap-1.5" disabled={!!acting} onClick={() => act("depart", () => departShipment(id), "En tránsito")}>
                {acting === "depart" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}Salir
              </Button>
            )}
            {shipment.status === "in_transit" && stops.every((s) => s.status !== "pending" && s.status !== "arrived") && (
              <Button size="sm" className="gap-1.5" disabled={!!acting} onClick={() => act("complete", () => completeShipment(id), "Completado")}>
                <Flag className="size-3.5" />Completar
              </Button>
            )}
            {(shipment.status === "planned" || shipment.status === "loaded") && (
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => act("cancel", () => cancelShipment(id), "Cancelado")}>
                <XCircle className="size-3.5" />Cancelar
              </Button>
            )}
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MapPin className="size-4" />Paradas ({stops.length})</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead><TableHead>Cliente</TableHead><TableHead>Pedido</TableHead>
                  <TableHead>Estado</TableHead><TableHead className="w-56" />
                </TableRow></TableHeader>
                <TableBody>
                  {stops.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin paradas.</TableCell></TableRow>
                  ) : stops.map((stop) => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-mono text-sm">{stop.sequence}</TableCell>
                      <TableCell className="text-sm">{stop.customerName ?? "Cliente sin nombre"}</TableCell>
                      <TableCell>
                        {stop.orderNumber ? (
                          <Link href={`/pedidos/${stop.orderNumber ?? stop.orderId}`} className="text-sm hover:underline">
                            {stop.orderNumber ?? stop.orderId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pedido no disponible</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{SHIPMENT_STOP_STATUS_LABELS[stop.status]}</Badge></TableCell>
                      <TableCell>
                        {shipment.status === "in_transit" && stop.status === "pending" && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => act(`arrive-${stop.id}`, () => arriveStop(id, stop.id), "Arribada")}>Arribar</Button>
                        )}
                        {shipment.status === "in_transit" && (stop.status === "arrived" || stop.status === "pending") && (
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" className="h-7" onClick={() => act(`deliver-${stop.id}`, () => deliverStop(id, stop.id), "Entregada")}>Entregar</Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => act(`partial-${stop.id}`, () => partialStop(id, stop.id), "Parcial")}>Parcial</Button>
                            <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => setRejectDialog(stop)}>Rechazar</Button>
                          </div>
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

      <Dialog open={stopDialog} onOpenChange={setStopDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar parada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Pedido (listo para despacho)</label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={newStop.orderId} onChange={(e) => setNewStop((p) => ({ ...p, orderId: e.target.value }))}>
                <option value="">Seleccioná un pedido</option>
                {orders.map((o) => <option key={o.id} value={o.id}>#{o.number} — {o.customerName ?? ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Orden</label>
                <Input type="number" min={0} value={newStop.sequence} onChange={(e) => setNewStop((p) => ({ ...p, sequence: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Horario</label>
                <Input value={newStop.plannedWindow} onChange={(e) => setNewStop((p) => ({ ...p, plannedWindow: e.target.value }))} placeholder="9-12" className="h-9 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddStop} disabled={!newStop.orderId || !!acting}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rechazar parada</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium block mb-1.5">Motivo</label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Cliente cerrado" className="h-9 text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button onClick={handleReject} disabled={!rejectReason || !!acting}>Confirmar rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShipmentForm
        open={editDialog}
        onOpenChange={(o) => {
          setEditDialog(o);
          if (!o) refetch();
        }}
        shipment={shipment}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
        drivers={drivers.map((d) => ({ id: d.id, fullName: d.fullName }))}
        dispatchSheets={dispatchSheets.map((ds) => ({ id: ds.id, date: ds.date }))}
      />
    </>
  );
}
