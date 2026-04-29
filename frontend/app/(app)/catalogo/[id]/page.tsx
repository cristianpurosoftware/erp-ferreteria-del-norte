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
import {
  ArrowLeft,
  Package,
  TrendingUp,
  Warehouse,
  ShoppingCart,
  Tag,
  AlertTriangle,
  Repeat,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProductById, getProductPrices, getProductOrders } from "@/lib/actions/products";
import { getStockByProduct } from "@/lib/actions/inventory";
import { getLots } from "@/lib/actions/lots";
import { getSuppliers } from "@/lib/actions/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS, LOT_STATUS_LABELS, PRODUCT_STATUS_LABELS } from "@/lib/types";
import type { ProductStatus } from "@/lib/types";

const statusLabels: Record<ProductStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  inactive: "Inactivo",
  discontinued: "Descontinuado",
};

const statusColors: Record<ProductStatus, string> = {
  draft: "text-gray-500",
  active: "text-p3",
  inactive: "text-yellow-600",
  discontinued: "text-red-500",
};

function formatOrderNumber(num: number, id: string): string {
  return num > 0 ? String(num) : id.slice(0, 8);
}

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product;
  try {
    product = await getProductById(id);
  } catch {
    notFound();
  }

  if (!product) notFound();

  const [stockData, pricesData, ordersData, lotsData, suppliersData] = await Promise.all([
    getStockByProduct(id).catch(() => ({ items: [] })),
    getProductPrices(id).catch(() => []),
    getProductOrders(id, 10).catch(() => []),
    getLots({ productId: id, limit: 500 }).catch(() => ({ items: [] })),
    product.preferredSupplierId
      ? getSuppliers({ limit: 500 }).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
  ]);

  const stockItems = (stockData as any)?.items ?? stockData ?? [];
  const prices = pricesData ?? [];
  const orders = ordersData ?? [];
  const lots = lotsData.items;
  const activeLots = lots.filter((l) => l.status === "active");
  const preferredSupplier = product.preferredSupplierId
    ? suppliersData.items.find((s) => s.id === product.preferredSupplierId)
    : null;

  const totalAvailable = Array.isArray(stockItems)
    ? stockItems.reduce((sum: number, s: any) => sum + Number(s.availableQty), 0)
    : 0;
  const isLowStock =
    product.reorderPoint > 0 && totalAvailable < product.reorderPoint;

  const margin = product.basePrice > 0
    ? ((product.basePrice - product.baseCost) / product.basePrice * 100)
    : 0;

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/catalogo"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold">{product.name}</h1>
              <span className={cn("text-xs font-medium", statusColors[product.status])}>
                {statusLabels[product.status]}
              </span>
              {product.tracksLot && (
                <Badge variant="outline" className="gap-1 font-normal">
                  <Layers className="size-3" />
                  Trazabilidad por lote
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="destructive" className="gap-1 font-normal">
                  <AlertTriangle className="size-3" />
                  Stock bajo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {product.sku ?? "Sin SKU"} &middot; {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
            </p>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="size-4" />
              Precios
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo</span>
                <span className="tabular-nums">{formatMoney(product.baseCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio base</span>
                <span className="tabular-nums font-medium">{formatMoney(product.basePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margen</span>
                <span className={cn("tabular-nums font-medium", margin < 20 ? "text-red-500" : "text-p3")}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Package className="size-4" />
              Stock
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Controla stock</span>
                <span>{product.controlsStock ? "Sí" : "No"}</span>
              </div>
              {product.controlsStock && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock mínimo</span>
                  <span className="tabular-nums">{product.minStock}</span>
                </div>
              )}
              {product.unitName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unidad</span>
                  <span>{product.unitName}{product.unitAbbreviation ? ` (${product.unitAbbreviation})` : ""}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Package className="size-4" />
              Detalles
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span>{PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}</span>
              </div>
              {product.categoryId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categoría</span>
                  <span>{product.categoryName ?? "Sin categoría"}</span>
                </div>
              )}
              {product.brandId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marca</span>
                  <span>{product.brandName ?? "Sin marca"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reposición (Fase 2) */}
        {(product.reorderPoint > 0 ||
          product.leadTimeDays > 0 ||
          product.preferredSupplierId) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Repeat className="size-4" />
              Reposición
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Disponible
                </p>
                <p className="mt-1 font-semibold tabular-nums">
                  {totalAvailable}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Punto de reorden
                </p>
                <p
                  className={cn(
                    "mt-1 font-medium tabular-nums",
                    isLowStock && "text-destructive"
                  )}
                >
                  {product.reorderPoint}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Lead time
                </p>
                <p className="mt-1 font-medium">
                  {product.leadTimeDays ? `${product.leadTimeDays} días` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Proveedor preferido
                </p>
                <p className="mt-1 font-medium">
                  {preferredSupplier?.name ?? product.preferredSupplierName ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lotes activos (Fase 2) */}
        {product.tracksLot && activeLots.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-medium text-base flex items-center gap-2">
                <Layers className="size-4 text-orange-500" />
                Lotes activos ({activeLots.length})
              </h3>
              {product.shelfLifeDays && (
                <span className="text-xs text-muted-foreground">
                  Vida útil: {product.shelfLifeDays}d
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Lote</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLots.slice(0, 20).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-sm">
                        <Link
                          href={`/stock/lotes/${l.id}`}
                          className="hover:underline"
                        >
                          {l.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.expirationDate ? l.expirationDate.slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.supplierName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {LOT_STATUS_LABELS[l.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2">Descripción</h3>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>
        )}

        {/* Stock by warehouse */}
        {Array.isArray(stockItems) && stockItems.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium text-base flex items-center gap-2">
                <Warehouse className="size-4 text-blue-500" />
                Stock por depósito
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">En tránsito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.warehouseName ?? "Depósito eliminado"}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(s.availableQty)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{Number(s.reservedQty)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{Number(s.inTransitQty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Price lists */}
        {Array.isArray(prices) && prices.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium text-base flex items-center gap-2">
                <Tag className="size-4 text-purple-500" />
                Listas de precios
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Lista</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Cant. mínima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.priceListName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(Number(p.price))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.minQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Recent orders */}
        {Array.isArray(orders) && orders.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-medium text-base flex items-center gap-2">
                <ShoppingCart className="size-4 text-p3" />
                Últimos pedidos
              </h3>
              <span className="text-xs text-muted-foreground">{orders.length} más recientes</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead># Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/pedidos/${o.number}`} className="font-medium hover:underline">
                          {formatOrderNumber(o.number, o.id)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{o.customerName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{o.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatMoney(Number(o.subtotal))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium text-base">Variantes ({product.variants.length})</h3>
            </div>
            <div className="divide-y">
              {product.variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium font-mono">{v.code}</p>
                    <p className="text-xs text-muted-foreground">{PRODUCT_STATUS_LABELS[v.status] ?? v.status}</p>
                  </div>
                  <div className="text-right text-sm">
                    {v.price !== null && <p className="tabular-nums font-medium">{formatMoney(v.price)}</p>}
                    {v.cost !== null && <p className="tabular-nums text-muted-foreground">{formatMoney(v.cost)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
