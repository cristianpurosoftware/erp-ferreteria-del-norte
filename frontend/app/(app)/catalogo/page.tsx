"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { Package, Plus, Tag, DollarSign } from "lucide-react";
import { getProducts, getProductsQuery } from "@/lib/actions/products";
import { getBrands, getCategories } from "@/lib/actions/settings";
import { getSuppliers } from "@/lib/actions/purchases";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product, ProductStatus } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { ProductForm } from "@/components/forms/product-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusLabels: Record<ProductStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  inactive: "Inactivo",
  discontinued: "Descontinuado",
};

const statusColors: Record<ProductStatus, string> = {
  draft: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  active: "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  discontinued: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_OPTIONS = (Object.keys(statusLabels) as ProductStatus[]).map((s) => ({
  label: statusLabels[s],
  value: s,
}));

const TYPE_OPTIONS = Object.keys(PRODUCT_TYPE_LABELS).map((t) => ({
  label: PRODUCT_TYPE_LABELS[t],
  value: t,
}));

export default function CatalogoPage() {
  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | undefined>();
  const [brands, setBrands] = React.useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = React.useState<Array<{ id: string; name: string }>>([]);

  // Reference data — loaded once.
  React.useEffect(() => {
    Promise.all([
      getBrands(),
      getCategories(),
      getSuppliers({ limit: 500 }),
      getProducts({ status: "active", limit: 1 }),
    ]).then(([b, c, s, active]) => {
      setBrands(b.items ?? b);
      setCategories(c.items ?? c);
      setSuppliers(s.items.map((sup) => ({ id: sup.id, name: sup.name })));
      setActiveCount(active.meta.total);
    });
  }, []);

  const categoryOptions = React.useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories],
  );

  const brandOptions = React.useMemo(
    () => brands.map((b) => ({ label: b.name, value: b.id })),
    [brands],
  );

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por nombre, SKU o descripción...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: ({ column }) => <DataTableColumnHeader column={column} label="SKU" />,
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sku ?? "—"}</span>,
        meta: { label: "SKU" },
        size: 80,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Producto" />,
        cell: ({ row }) => (
          <div>
            <Link href={`/catalogo/${row.original.id}`} className="font-medium hover:underline">
              {row.original.name}
            </Link>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</p>
            )}
          </div>
        ),
        meta: { label: "Producto" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {statusLabels[row.original.status]}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "productType",
        accessorKey: "productType",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {PRODUCT_TYPE_LABELS[row.original.productType] ?? row.original.productType}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "categoryId",
        accessorKey: "categoryId",
        header: "Categoría",
        cell: ({ row }) => {
          const c = categories.find((x) => x.id === row.original.categoryId);
          return <span className="text-xs text-muted-foreground">{c?.name ?? "—"}</span>;
        },
        meta: { label: "Categoría", variant: "multiSelect", options: categoryOptions },
        enableColumnFilter: true,
      },
      {
        id: "brandId",
        accessorKey: "brandId",
        header: "Marca",
        cell: ({ row }) => {
          const b = brands.find((x) => x.id === row.original.brandId);
          return <span className="text-xs text-muted-foreground">{b?.name ?? "—"}</span>;
        },
        meta: { label: "Marca", variant: "multiSelect", options: brandOptions },
        enableColumnFilter: true,
      },
      {
        id: "baseCost",
        accessorKey: "baseCost",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Costo" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm text-muted-foreground block">
            {formatMoney(row.original.baseCost)}
          </span>
        ),
        meta: { label: "Costo", icon: DollarSign },
      },
      {
        id: "basePrice",
        accessorKey: "basePrice",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Precio" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(row.original.basePrice)}
          </span>
        ),
        meta: { label: "Precio", icon: DollarSign },
      },
      {
        id: "margin",
        accessorFn: (row) => row.basePrice > 0 ? (row.basePrice - row.baseCost) / row.basePrice * 100 : 0,
        header: "Margen",
        cell: ({ row }) => {
          const p = row.original;
          const margin = p.basePrice > 0 ? ((p.basePrice - p.baseCost) / p.basePrice * 100) : 0;
          return (
            <span className={cn("text-right tabular-nums text-sm block", margin < 20 ? "text-red-500" : "text-p3")}>
              {margin.toFixed(1)}%
            </span>
          );
        },
        meta: { label: "Margen" },
        enableSorting: false,
      },
    ],
    [categories, brands, categoryOptions, brandOptions],
  );

  const { table } = useDataTable({
    data: products,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false, categoryId: false, brandId: false },
      sorting: [{ id: "name", desc: false }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const state = table.getState();
  const stateKey = JSON.stringify({
    p: state.pagination,
    s: state.sorting,
    f: state.columnFilters,
  });

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    const params = buildListQuery({
      pagination: state.pagination,
      sorting: state.sorting,
      filters: state.columnFilters,
    });
    return getProductsQuery(params.toString())
      .then((r) => {
        setProducts(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const refetch = fetchPage;

  const exportRows = buildExportRows(table, (p) => [
    p.sku ?? "",
    p.name,
    statusLabels[p.status] ?? p.status,
    PRODUCT_TYPE_LABELS[p.productType] ?? p.productType,
    String(Number(p.baseCost)),
    String(Number(p.basePrice)),
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Package className="size-6 text-p3" />
                Catálogo de Productos
                <PageHelpTooltip content={SCREEN_HELP.catalogo} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} productos · {activeCount} activos
              </p>
            </div>
            <Button size="sm" className="h-9 gap-1.5" onClick={() => { setEditProduct(undefined); setDrawerOpen(true); }}>
              <Plus className="size-4" />
              Nuevo Producto
            </Button>
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={8}>
            <ExportButton
              headers={["SKU", "Producto", "Estado", "Tipo", "Costo", "Precio"]}
              {...exportRows}
              filename="catalogo"
            />
          </ERPDataTable>
        </div>
      </div>

      <ProductForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setEditProduct(undefined); refetch(); }
        }}
        product={editProduct}
        brands={brands as never}
        categories={categories as never}
        suppliers={suppliers}
      />
    </>
  );
}
