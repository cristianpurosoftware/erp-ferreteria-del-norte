"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ExternalLink } from "lucide-react";
import type { CreditBlockDetail } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";

const REASON_LABELS: Record<CreditBlockDetail["reason"], string> = {
  over_credit_limit: "Supera el límite de crédito",
  overdue_balance: "Tiene saldo vencido",
  policy_blocked: "Cliente bloqueado por política",
};

interface CreditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  detail: CreditBlockDetail | null;
  message?: string;
}

export function CreditBlockDialog({
  open,
  onOpenChange,
  customerId,
  detail,
  message,
}: CreditBlockDialogProps) {
  if (!detail) return null;

  const title = REASON_LABELS[detail.reason] ?? "Pedido bloqueado por crédito";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {message ??
              "No se puede enviar el pedido a confirmación. Revisá la cuenta corriente del cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {detail.reason === "over_credit_limit" && (
            <>
              <Row label="Límite de crédito" value={formatMoney(detail.limit ?? 0)} />
              <Row label="Saldo actual" value={formatMoney(detail.balance ?? 0)} />
              {typeof detail.available === "number" && (
                <Row
                  label="Disponible"
                  value={formatMoney(detail.available)}
                  highlight
                />
              )}
            </>
          )}
          {detail.reason === "overdue_balance" && (
            <>
              <Row
                label="Saldo vencido"
                value={formatMoney(detail.overdueAmount ?? detail.balance ?? 0)}
                highlight
              />
              {typeof detail.overdueDays === "number" && (
                <Row
                  label="Días en mora"
                  value={`${detail.overdueDays} días`}
                />
              )}
            </>
          )}
          {detail.reason === "policy_blocked" && (
            <Row
              label="Política aplicada"
              value={detail.policy ?? "Bloqueado por política"}
              highlight
            />
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Entendido
          </Button>
          <Button asChild className="sm:flex-1 gap-1.5">
            <Link href={`/clientes/${customerId}`}>
              Ver cuenta corriente
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight ? "font-semibold text-destructive" : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
