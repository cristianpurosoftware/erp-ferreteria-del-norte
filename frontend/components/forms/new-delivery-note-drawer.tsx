"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { getOrders, getOrderById } from "@/lib/actions/orders";
import { createDeliveryNote } from "@/lib/actions/delivery-notes";
import { getWarehouses } from "@/lib/actions/settings";
import type { Order, OrderItem, Warehouse } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const TODAY = new Date().toISOString().split("T")[0];

export function NewDeliveryNoteDrawer({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [loading, setLoading] = React.useState(false);

  // Step 1
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);

  // Step 2
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [number, setNumber] = React.useState("");
  const [salesPoint, setSalesPoint] = React.useState("00001");
  const [issueDate, setIssueDate] = React.useState(TODAY);
  const [warehouseId, setWarehouseId] = React.useState("");

  // Load orders and warehouses on open
  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedOrder(null);
    setOrderItems([]);
    setSearch("");
    setNumber("");
    setSalesPoint("00001");
    setIssueDate(TODAY);
    setWarehouseId("");

    setOrdersLoading(true);
    getOrders({ status: "delivered", limit: 50 })
      .then((r) => setOrders(r.items))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));

    getWarehouses({ limit: 100 })
      .then((r) => {
        setWarehouses(r.items);
        if (r.items.length > 0) setWarehouseId(r.items[0].id);
      })
      .catch(() => setWarehouses([]));
  }, [open]);

  const filteredOrders = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        String(o.number).includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  async function handleSelectOrder(order: Order) {
    setSelectedOrder(order);
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const full = await getOrderById(order.id);
      setOrderItems(full.items ?? []);
    } catch {
      toast.error("No se pudo cargar los ítems del pedido");
    } finally {
      setLoadingItems(false);
    }
    setStep(2);
  }

  async function handleSubmit() {
    if (!selectedOrder) return;
    if (!number.trim()) {
      toast.error("El número de remito es requerido");
      return;
    }
    if (!orderItems.length) {
      toast.error("El pedido no tiene ítems para incluir en el remito");
      return;
    }
    setLoading(true);
    try {
      await createDeliveryNote({
        number: number.trim(),
        salesPoint: salesPoint.trim() || "00001",
        issueDate,
        customerId: selectedOrder.customerId,
        orderId: selectedOrder.id,
        warehouseId: warehouseId || undefined,
        items: orderItems.map((i) => ({
          productId: i.productId,
          orderItemId: i.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      toast.success("Remito creado");
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear remito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              {step === 1 ? "Nuevo remito — Elegir pedido" : "Nuevo remito — Datos"}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 px-2 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <div className="space-y-3">
              <Input
                placeholder="Buscar por número de pedido o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
              />
              <Separator />
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando pedidos...
                </div>
              ) : filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {orders.length === 0
                    ? "No hay pedidos entregados disponibles."
                    : "Sin resultados para la búsqueda."}
                </p>
              ) : (
                <ul className="max-h-64 overflow-y-auto space-y-1 rounded-md border border-border">
                  {filteredOrders.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors text-sm flex items-center justify-between gap-2"
                      >
                        <span className="font-mono font-medium">
                          #{order.number}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {order.customerName ?? order.customerId}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 2 && selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
                <p className="text-xs text-muted-foreground mb-0.5">Pedido seleccionado</p>
                <p className="font-medium">
                  #{selectedOrder.number} — {selectedOrder.customerName ?? selectedOrder.customerId}
                </p>
              </div>

              <div>
                <Label htmlFor="dn-number" className="text-sm font-medium block mb-1.5">
                  Número <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="dn-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="00001"
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresá el número de remito (ej: 00001)
                </p>
              </div>

              <div>
                <Label htmlFor="dn-sales-point" className="text-sm font-medium block mb-1.5">
                  Punto de venta
                </Label>
                <Input
                  id="dn-sales-point"
                  value={salesPoint}
                  onChange={(e) => setSalesPoint(e.target.value)}
                  placeholder="00001"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="dn-issue-date" className="text-sm font-medium block mb-1.5">
                  Fecha de emisión
                </Label>
                <Input
                  id="dn-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="dn-warehouse" className="text-sm font-medium block mb-1.5">
                  Depósito
                </Label>
                <select
                  id="dn-warehouse"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin depósito</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
          {step === 2 ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                Crear remito
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
