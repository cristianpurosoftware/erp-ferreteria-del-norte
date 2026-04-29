"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { orderSchema, type OrderFormValues } from "@/lib/validations/order";
import { createOrder } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Customer,
  Product,
  SalesZone,
  Route,
  Promotion,
} from "@/lib/types";
import { getActivePromotions } from "@/lib/actions/promotions";
import { useEffect as useEffectReact } from "react";

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<
    Customer,
    "id" | "legalName" | "commercialName" | "zoneId" | "routeId" | "channel" | "category"
  >[];
  products: Pick<Product, "id" | "name" | "basePrice">[];
  zones?: Pick<SalesZone, "id" | "code" | "name">[];
  routes?: Pick<Route, "id" | "code" | "name" | "zoneId">[];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground block mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

export function OrderForm({
  open,
  onOpenChange,
  customers,
  products,
  zones = [],
  routes = [],
}: OrderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState<Record<number, boolean>>({});
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: standardSchemaResolver(orderSchema) as any,
    defaultValues: {
      customerId: "",
      notes: "",
      items: [],
      operationType: "sale",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const customerIdWatch = watch("customerId");
  const zoneIdWatch = watch("zoneId");
  const selectedCustomer = customers.find((c) => c.id === customerIdWatch);
  const itemsWatch = watch("items");

  // Auto-fill zone/route from selected customer.
  useEffectReact(() => {
    if (!selectedCustomer) return;
    if (selectedCustomer.zoneId && !getValues("zoneId")) {
      setValue("zoneId", selectedCustomer.zoneId);
    }
    if (selectedCustomer.routeId && !getValues("routeId")) {
      setValue("routeId", selectedCustomer.routeId);
    }
  }, [selectedCustomer, getValues, setValue]);

  // Fetch active promotions when customer changes.
  useEffectReact(() => {
    if (!customerIdWatch) {
      setActivePromotions([]);
      return;
    }
    const params: {
      customerId: string;
      zoneId?: string;
      channel?: string;
      customerCategory?: string;
    } = { customerId: customerIdWatch };
    if (selectedCustomer?.zoneId) params.zoneId = selectedCustomer.zoneId;
    if (selectedCustomer?.channel) params.channel = selectedCustomer.channel;
    if (selectedCustomer?.category) params.customerCategory = selectedCustomer.category;

    getActivePromotions(params)
      .then((ps) => setActivePromotions(ps))
      .catch(() => setActivePromotions([]));
  }, [customerIdWatch, selectedCustomer]);

  const total = itemsWatch.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  function handleProductSelect(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setValue(`items.${index}.productId`, productId);
    if (product) {
      setValue(`items.${index}.unitPrice`, product.basePrice);
    }
    setComboOpen((prev) => ({ ...prev, [index]: false }));
  }

  function addItem() {
    append({
      productId: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
    });
  }

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        customerId: data.customerId,
        channel: data.channel ?? "manual",
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount ?? 0),
          tax: Number(item.tax ?? 0),
        })),
        operationType: data.operationType ?? "sale",
      };
      if (data.zoneId) payload.zoneId = data.zoneId;
      if (data.routeId) payload.routeId = data.routeId;
      if (data.promotionId) payload.promotionId = data.promotionId;

      await createOrder(payload as Parameters<typeof createOrder>[0]);
      router.refresh();
      onOpenChange(false);
      reset();
      toast.success("Pedido creado");
    } catch (err) {
      toast.error("Error al crear pedido", { description: err instanceof Error ? err.message : "Verificá los datos e intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  });

  const selectCls = (hasError?: boolean) =>
    cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
      hasError && "border-destructive focus:ring-destructive"
    );

  const inputCls = (hasError?: boolean) =>
    cn("h-9 text-sm", hasError && "border-destructive focus-visible:ring-destructive");

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo pedido"
      onSubmit={onSubmit}
      loading={loading}
      submitLabel="Crear pedido"
    >
      <div className="space-y-5">
        {/* Customer */}
        <div>
          <Label required>Cliente</Label>
          <input type="hidden" {...register("customerId")} />
          <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={customerComboOpen}
                className={cn(
                  "h-9 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring",
                  !customerIdWatch && "text-muted-foreground",
                  !!errors.customerId && "border-destructive focus:ring-destructive"
                )}
              >
                <span className="truncate">
                  {selectedCustomer
                    ? (selectedCustomer.commercialName || selectedCustomer.legalName)
                    : "Seleccionar cliente..."}
                </span>
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.commercialName || c.legalName}
                        onSelect={() => {
                          setValue("customerId", c.id);
                          setCustomerComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            customerIdWatch === c.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {c.commercialName || c.legalName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldError message={errors.customerId?.message} />
        </div>

        {/* Fase 1 — Clasificación comercial */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo de operación</Label>
            <select
              {...register("operationType")}
              className={selectCls(!!errors.operationType)}
            >
              <option value="sale">Venta</option>
              <option value="sample">Muestra</option>
              <option value="donation">Donación</option>
              <option value="internal">Consumo interno</option>
            </select>
          </div>
          <div>
            <Label>Promoción</Label>
            <select
              {...register("promotionId")}
              className={selectCls()}
              disabled={!customerIdWatch}
            >
              <option value="">
                {customerIdWatch ? "Sin promoción" : "Seleccioná un cliente primero"}
              </option>
              {activePromotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Zona</Label>
            <select {...register("zoneId")} className={selectCls()}>
              <option value="">Sin zona</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Ruta</Label>
            <select {...register("routeId")} className={selectCls()}>
              <option value="">Sin ruta</option>
              {routes
                .filter((r) => !zoneIdWatch || r.zoneId === zoneIdWatch)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label>Observaciones</Label>
          <Input
            {...register("notes")}
            className={inputCls()}
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label required>Productos</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={addItem}
            >
              <Plus className="size-3" />
              Agregar
            </Button>
          </div>

          {errors.items?.root?.message && (
            <FieldError message={errors.items.root.message} />
          )}
          {typeof errors.items?.message === "string" && (
            <FieldError message={errors.items.message} />
          )}

          {fields.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Sin productos. Agregue al menos uno.
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const currentItem = itemsWatch[index];
              const selectedProduct = products.find((p) => p.id === currentItem?.productId);

              return (
                <div key={field.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <input type="hidden" {...register(`items.${index}.productId`)} />

                      <Popover
                        open={!!comboOpen[index]}
                        onOpenChange={(open) =>
                          setComboOpen((prev) => ({ ...prev, [index]: open }))
                        }
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            role="combobox"
                            className={cn(
                              "h-9 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring",
                              !selectedProduct && "text-muted-foreground",
                              !!errors.items?.[index]?.productId &&
                                "border-destructive focus:ring-destructive"
                            )}
                          >
                            <span className="truncate">
                              {selectedProduct ? selectedProduct.name : "Seleccionar producto..."}
                            </span>
                            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar producto..." />
                            <CommandList>
                              <CommandEmpty>Sin resultados.</CommandEmpty>
                              <CommandGroup>
                                {products.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.name} ${p.id}`}
                                    onSelect={() => handleProductSelect(index, p.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 size-4",
                                        currentItem?.productId === p.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1 truncate">{p.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground shrink-0">
                                      {formatMoney(p.basePrice)}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FieldError message={errors.items?.[index]?.productId?.message} />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                      <Input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        min={1}
                        step={1}
                        className={inputCls(!!errors.items?.[index]?.quantity)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Precio u.</label>
                      <Input
                        {...register(`items.${index}.unitPrice`)}
                        type="number"
                        min={0}
                        step={0.01}
                        className={inputCls(!!errors.items?.[index]?.unitPrice)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Subtotal</label>
                      <Input
                        value={formatMoney((Number(currentItem?.quantity) || 0) * (Number(currentItem?.unitPrice) || 0))}
                        readOnly
                        className="h-9 text-sm bg-muted/40"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total */}
        {fields.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-semibold tabular-nums">{formatMoney(total)}</span>
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
