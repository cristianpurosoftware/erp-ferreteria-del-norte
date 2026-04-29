"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { getSuppliers } from "@/lib/actions/purchases";
import { getActiveProducts } from "@/lib/actions/products";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";

const EDITABLE_STATUSES: PurchaseOrderStatus[] = ["draft", "requested"];

export function EditPurchaseOrderButton({ po }: { po: PurchaseOrder & { items?: Array<{ productId: string; quantity: number; unitCost: number }> } }) {
  const { can } = usePermissions();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loadingData, setLoadingData] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = React.useState<Array<{ id: string; name: string; sku?: string }>>([]);

  if (!can("purchases:update") || !EDITABLE_STATUSES.includes(po.status)) return null;

  const handleClick = async () => {
    setLoadingData(true);
    try {
      const [s, p] = await Promise.all([
        getSuppliers({ limit: 500 }),
        getActiveProducts(),
      ]);
      setSuppliers(s.items.map((su) => ({ id: su.id, name: su.name })));
      setProducts(p.items.map((pr) => ({ id: pr.id, name: pr.name, sku: pr.sku ?? undefined })));
      setOpen(true);
    } finally {
      setLoadingData(false);
    }
  };

  const initialValues = {
    supplierId: po.supplierId,
    notes: po.notes ?? "",
    items: po.items?.map((i) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
    })) ?? [],
  };

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={loadingData} onClick={handleClick}>
        {loadingData ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
        Editar
      </Button>
      <PurchaseForm
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) router.refresh();
        }}
        mode="edit"
        purchaseOrderId={po.id}
        initialValues={initialValues}
        suppliers={suppliers}
        products={products}
      />
    </>
  );
}
