import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Circle,
  CheckCircle2,
  Package,
  Truck,
  Clock,
  XCircle,
  ShieldCheck,
  ClipboardCheck,
  BoxIcon,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOrderByIdentifier } from "@/lib/actions/orders";
import { getPickingTasks } from "@/lib/actions/picking";
import { getShipments } from "@/lib/actions/shipments";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";
import {
  PICKING_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STOP_STATUS_LABELS,
} from "@/lib/types";
import { OrderActions } from "@/components/orders/order-actions";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Circle; color: string; bgColor: string }> = {
  draft: { label: "Borrador", icon: Circle, color: "text-gray-500", bgColor: "bg-gray-500/10" },
  pending_confirmation: { label: "Pendiente", icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  confirmed: { label: "Confirmado", icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-500/10" },
  rejected: { label: "Rechazado", icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  stock_reserved: { label: "Stock reservado", icon: ShieldCheck, color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
  in_preparation: { label: "En preparación", icon: Package, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  ready_to_dispatch: { label: "Listo para despacho", icon: ClipboardCheck, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
  dispatched: { label: "Despachado", icon: Truck, color: "text-p4", bgColor: "bg-p4/10" },
  delivered: { label: "Entregado", icon: BoxIcon, color: "text-p3", bgColor: "bg-p3/10" },
  completed: { label: "Completado", icon: CheckCircle2, color: "text-p3", bgColor: "bg-p3/15" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
};

const workflow: OrderStatus[] = [
  "draft",
  "pending_confirmation",
  "confirmed",
  "stock_reserved",
  "in_preparation",
  "ready_to_dispatch",
  "dispatched",
  "delivered",
  "completed",
];

function formatOrderNumber(number: number, id: string): string {
  return number > 0 ? String(number) : id.slice(0, 8);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PedidoDetallePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;

  let order;
  try {
    order = await getOrderByIdentifier(identifier);
  } catch {
    notFound();
  }

  if (!order) notFound();

  // Canonical URL is /pedidos/<number>; redirect if entered with UUID
  if (UUID_RE.test(identifier) && order.number > 0) {
    redirect(`/pedidos/${order.number}`);
  }

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;
  const currentIdx = workflow.indexOf(order.status);
  const displayNumber = formatOrderNumber(order.number, order.id);

  // Fase 1–3: logistics linkage
  const [pickingRes, shipmentRes] = await Promise.all([
    getPickingTasks({ orderId: order.id, limit: 5 }).catch(() => ({ items: [] })),
    order.shipmentId
      ? getShipments({ limit: 1 }).then((r) => ({ items: r.items.filter((s) => s.id === order.shipmentId) })).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
  ]);
  const pickingTask = pickingRes.items[0] ?? null;
  const shipment = shipmentRes.items[0] ?? null;
  const shipmentStop = shipment?.stops?.find((s) => s.orderId === order.id) ?? null;
  const showLogistics = pickingTask || shipment;

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/pedidos"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Pedido {displayNumber}</h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1", config.bgColor, config.color)}>
                <StatusIcon className="size-3" />
                {config.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(order.createdAt)}
              {order.channel ? ` · ${order.channel}` : ""}
            </p>
          </div>
          <OrderActions orderId={order.id} status={order.status} customerId={order.customerId} />
        </div>

        {/* Logística (Fase 3) */}
        {showLogistics && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <Truck className="size-4 text-muted-foreground" />
              Logística
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pickingTask && (
                <Link
                  href={`/logistica/picking/${pickingTask.id}`}
                  className="rounded-lg border border-border bg-background p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <ClipboardList className="size-3.5" />
                    Picking
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {PICKING_STATUS_LABELS[pickingTask.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {pickingTask.assignedToName ?? "Sin asignar"}
                  </p>
                </Link>
              )}
              {shipment && (
                <Link
                  href={`/logistica/envios/${shipment.id}`}
                  className="rounded-lg border border-border bg-background p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Truck className="size-3.5" />
                    Envío
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {SHIPMENT_STATUS_LABELS[shipment.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {shipment.vehiclePlate ?? "—"}
                    {shipment.driverName ? ` · ${shipment.driverName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shipment.plannedDate.slice(0, 10)}
                  </p>
                </Link>
              )}
              {shipmentStop && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <MapPin className="size-3.5" />
                    Parada #{shipmentStop.sequence}
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {SHIPMENT_STOP_STATUS_LABELS[shipmentStop.status]}
                  </Badge>
                  {shipmentStop.plannedWindow && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Horario: {shipmentStop.plannedWindow}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {order.status !== "cancelled" && order.status !== "rejected" && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-4">Progreso del pedido</h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {workflow.map((step, i) => {
                const stepConfig = statusConfig[step];
                const stepIdx = workflow.indexOf(step);
                const isActive = stepIdx <= currentIdx;
                const isCurrent = step === order.status;
                const StepIcon = stepConfig.icon;
                return (
                  <div key={step} className="flex items-center flex-1 min-w-[60px]">
                    <div className="flex flex-col items-center flex-1">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center border-2 transition-colors",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-muted bg-muted text-muted-foreground"
                      )}>
                        <StepIcon className="size-3.5" />
                      </div>
                      <span className={cn("text-[10px] mt-1 text-center leading-tight", isCurrent ? "font-medium" : "text-muted-foreground")}>
                        {stepConfig.label}
                      </span>
                    </div>
                    {i < workflow.length - 1 && (
                      <div className={cn(
                        "h-0.5 flex-1 -mx-1 mt-[-18px]",
                        stepIdx < currentIdx ? "bg-primary/50" : "bg-muted"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled/Rejected banner */}
        {(order.status === "cancelled" || order.status === "rejected") && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            Este pedido fue {order.status === "cancelled" ? "cancelado" : "rechazado"}.
          </div>
        )}

        {/* Order info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Cliente</h3>
            <div className="space-y-2 text-sm">
              <div>
                <Link href={`/clientes/${order.customerId}`} className="font-medium hover:underline">
                  {order.customerName ?? "Cliente eliminado"}
                </Link>
              </div>
              {order.sellerId && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Vendedor</span>
                  <span>{order.sellerName ?? "Vendedor eliminado"}</span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Información</h3>
            <div className="space-y-2 text-sm">
              {order.channel && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Canal</span>
                  <span className="capitalize">{order.channel}</span>
                </div>
              )}
              {order.estimatedDeliveryDate && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega estimada</span>
                  <span>{formatDate(order.estimatedDeliveryDate)}</span>
                </div>
              )}
              {order.branchId && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Sucursal</span>
                  <span>{order.branchName ?? "Sucursal eliminada"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-base">Productos ({order.items?.length ?? 0})</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link href={`/catalogo/${item.productId}`} className="hover:underline">
                        {item.productName ?? "Producto eliminado"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(item.quantity) % 1 === 0 ? Number(item.quantity).toFixed(0) : item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {Number(item.discount) > 0 ? formatMoney(Number(item.discount)) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(item.subtotal)}</TableCell>
                  </TableRow>
                )) ?? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin items.</TableCell>
                  </TableRow>
                )}
                {order.items && order.items.length > 0 && (
                  <>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">Subtotal</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatMoney(order.subtotal)}</TableCell>
                    </TableRow>
                    {order.taxes > 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">Impuestos</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatMoney(order.taxes)}</TableCell>
                      </TableRow>
                    )}
                    {order.discounts > 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">Descuentos</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-p3">-{formatMoney(order.discounts)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="hover:bg-transparent font-semibold">
                      <TableCell colSpan={4} className="text-right">Total</TableCell>
                      <TableCell className="text-right tabular-nums text-lg">{formatMoney(order.total)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2">Notas</h3>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
