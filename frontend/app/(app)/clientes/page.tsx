"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Tag,
  DollarSign,
  ShieldCheck,
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  getCustomersQuery,
  getCustomersSummary,
  activateCustomer,
  blockCustomer,
  unblockCustomer,
  deleteCustomer,
} from "@/lib/actions/customers";
import { getTeam } from "@/lib/actions/team";
import { getSalesZones } from "@/lib/actions/sales-zones";
import { getRoutes } from "@/lib/actions/routes";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import type {
  Customer,
  CustomerStatus,
  User,
  SalesZone,
  Route,
} from "@/lib/types";
import { CREDIT_POLICY_LABELS, CUSTOMER_STATUS_LABELS } from "@/lib/types";
import { CustomerForm } from "@/components/forms/customer-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { toast } from "sonner";

const statusColors: Record<CustomerStatus, string> = {
  draft:    "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  active:   "bg-p3/10 text-p4 dark:text-p2",
  on_hold:  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  blocked:  "bg-red-500/10 text-red-600 dark:text-red-400",
  inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  archived: "bg-gray-500/10 text-gray-500 dark:text-gray-500",
};

const STATUS_OPTIONS = (Object.keys(CUSTOMER_STATUS_LABELS) as CustomerStatus[]).map((s) => ({
  label: CUSTOMER_STATUS_LABELS[s],
  value: s,
}));

const CATEGORY_OPTIONS = [
  { label: "Categoría A", value: "A" },
  { label: "Categoría B", value: "B" },
  { label: "Categoría C", value: "C" },
];

const FERRETERIA_DEMO_SCOPES = new Set([
  "ferreteria",
  "ferreteria-demo",
  "hardware-store",
  "pos-demo",
  "sales-demo",
]);

