"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle2,
  Package,
  ClipboardCheck,
  Truck,
  BoxIcon,
  Flag,
  XCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  submitOrder,
  confirmOrder,
  reserveOrderStock,
  startOrderPreparation,
  markOrderReadyToDispatch,
  dispatchOrder,
  deliverOrder,
  completeOrder,
  cancelOrder,
} from "@/lib/actions/orders";
import type { OrderStatus } from "@/lib/types";
import type { CreditBlockDetail } from "@/lib/api/client";
import { CreditBlockDialog } from "./credit-block-dialog";

type TransitionAction = (id: string) => Promise<unknown>;

const nextActions: Partial<Record<OrderStatus, {
  label: string;
  icon: typeof Send;
  action: TransitionAction;
  variant?: "default" | "destructive" | "outline";
}>> = {
  draft: { label: "Enviar a confirmación", icon: Send, action: submitOrder as TransitionAction },
  pending_confirmation: { label: "Confirmar pedido", icon: CheckCircle2, action: confirmOrder },
  confirmed: { label: "Reservar stock", icon: ShieldCheck, action: reserveOrderStock },
  stock_reserved: { label: "Iniciar preparación", icon: Package, action: startOrderPreparation },
  in_preparation: { label: "Listo para despacho", icon: ClipboardCheck, action: markOrderReadyToDispatch },
  ready_to_dispatch: { label: "Despachar", icon: Truck, action: dispatchOrder },
  dispatched: { label: "Marcar entregado", icon: BoxIcon, action: deliverOrder },
  delivered: { label: "Completar", icon: Flag, action: completeOrder },
};

const cancellableStatuses: OrderStatus[] = [
  "draft", "pending_confirmation", "confirmed", "stock_reserved", "in_preparation",
];

interface OrderActionsProps {
  orderId: string;
  status: OrderStatus;
  customerId: string;
}

export function OrderActions({ orderId, status, customerId }: OrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [creditBlock, setCreditBlock] = useState<{
    detail: CreditBlockDetail;
    message?: string;
  } | null>(null);

  const next = nextActions[status];
  const canCancel = cancellableStatuses.includes(status);

  if (!next && !canCancel) return null;

  const handleSubmit = async () => {
    setLoading("next");
    try {
      const result = await submitOrder(orderId);
      if (result.ok) {
        router.refresh();
        toast.success("Enviado a confirmación");
      } else if (result.code === "CREDIT_BLOCK") {
        setCreditBlock({
          detail: result.detail as CreditBlockDetail,
          message: result.message,
        });
      } else {
        toast.error("Error al procesar", {
          description: result.message,
        });
      }
    } catch (err) {
      toast.error("Error al procesar", {
        description: err instanceof Error ? err.message : "No se pudo completar la acción.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAction = async (key: string, action: TransitionAction, label: string) => {
    // Submit has its own typed-result handler for CREDIT_BLOCK UX.
    if (key === "next" && status === "draft") {
      return handleSubmit();
    }
    setLoading(key);
    try {
      await action(orderId);
      router.refresh();
      toast.success(key === "cancel" ? "Pedido cancelado" : label, {
        description: key === "cancel" ? "El pedido fue cancelado correctamente." : "El pedido avanzó al siguiente estado.",
      });
    } catch (err) {
      toast.error("Error al procesar", {
        description: err instanceof Error ? err.message : "No se pudo completar la acción.",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {next && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!!loading}
            onClick={() => handleAction("next", next.action, next.label)}
          >
            {loading === "next" ? <Loader2 className="size-3.5 animate-spin" /> : <next.icon className="size-3.5" />}
            {next.label}
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            disabled={!!loading}
            onClick={() => handleAction("cancel", cancelOrder, "Cancelar")}
          >
            {loading === "cancel" ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
            Cancelar
          </Button>
        )}
      </div>

      <CreditBlockDialog
        open={!!creditBlock}
        onOpenChange={(open) => {
          if (!open) setCreditBlock(null);
        }}
        customerId={customerId}
        detail={creditBlock?.detail ?? null}
        message={creditBlock?.message}
      />
    </>
  );
}
