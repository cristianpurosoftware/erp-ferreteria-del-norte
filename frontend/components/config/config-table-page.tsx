"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ExtendedColumnSort } from "@/types/data-table";
import { Pencil, Trash2, Plus, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { FormDrawer } from "@/components/forms/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { usePermissions } from "@/hooks/use-permissions";
import type { PaginatedResult } from "@/lib/api/client";

/**
 * Duck-typed check against ApiError. We avoid importing the class itself
 * because it lives in `lib/api/client.ts` alongside `server-only` imports
 * — pulling the class into this "use client" module drags Next's server-only
 * runtime into the browser bundle.
 */
type ApiErrorLike = Error & { status: number; code: string; details?: unknown };

function isApiErrorLike(err: unknown): err is ApiErrorLike {
  return (
    err instanceof Error &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number" &&
    "code" in err
  );
}

function formatApiError(err: unknown, fallback: string): string {
  if (!isApiErrorLike(err)) {
    return err instanceof Error ? err.message || fallback : fallback;
  }
  if (err.status === 403) {
    return "No tenés permisos para realizar esta acción. Pedile a un administrador que actualice tu rol o volvé a iniciar sesión.";
  }
  if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details)) {
    const msgs = (err.details as Array<{ path?: unknown[]; message?: string }>)
      .map((d) => {
        const field = Array.isArray(d.path) && d.path.length > 0 ? String(d.path[d.path.length - 1]) : null;
        return field ? `${field}: ${d.message ?? "valor inválido"}` : d.message ?? "valor inválido";
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(" · ");
  }
  return err.message || fallback;
}

// ─── Field descriptors ───────────────────────────────────────

export type FieldOption = { value: string; label: string };

type FieldCommon = {
  /** When true, the field is rendered only for create, not for edit. */
  createOnly?: boolean;
};

export type FieldDescriptor = FieldCommon &
  (
  | {
      key: string;
      label: string;
      type?: "text";
      required?: boolean;
      placeholder?: string;
      helpText?: string;
    }
  | {
      key: string;
      label: string;
      type: "textarea";
      required?: boolean;
      placeholder?: string;
      helpText?: string;
      rows?: number;
    }
  | {
      key: string;
      label: string;
      type: "number";
      required?: boolean;
      placeholder?: string;
      helpText?: string;
      step?: number;
      min?: number;
      max?: number;
    }
  | {
      key: string;
      label: string;
      type: "select";
      required?: boolean;
      placeholder?: string;
      helpText?: string;
      options: FieldOption[];
    }
  | {
      key: string;
      label: string;
      type: "checkbox";
      helpText?: string;
    }
  | {
      key: string;
      label: string;
      type: "date";
      required?: boolean;
      helpText?: string;
    }
);

// ─── Props ───────────────────────────────────────────────────

interface ConfigTablePageProps<T extends { id: string }> {
  /** Page title in the header (Spanish). */
  title: string;
  /** Short description shown below the title. */
  description?: string;
  /** Lucide icon rendered next to the title. */
  icon: LucideIcon;
  /** Help tooltip text (from SCREEN_HELP). */
  helpText?: string;
  /** Permission codes for gating actions. */
  permissions: {
    view: string;
    create: string;
    update: string;
    delete: string;
  };
  /** Table columns. The component appends an Actions column automatically. */
  columns: ColumnDef<T>[];
  /** Initial sort — usually [{ id: "name", desc: false }]. */
  initialSort?: { id: string; desc: boolean }[];
  /** Server-side list fetch — called with the URLSearchParams string. */
  fetchList: (query: string) => Promise<PaginatedResult<T>>;
  /** Optional: load the full entity when opening the edit drawer. Falls back to the row data when omitted. */
  fetchById?: (id: string) => Promise<T>;
  /** Create handler — receives cleaned form data. */
  createItem: (data: Record<string, unknown>) => Promise<T>;
  /** Update handler. */
  updateItem: (id: string, data: Record<string, unknown>) => Promise<T>;
  /** Delete handler. */
  deleteItem: (id: string) => Promise<void>;
  /** Drawer field descriptors. */
  fields: FieldDescriptor[];
  /** Noun used in buttons/dialogs (defaults to "registro"). */
  itemNoun?: string;
  /** Noun (female) used when relevant (e.g. "sucursal"). When set, overrides itemNoun for UI copy. */
  itemNounSingular?: { article: "el" | "la"; word: string };
  /** Extra header actions rendered right of the "Agregar" button. */
  headerExtras?: React.ReactNode;
  /**
   * When provided, injects a phantom `q` text filter column into the toolbar
   * (hidden from the body). Its value is serialized as `?q=...` to the backend.
   * Pass the placeholder shown inside the input.
   */
  searchPlaceholder?: string;
}

type FormState = Record<string, unknown>;

// ─── Component ───────────────────────────────────────────────

export function ConfigTablePage<T extends { id: string }>(props: ConfigTablePageProps<T>) {
  const {
    title,
    description,
    icon: Icon,
    helpText,
    permissions,
    columns,
    initialSort = [{ id: "name", desc: false }],
    fetchList,
    fetchById,
    createItem,
    updateItem,
    deleteItem,
    fields,
    itemNoun = "registro",
    itemNounSingular,
    headerExtras,
    searchPlaceholder,
  } = props;

  const { can } = usePermissions();

  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<FormState>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [loadingEntity, setLoadingEntity] = React.useState(false);

  // Delete confirm state
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Actions column — dropdown with Edit + Delete (permission-gated)
  const actionsColumn = React.useMemo<ColumnDef<T>>(
    () => ({
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      size: 40,
      cell: ({ row }) => {
        const item = row.original;
        const canEdit = can(permissions.update);
        const canDelete = can(permissions.delete);
        if (!canEdit && !canDelete) return null;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {canEdit && (
                  <DropdownMenuItem onSelect={() => openEdit(item)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                )}
                {canEdit && canDelete && <DropdownMenuSeparator />}
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteId(item.id)}
                  >
                    <Trash2 />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: { label: "" },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, permissions.update, permissions.delete],
  );

  const qColumn = React.useMemo<ColumnDef<T> | null>(
    () =>
      searchPlaceholder
        ? {
            id: "q",
            accessorFn: () => "",
            header: () => null,
            cell: () => null,
            enableSorting: false,
            enableHiding: false,
            meta: { label: "Buscar", placeholder: searchPlaceholder, variant: "text" },
            enableColumnFilter: true,
          }
        : null,
    [searchPlaceholder],
  );

  const columnsWithActions = React.useMemo(
    () => (qColumn ? [qColumn, ...columns, actionsColumn] : [...columns, actionsColumn]),
    [qColumn, columns, actionsColumn],
  );

  const { table } = useDataTable<T>({
    data,
    columns: columnsWithActions,
    pageCount,
    manualMode: true,
    initialState: {
      ...(qColumn ? { columnVisibility: { q: false } } : {}),
      sorting: initialSort as ExtendedColumnSort<T>[],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const state = table.getState();

  const filterParams = React.useMemo(
    () =>
      buildListQuery({
        pagination: state.pagination,
        sorting: state.sorting,
        filters: state.columnFilters,
      }).toString(),
    [state.pagination, state.sorting, state.columnFilters],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList(filterParams)
      .then((res) => {
        if (cancelled) return;
        setData(res.items);
        setPageCount(res.meta.totalPages);
        setTotalRows(res.meta.total);
      })
      .catch((err) => {
        console.error(err);
        toast.error(formatApiError(err, `No se pudo cargar ${itemNoun}.`));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterParams, fetchList, itemNoun, refreshKey]);

  // ── Drawer helpers ──

  const getDefaultValues = React.useCallback((): FormState => {
    const defaults: FormState = {};
    for (const f of fields) {
      if (f.type === "checkbox") defaults[f.key] = false;
      else defaults[f.key] = "";
    }
    return defaults;
  }, [fields]);

  const hydrateForm = React.useCallback(
    (entity: Record<string, unknown>): FormState => {
      const next: FormState = {};
      for (const f of fields) {
        const raw = entity[f.key];
        if (f.type === "checkbox") {
          next[f.key] = raw === true;
        } else if (raw === null || raw === undefined) {
          next[f.key] = "";
        } else {
          next[f.key] = String(raw);
        }
      }
      return next;
    },
    [fields],
  );

  const openCreate = () => {
    setEditId(null);
    setFormData(getDefaultValues());
    setDrawerOpen(true);
  };

  const openEdit = async (item: T) => {
    setEditId(item.id);
    setFormData(hydrateForm(item as unknown as Record<string, unknown>));
    setDrawerOpen(true);
    if (fetchById) {
      setLoadingEntity(true);
      try {
        const full = await fetchById(item.id);
        setFormData(hydrateForm(full as unknown as Record<string, unknown>));
      } catch (err) {
        console.error(err);
        toast.error(formatApiError(err, "No se pudieron cargar los datos actuales."));
      } finally {
        setLoadingEntity(false);
      }
    }
  };

  const activeFields = React.useMemo(
    () => (editId ? fields.filter((f) => !f.createOnly) : fields),
    [fields, editId],
  );

  const cleanPayload = (raw: FormState): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const f of activeFields) {
      const v = raw[f.key];
      if (f.type === "checkbox") {
        out[f.key] = Boolean(v);
        continue;
      }
      if (v === "" || v === null || v === undefined) {
        if (f.type === "text" || f.type === "textarea" || f.type === "date") out[f.key] = null;
        // leave select/number unset if empty — backend schemas decide optional vs required
        continue;
      }
      if (f.type === "number") {
        const n = Number(v);
        if (!Number.isNaN(n)) out[f.key] = n;
        continue;
      }
      out[f.key] = v;
    }
    return out;
  };

  const validate = (raw: FormState): string | null => {
    for (const f of activeFields) {
      if (f.type === "checkbox") continue;
      if ("required" in f && f.required) {
        const v = raw[f.key];
        if (v === "" || v === null || v === undefined) {
          return `${f.label} es obligatorio.`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate(formData);
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    try {
      const payload = cleanPayload(formData);
      if (editId) {
        await updateItem(editId, payload);
        toast.success("Cambios guardados.");
      } else {
        await createItem(payload);
        toast.success("Creado correctamente.");
      }
      setDrawerOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error(formatApiError(err, "No se pudo guardar."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteItem(deleteId);
      toast.success("Eliminado correctamente.");
      setDeleteId(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error(formatApiError(err, "No se pudo eliminar."));
    } finally {
      setDeleting(false);
    }
  };

  // ── Form field renderer ──

  const renderField = (f: FieldDescriptor) => {
    const value = formData[f.key];

    if (f.type === "checkbox") {
      return (
        <div key={f.key} className="flex items-start gap-3 py-1">
          <Checkbox
            id={f.key}
            checked={Boolean(value)}
            onCheckedChange={(v) => setFormData((d) => ({ ...d, [f.key]: Boolean(v) }))}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor={f.key} className="cursor-pointer">
              {f.label}
            </Label>
            {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
          </div>
        </div>
      );
    }

    return (
      <div key={f.key} className="space-y-2">
        <Label htmlFor={f.key}>
          {f.label}
          {"required" in f && f.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {f.type === "select" ? (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => setFormData((d) => ({ ...d, [f.key]: v }))}
          >
            <SelectTrigger id={f.key} className="w-full">
              <SelectValue placeholder={f.placeholder ?? `Seleccionar ${f.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : f.type === "textarea" ? (
          <Textarea
            id={f.key}
            rows={f.rows ?? 3}
            value={(value as string) ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
          />
        ) : f.type === "number" ? (
          <Input
            id={f.key}
            type="number"
            step={f.step}
            min={f.min}
            max={f.max}
            placeholder={f.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
          />
        ) : f.type === "date" ? (
          <Input
            id={f.key}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
          />
        ) : (
          <Input
            id={f.key}
            type="text"
            placeholder={f.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
          />
        )}
        {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
      </div>
    );
  };

  const noun = itemNounSingular
    ? `${itemNounSingular.article} ${itemNounSingular.word}`
    : `un ${itemNoun}`;

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Icon className="size-6 text-p3" />
                {title}
                {helpText && <PageHelpTooltip content={helpText} />}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {totalRows} {totalRows === 1 ? "resultado" : "resultados"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {headerExtras}
              {can(permissions.create) && (
                <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
                  <Plus className="size-4" />
                  Agregar
                </Button>
              )}
            </div>
          </div>

          {/* Table (DataTable renders its own pagination footer) */}
          <ERPDataTable table={table} loading={loading} />
        </div>
      </div>

      {/* Create/Edit drawer */}
      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setDrawerOpen(open);
          if (!open) {
            setEditId(null);
            setFormData(getDefaultValues());
          }
        }}
        title={editId ? `Editar ${itemNoun}` : `Agregar ${noun}`}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        {loadingEntity ? (
          <p className="text-sm text-muted-foreground py-4">Cargando datos…</p>
        ) : (
          <div className="space-y-4">{activeFields.map(renderField)}</div>
        )}
      </FormDrawer>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este {itemNoun}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
