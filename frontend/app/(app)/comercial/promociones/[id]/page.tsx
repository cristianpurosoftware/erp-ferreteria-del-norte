"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Tag,
  Pencil,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { PromotionForm } from "@/components/forms/promotion-form";
import {
  getPromotionById,
  activatePromotion,
  expirePromotion,
  cancelPromotion,
  removePromotionItem,
  addPromotionItem,
} from "@/lib/actions/promotions";
import { getActiveProducts } from "@/lib/actions/products";
import { getSalesZones } from "@/lib/actions/sales-zones";
import type { Promotion, SalesZone, Product } from "@/lib/types";
import {
  PROMOTION_KIND_LABELS,
  PROMOTION_STATUS_LABELS,
  CUSTOMER_CATEGORY_LABELS,
} from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PromocionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [zones, setZones] = useState<SalesZone[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [itemDialog, setItemDialog] = useState(false);
  const [itemForm, setItemForm] = useState({ productId: "", discountPct: "", discountAmount: "", buyQty: "", getQty: "", overridePrice: "" });

  const id = params.id;

  const refetch = useCallback(async () => {
    const p = await getPromotionById(id);
    setPromo(p);
  }, [id]);

  useEffect(() => {
    Promise.all([getPromotionById(id), getSalesZones({ limit: 500 }), getActiveProducts()])
      .then(([p, z, pr]) => {
        setPromo(p);
        setZones(z.items);
        setProducts(pr.items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addItem = async () => {
    if (!itemForm.productId) return;
    setActing("addItem");
    try {
      const data: Record<string, unknown> = { productId: itemForm.productId };
      if (itemForm.discountPct) data.discountPct = Number(itemForm.discountPct);
      if (itemForm.discountAmount) data.discountAmount = Number(itemForm.discountAmount);
      if (itemForm.buyQty) data.buyQty = Number(itemForm.buyQty);
      if (itemForm.getQty) data.getQty = Number(itemForm.getQty);
      if (itemForm.overridePrice) data.overridePrice = Number(itemForm.overridePrice);
      await addPromotionItem(id, data);
      toast.success("Ítem agregado");
      setItemDialog(false);
      setItemForm({ productId: "", discountPct: "", discountAmount: "", buyQty: "", getQty: "", overridePrice: "" });
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(null);
    }
  };

  const doAction = async (
    key: string,
    fn: (id: string) => Promise<Promotion>,
    successMsg: string
  ) => {
    setActing(key);
    try {
      await fn(id);
      toast.success(successMsg);
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setActing(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("¿Quitar este ítem?")) return;
    try {
      await removePromotionItem(id, itemId);
      toast.success("Ítem eliminado");
      await refetch();
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "",
      });
    }
  };

  if (loading || !promo) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const items = promo.items ?? [];
  const statusColor =
    promo.status === "active"
      ? "bg-p3 text-white"
      : promo.status === "expired"
        ? "bg-yellow-100 text-yellow-900"
        : promo.status === "cancelled"
          ? "bg-red-100 text-red-900"
          : "bg-gray-100 text-gray-800";

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <Link
              href="/comercial/promociones"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Volver a promociones
            </Link>
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <Tag className="size-6 text-p3" />
                  {promo.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                  {promo.code}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full",
                    statusColor
                  )}
                >
                  {PROMOTION_STATUS_LABELS[promo.status]}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {promo.status === "draft" && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!!acting}
                onClick={() =>
                  doAction("activate", activatePromotion, "Promoción activada")
                }
              >
                <CheckCircle className="size-3.5" />
                Activar
              </Button>
            )}
            {promo.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!!acting}
                onClick={() =>
                  doAction("expire", expirePromotion, "Promoción vencida")
                }
              >
                <Clock className="size-3.5" />
                Vencer
              </Button>
            )}
            {(promo.status === "draft" || promo.status === "active") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                disabled={!!acting}
                onClick={() =>
                  doAction("cancel", cancelPromotion, "Promoción cancelada")
                }
              >
                <XCircle className="size-3.5" />
                Cancelar
              </Button>
            )}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Tipo</p>
              <p className="text-sm font-medium mt-1">
                {PROMOTION_KIND_LABELS[promo.kind] ?? promo.kind}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">
                Vigencia
              </p>
              <p className="text-sm font-medium mt-1">
                {promo.validFrom ? promo.validFrom.slice(0, 10) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {promo.validTo ? `hasta ${promo.validTo.slice(0, 10)}` : "abierta"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">Canal</p>
              <p className="text-sm font-medium mt-1">
                {promo.channel ?? "Todos"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground uppercase">
                Segmento
              </p>
              <p className="text-sm font-medium mt-1">
                {promo.customerCategory
                  ? CUSTOMER_CATEGORY_LABELS[promo.customerCategory]
                  : "Todas"}
              </p>
              <p className="text-xs text-muted-foreground">
                Zona:{" "}
                {promo.zoneId
                  ? zones.find((z) => z.id === promo.zoneId)?.name ?? "—"
                  : "Todas"}
              </p>
            </div>
          </div>

          {/* Items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">
                Ítems de la promoción ({items.length})
              </h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setItemDialog(true)}>
                <Plus className="size-3.5" />
                Agregar ítem
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 rounded-xl border border-dashed">
                Sin ítems. Editá la promoción para agregar productos o categorías
                afectadas.
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Producto / Categoría</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>Regla</TableHead>
                      <TableHead>Precio override</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm">
                          {it.productName ?? it.categoryName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {it.discountPct
                            ? `${it.discountPct}%`
                            : it.discountAmount
                              ? formatMoney(Number(it.discountAmount))
                              : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {it.buyQty && it.getQty
                            ? `Lleva ${it.buyQty + it.getQty} paga ${it.buyQty}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {it.overridePrice
                            ? formatMoney(Number(it.overridePrice))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleRemoveItem(it.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>

      <PromotionForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) refetch();
        }}
        promotion={promo}
        zones={zones}
      />

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar ítem a la promoción</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Producto *</label>
              <select value={itemForm.productId} onChange={(e) => setItemForm((p) => ({ ...p, productId: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Seleccioná un producto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ""}{p.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Completá uno de los campos según el tipo de promoción.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Descuento %</label><Input type="number" min={0} max={100} step={0.01} value={itemForm.discountPct} onChange={(e) => setItemForm((p) => ({ ...p, discountPct: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Descuento $</label><Input type="number" min={0} step={0.01} value={itemForm.discountAmount} onChange={(e) => setItemForm((p) => ({ ...p, discountAmount: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Lleva N</label><Input type="number" min={0} value={itemForm.buyQty} onChange={(e) => setItemForm((p) => ({ ...p, buyQty: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Paga M</label><Input type="number" min={0} value={itemForm.getQty} onChange={(e) => setItemForm((p) => ({ ...p, getQty: e.target.value }))} className="h-9 text-sm" /></div>
              <div className="col-span-2"><label className="text-sm font-medium block mb-1.5">Precio fijo (override)</label><Input type="number" min={0} step={0.01} value={itemForm.overridePrice} onChange={(e) => setItemForm((p) => ({ ...p, overridePrice: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button>
            <Button onClick={addItem} disabled={!itemForm.productId || acting === "addItem"}>{acting === "addItem" && <Loader2 className="size-4 mr-2 animate-spin" />}Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
