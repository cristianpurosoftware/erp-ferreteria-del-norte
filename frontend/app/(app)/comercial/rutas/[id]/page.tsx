"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Route as RouteIcon,
  Plus,
  Trash2,
  MapPin,
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
import { RouteVisitForm } from "@/components/forms/route-visit-form";
import { CustomerVisitForm } from "@/components/forms/customer-visit-form";
import {
  getRouteById,
  getRouteVisits,
  removeRouteVisit,
} from "@/lib/actions/routes";
import type { Route, RouteVisit } from "@/lib/types";
import {
  ROUTE_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  VISIT_WINDOW_LABELS,
} from "@/lib/types";

export default function RutaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null>(null);
  const [visits, setVisits] = useState<RouteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [registerVisitOpen, setRegisterVisitOpen] = useState(false);

  const id = params.id;

  const refetch = useCallback(async () => {
    const [r, v] = await Promise.all([
      getRouteById(id),
      getRouteVisits(id),
    ]);
    setRoute(r);
    setVisits(v);
  }, [id]);

  useEffect(() => {
    Promise.all([getRouteById(id), getRouteVisits(id)])
      .then(([r, v]) => { setRoute(r); setVisits(v); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRemoveVisit = async (visitId: string) => {
    if (!confirm("¿Quitar esta visita de la ruta?")) return;
    try {
      await removeRouteVisit(id, visitId);
      toast.success("Visita eliminada");
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error al eliminar", {
        description: err instanceof Error ? err.message : "",
      });
    }
  };

  if (loading || !route) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sortedVisits = [...visits].sort((a, b) => a.sequence - b.sequence);
  const nextSequence =
    sortedVisits.length > 0
      ? Math.max(...sortedVisits.map((v) => v.sequence)) + 1
      : 1;

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <Link
              href="/comercial/rutas"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Volver a rutas
            </Link>
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <RouteIcon className="size-6 text-p3" />
                  {route.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                  {route.code}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setRegisterVisitOpen(true)}
                >
                  <MapPin className="size-4" />
                  Registrar visita
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddVisitOpen(true)}
                >
                  <Plus className="size-4" />
                  Agregar parada
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Frecuencia
              </p>
              <p className="text-sm font-medium mt-1">
                {ROUTE_FREQUENCY_LABELS[route.frequency] ?? route.frequency}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {route.weekdays && route.weekdays.length > 0
                  ? route.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
                  : "Sin días asignados"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Vendedor
              </p>
              <p className="text-sm font-medium mt-1">
                {route.defaultSellerName ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Chofer
              </p>
              <p className="text-sm font-medium mt-1">
                {route.defaultDriverName ?? "—"}
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-2">
              Paradas ({sortedVisits.length})
            </h2>
            {sortedVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 rounded-xl border border-dashed">
                No hay paradas asignadas.
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedVisits.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">
                          {v.sequence}
                        </TableCell>
                        <TableCell>
                          {v.customerName ? (
                            <Link
                              href={`/clientes/${v.customerId}`}
                              className="text-sm hover:underline"
                            >
                              {v.customerName}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {v.customerId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {v.visitWindow
                              ? VISIT_WINDOW_LABELS[v.visitWindow]
                              : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleRemoveVisit(v.id)}
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

      <RouteVisitForm
        open={addVisitOpen}
        onOpenChange={(open) => {
          setAddVisitOpen(open);
          if (!open) refetch();
        }}
        routeId={id}
        nextSequence={nextSequence}
      />

      <CustomerVisitForm
        open={registerVisitOpen}
        onOpenChange={(open) => {
          setRegisterVisitOpen(open);
          if (!open) router.refresh();
        }}
        routeId={id}
      />
    </>
  );
}