export default function ClientesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0);
  const [sellers, setSellers] = React.useState<User[]>([]);
  const [zones, setZones] = React.useState<SalesZone[]>([]);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editCustomer, setEditCustomer] = React.useState<Customer | undefined>();

  // Reference data — loaded once.
  React.useEffect(() => {
    Promise.all([
      getTeam({ limit: 500 }),
      getSalesZones({ limit: 500 }),
      getRoutes({ limit: 500 }),
    ]).then(([t, z, r]) => {
      setSellers(t.items);
      setZones(z.items);
      setRoutes(r.items);
    });
  }, []);

  const zoneOptions = React.useMemo(
    () => zones.map((z) => ({ label: z.code, value: z.id })),
    [zones],
  );
  const isFerreteriaDemoScope = FERRETERIA_DEMO_SCOPES.has((process.env.NEXT_PUBLIC_DEMO_SCOPE ?? "").toLowerCase());

  const columns = React.useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por nombre, razón social o CUIT...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "legalName",
        accessorFn: (row) => row.commercialName || row.legalName,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div>
              <Link href={`/clientes/${c.id}`} className="font-medium text-sm hover:underline">
                {c.commercialName || c.legalName}
              </Link>
              {c.commercialName && <p className="text-xs text-muted-foreground">{c.legalName}</p>}
            </div>
          );
        },
        meta: { label: "Cliente" },
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Categoría",
        cell: ({ row }) => row.original.category
          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">{row.original.category}</span>
          : <span className="text-xs text-muted-foreground">—</span>,
        meta: { label: "Categoría", variant: "multiSelect", options: CATEGORY_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "taxId",
        accessorKey: "taxId",
        header: "ID Fiscal",
        cell: ({ row }) => <span className="text-sm text-muted-foreground font-mono">{row.original.taxId ?? "—"}</span>,
        meta: { label: "ID Fiscal" },
      },
      {
        id: "creditLimit",
        accessorKey: "creditLimit",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Límite crédito" />,
        cell: ({ row }) => (
          <span className="text-right text-sm tabular-nums block">
            {row.original.creditLimit > 0 ? formatMoney(Number(row.original.creditLimit)) : "—"}
          </span>
        ),
        meta: { label: "Límite crédito", icon: DollarSign },
      },
      {
        id: "creditPolicy",
        accessorKey: "creditPolicy",
        header: "Crédito",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              row.original.creditPolicy === "blocked"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : row.original.creditPolicy === "strict"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-p3/10 text-p4 dark:text-p2",
            )}
          >
            {CREDIT_POLICY_LABELS[row.original.creditPolicy] ?? row.original.creditPolicy}
          </span>
        ),
        meta: { label: "Crédito", icon: ShieldCheck },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {CUSTOMER_STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS },
        enableColumnFilter: true,
      },
      ...(!isFerreteriaDemoScope
        ? [
            {
              id: "zoneId",
              accessorKey: "zoneId",
              header: "Zona",
              cell: ({ row }) => {
                const zone = row.original.zoneId ? zones.find((z) => z.id === row.original.zoneId) : null;
                return <span className="text-xs text-muted-foreground">{zone?.code ?? "—"}</span>;
              },
              meta: { label: "Zona", variant: "multiSelect", options: zoneOptions },
              enableColumnFilter: true,
            } satisfies ColumnDef<Customer>,
            {
              id: "routeId",
              accessorKey: "routeId",
              header: "Ruta",
              cell: ({ row }) => {
                const r = row.original.routeId ? routes.find((x) => x.id === row.original.routeId) : null;
                return <span className="text-xs text-muted-foreground">{r?.code ?? "—"}</span>;
              },
              meta: { label: "Ruta", variant: "multiSelect", options: routes.map((r) => ({ label: r.code, value: r.id })) },
              enableColumnFilter: true,
            } satisfies ColumnDef<Customer>,
          ]
        : []),
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/clientes/${c.id}`}>
                      <Eye /> Ver detalle
                    </Link>
                  </DropdownMenuItem>
                  {can("customers:update") && (
                    <DropdownMenuItem onSelect={() => { setEditCustomer(c); setDrawerOpen(true); }}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                  )}
                  {can("customers:update") && c.status !== "active" && (
                    <DropdownMenuItem
                      onSelect={async () => {
                        await activateCustomer(c.id);
                        toast.success("Cliente activado");
                        fetchPageRef.current?.();
                      }}
                    >
                      <CheckCircle2 /> Activar
                    </DropdownMenuItem>
                  )}
                  {can("customers:unblock") && c.status === "blocked" && (
                    <DropdownMenuItem
                      onSelect={async () => {
                        await unblockCustomer(c.id);
                        toast.success("Cliente desbloqueado");
                        fetchPageRef.current?.();
                      }}
                    >
                      <CheckCircle2 /> Desbloquear
                    </DropdownMenuItem>
                  )}
                  {can("customers:block") && c.status !== "blocked" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={async () => {
                          await blockCustomer(c.id);
                          toast.success("Cliente bloqueado");
                          fetchPageRef.current?.();
                        }}
                      >
                        <XCircle /> Bloquear
                      </DropdownMenuItem>
                    </>
                  )}
                  {can("customers:delete") && (
                    <>
                      {!can("customers:block") || c.status === "blocked" ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={async () => {
                          if (!confirm(`¿Eliminar a ${c.commercialName || c.legalName}?`)) return;
                          await deleteCustomer(c.id);
                          toast.success("Cliente eliminado");
                          fetchPageRef.current?.();
                        }}
                      >
                        <Trash2 /> Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [zones, routes, zoneOptions, can, isFerreteriaDemoScope],
  );

  const { table } = useDataTable({
    data: customers,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false, routeId: false },
      sorting: [{ id: "legalName", desc: false }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const state = table.getState();
  const filterParams = React.useMemo(
    () => buildListQuery({
      pagination: state.pagination,
      sorting: state.sorting,
      filters: state.columnFilters,
    }).toString(),
    [state.pagination, state.sorting, state.columnFilters],
  );
  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page"); p.delete("limit"); p.delete("sort");
    return p.toString();
  }, [filterParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getCustomersQuery(filterParams)
      .then((r) => {
        setCustomers(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  React.useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getCustomersSummary(summaryParams)
      .then((s) => setActiveCount(s.byStatus.active ?? 0))
      .catch(() => setActiveCount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (c) => [
    c.commercialName || c.legalName,
    c.legalName,
    c.customerType === "company" ? "Empresa" : "Persona",
    c.taxId ?? "",
    c.email ?? "",
    c.phone ?? "",
    String(c.creditLimit ?? 0),
    CUSTOMER_STATUS_LABELS[c.status] ?? c.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Users className="size-6 text-p3" />
                Clientes
                <PageHelpTooltip content={SCREEN_HELP.clientes} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} clientes · {activeCount} activos
              </p>
            </div>
            {can("customers:create") && (
              <Button size="sm" className="h-9 gap-1.5" onClick={() => { setEditCustomer(undefined); setDrawerOpen(true); }}>
                <Plus className="size-4" />
                Nuevo Cliente
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Nombre", "Razón social", "Tipo", "CUIT", "Email", "Teléfono", "Límite crédito", "Estado"]}
              {...exportRows}
              filename="clientes"
            />
          </ERPDataTable>
        </div>
      </div>

      <CustomerForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setEditCustomer(undefined); void fetchPage(); }
        }}
        customer={editCustomer}
        sellers={sellers.map((s) => ({ id: s.id, first_name: s.first_name, last_name: s.last_name }))}
        zones={zones.map((z) => ({ id: z.id, code: z.code, name: z.name }))}
        routes={routes.map((r) => ({ id: r.id, code: r.code, name: r.name, zoneId: r.zoneId }))}
        hideDistributionFields={isFerreteriaDemoScope}
      />
    </>
  );
}
