import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ShoppingBag, AlertTriangle } from "lucide-react";
import { getPurchaseOrderById, getSupplierById } from "@/lib/actions/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PurchaseOrderStatus } from "@/lib/types";
import { EditPurchaseOrderButton } from "./edit-button";

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Borrador", color: "text-gray-500", bgColor: "bg-gray-500/10" },
  requested: { label: "Solicitada", color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  approved: { label: "Aprobada", color: "text-blue-600", bgColor: "bg-blue-500/10" },
  sent: { label: "Enviada", color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
  partially_received: { label: "Recepcion parcial", color: "text-purple-600", bgColor: "bg-purple-500/10" },
  received: { label: "Recibida", color: "text-p3", bgColor: "bg-p3/10" },
  cancelled: { label: "Cancelada", color: "text-red-500", bgColor: "bg-red-500/10" },
};

const EDITABLE_STATUSES = new Set(["draft", "requested"]);

export default async function CompraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let po;
  try {
    po = await getPurchaseOrderById(id);
  } catch {
    notFound();
  }
  if (!po) notFound();

  const supplier = await getSupplierById(po.supplierId).catch(() => null);
  const st = statusConfig[po.status];
  const invalidCount = po.items?.filter((i) => i.productAvailable === false).length ?? 0;
  const hasInvalid = invalidCount > 0;
  const isEditable = EDITABLE_STATUSES.has(po.status);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/compras"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <ShoppingBag className="size-5 text-p3" />
                Orden de compra
              </h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", st.bgColor, st.color)}>
                {st.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(po.date)} &middot; {supplier?.name ?? "Proveedor eliminado"}
            </p>
          </div>
          <EditPurchaseOrderButton po={po} />
        </div>

        {hasInvalid && isEditable && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                {invalidCount} línea{invalidCount === 1 ? "" : "s"} con producto eliminado o inactivo
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                Editá la OC para reemplazar o quitar los productos no disponibles.
              </p>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Proveedor</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{supplier?.name ?? "—"}</p>
              {supplier?.taxId && <p className="text-muted-foreground font-mono">{supplier.taxId}</p>}
              {supplier?.phone && <p className="text-muted-foreground">{supplier.phone}</p>}
              {supplier?.email && <p className="text-muted-foreground">{supplier.email}</p>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Detalle</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatMoney(po.subtotal)}</span>
              </div>
              {po.taxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="tabular-nums">{formatMoney(po.taxes)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(po.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-base">Items ({po.items?.length ?? 0})</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items?.map((item) => {
                  const valid = item.productAvailable !== false;
                  const label = valid
                    ? (item.productName ?? "Producto eliminado")
                    : (item.productName
                        ? `${item.productName} (no activo)`
                        : "Producto eliminado/no activo");
                  return (
                    <TableRow key={item.id} className={cn(!valid && "bg-amber-500/5")}>
                      <TableCell className="text-sm font-medium">
                        {valid ? (
                          <Link href={`/catalogo/${item.productId}`} className="hover:underline">
                            {label}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">
                            {label}
                            {isEditable && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400 not-italic">
                                — Editá la OC para reemplazarlo o quitarlo
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatMoney(item.unitCost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{formatMoney(item.subtotal)}</TableCell>
                    </TableRow>
                  );
                }) ?? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin items.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Notes */}
        {po.notes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2">Notas</h3>
            <p className="text-sm text-muted-foreground">{po.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
