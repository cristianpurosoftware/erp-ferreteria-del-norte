"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle2, Ban, Unlock, Loader2 } from "lucide-react";
import { activateCustomer, blockCustomer, unblockCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/forms/customer-form";
import type { Customer, CustomerStatus, User } from "@/lib/types";

interface Props {
  customer: Customer;
  sellers?: Pick<User, "id" | "first_name" | "last_name">[];
}

export function CustomerActions({ customer, sellers = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const labels: Record<string, string> = { activate: "Cliente activado", block: "Cliente bloqueado", unblock: "Cliente desbloqueado" };

  const handleAction = async (key: string, action: (id: string) => Promise<unknown>) => {
    setLoading(key);
    try {
      await action(customer.id);
      router.refresh();
      toast.success(labels[key] ?? "Acción completada");
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "No se pudo completar la acción." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
          Editar
        </Button>

        {customer.status === "draft" && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!!loading}
            onClick={() => handleAction("activate", activateCustomer)}
          >
            {loading === "activate" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Activar
          </Button>
        )}

        {customer.status === "active" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            disabled={!!loading}
            onClick={() => handleAction("block", blockCustomer)}
          >
            {loading === "block" ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
            Bloquear
          </Button>
        )}

        {customer.status === "blocked" && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!!loading}
            onClick={() => handleAction("unblock", unblockCustomer)}
          >
            {loading === "unblock" ? <Loader2 className="size-3.5 animate-spin" /> : <Unlock className="size-3.5" />}
            Desbloquear
          </Button>
        )}
      </div>

      <CustomerForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) router.refresh();
        }}
        customer={customer}
        sellers={sellers}
      />
    </>
  );
}
