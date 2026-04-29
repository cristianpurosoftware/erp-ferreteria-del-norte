"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Lock,
  Unlock,
  Loader2,
  AlertTriangle,
  Clock,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  getLotById,
  getStockByLot,
  blockLot,
  unblockLot,
} from "@/lib/actions/lots";
import { getStockMovements } from "@/lib/actions/inventory";
import { getWarehouses } from "@/lib/actions/settings";
import { getWarehouseLocations } from "@/lib/actions/warehouse-locations";
import type {
  Lot,
  StockByLot,
  StockMovement,
  Warehouse,
  WarehouseLocation,
} from "@/lib/types";
import { LOT_STATUS_LABELS, MOVEMENT_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function LoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(null);
  const [stockRows, setStockRows] = useState<StockByLot[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const id = params.id;

  const refetch = useCallback(async () => {
    const l = await getLotById(id);
    setLot(l);
    const sbl = await getStockByLot({ productId: l.productId });
    setStockRows(sbl.filter((row) => row.lotId === id));
  }, [id]);

  useEffect(() => {
    getLotById(id)
      .then(async (l) => {
        setLot(l);
        const [sbl, mv, wh, loc] = await Promise.all([
          getStockByLot({ productId: l.productId }),
          getStockMovements({ lotId: id, limit: 100 }).catch(() => ({
            items: [],
          })),
          getWarehouses(),
          getWarehouseLocations({ limit: 500 }),
        ]);
        setStockRows(sbl.filter((row) => row.lotId === id));
        setMovements(
          (mv.items as StockMovement[]).filter((m) => m.lotId === id)
        );
        setWarehouses(wh.items);
        setLocations(loc.items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const doAction = async (
    key: string,
    fn: (id: string) => Promise<Lot>,
    msg: string
  ) => {
    setActing(key);
    try {
      await fn(id);
      toast.success(msg);
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

  if (loading || !lot) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const days = daysUntil(lot.expirationDate);
  const totalQty = stockRows.reduce((s, r) => s + Number(r.qty), 0);
  const isExpiring = days !== null && days >= 0 && days <= 30;
  const isExpired = days !== null && days < 0;

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link
            href="/stock"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a stock
          </Link>
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Package className="size-6 text-p3" />
                Lote {lot.code}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lot.productName ?? "Producto eliminado"}
                {lot.productSku && <> · SKU {lot.productSku}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={lot.status === "active" ? "default" : "outline"}
                className={cn(
                  lot.status === "blocked" && "bg-red-500/10 text-red-600 border-red-500/20",
                  lot.status === "expired" && "bg-orange-500/10 text-orange-600 border-orange-500/20"
                )}
              >
                {LOT_STATUS_LABELS[lot.status]}
              </Badge>
              {lot.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!!acting}
                  onClick={() =>
                    doAction("block", blockLot, "Lote bloqueado")
                  }
                >
                  {acting === "block" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  Bloquear
                </Button>
              )}
              {lot.status === "blocked" && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!!acting}
                  onClick={() =>
                    doAction("unblock", unblockLot, "Lote desbloqueado")
                  }
                >
                  {acting === "unblock" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                  Desbloquear
                </Button>
              )}
            </div>
          </div>
        </div>

        {(isExpiring || isExpired) && (
          <div
            className={cn(
              "rounded-xl border p-3 flex items-center gap-2 text-sm",
              isExpired
                ? "border-red-500/40 bg-red-500/5 text-red-700"
                : "border-orange-500/40 bg-orange-500/5 text-orange-700"
            )}
          >
            <AlertTriangle className="size-4" />
            {isExpired
              ? `Vencido hace ${Math.abs(days!)} días.`
              : `Vence en ${days} días.`}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase">Fabricado</p>
            <p className="text-sm font-medium mt-1">
              {lot.manufactureDate ? lot.manufactureDate.slice(0, 10) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase">Vence</p>
            <p className="text-sm font-medium mt-1">
              {lot.expirationDate ? lot.expirationDate.slice(0, 10) : "—"}
            </p>
            {days !== null && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="size-3" />
                {days < 0 ? `hace ${Math.abs(days)}d` : `en ${days}d`}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase">Proveedor</p>
            <p className="text-sm font-medium mt-1">
              {lot.supplierName ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase">
              Stock total
            </p>
            <p className="text-lg font-semibold mt-1 tabular-nums">
              {totalQty}
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold mb-2">Stock por ubicación</h2>
          {stockRows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 rounded-xl border border-dashed">
              Sin stock registrado para este lote.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Depósito</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((row) => {
                    const wh = warehouses.find((w) => w.id === row.warehouseId);
                    const loc = row.locationId
                      ? locations.find((l) => l.id === row.locationId)
                      : null;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">
                          {wh?.name ?? "Depósito eliminado"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {loc?.code ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {Number(row.qty)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Movimientos</h2>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 rounded-xl border border-dashed">
              Sin movimientos registrados.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(m.date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {MOVEMENT_TYPE_LABELS[m.type] ?? m.type}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.reasonCode ?? m.reason ?? "—"}
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
  );
}
