import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSalesZoneById,
  getSalesZones,
} from "@/lib/actions/sales-zones";
import { getCustomers } from "@/lib/actions/customers";
import { getRoutes } from "@/lib/actions/routes";
import { CUSTOMER_STATUS_LABELS } from "@/lib/types";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let zone;
  try {
    zone = await getSalesZoneById(id);
  } catch {
    notFound();
  }
  if (!zone) notFound();

  const [allZones, customersRes, routesRes] = await Promise.all([
    getSalesZones({ limit: 500 }),
    getCustomers({ zoneId: id, limit: 100 }),
    getRoutes({ zoneId: id, limit: 100 }),
  ]);

  const subZones = allZones.items.filter((z) => z.parentZoneId === id);
  const parent = zone.parentZoneId
    ? allZones.items.find((z) => z.id === zone.parentZoneId)
    : null;

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link
            href="/comercial/zonas"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a zonas
          </Link>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <MapPin className="size-6 text-p3" />
                {zone.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                {zone.code}
              </p>
            </div>
            <Badge variant={zone.status === "active" ? "default" : "outline"}>
              {zone.status === "active" ? "Activa" : "Inactiva"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Zona padre
            </p>
            <p className="text-sm font-medium mt-1">
              {parent ? (
                <Link
                  href={`/comercial/zonas/${parent.id}`}
                  className="hover:underline"
                >
                  {parent.code} — {parent.name}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Sub-zonas / Rutas / Clientes
            </p>
            <p className="text-sm font-medium mt-1">
              {subZones.length} sub &middot; {routesRes.items.length} rutas &middot;{" "}
              {customersRes.items.length} clientes
            </p>
          </div>
        </div>

        {subZones.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2">Sub-zonas</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subZones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-mono text-sm">
                        <Link
                          href={`/comercial/zonas/${z.id}`}
                          className="hover:underline"
                        >
                          {z.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{z.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            z.status === "active" ? "default" : "outline"
                          }
                        >
                          {z.status === "active" ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <UsersIcon className="size-4 text-p3" />
            Clientes asignados ({customersRes.items.length})
          </h2>
          {customersRes.items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 rounded-xl border border-dashed">
              Aún no hay clientes en esta zona.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersRes.items.slice(0, 50).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/clientes/${c.id}`}
                          className="text-sm hover:underline"
                        >
                          {c.commercialName || c.legalName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {CUSTOMER_STATUS_LABELS[c.status] ?? c.status}
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
