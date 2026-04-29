"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileWarning, Shield, Loader2 } from "lucide-react";
import { requestCae } from "@/lib/actions/fiscal-authorizations";

interface Props {
  invoiceId: string;
}

export function RequestCaeButton({ invoiceId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState<{ reason?: string; provider?: string } | null>(null);

  const onClick = async () => {
    setLoading(true);
    try {
      const result = await requestCae(invoiceId);
      if (result.status === "approved" && result.cae) {
        toast.success("CAE obtenido", {
          description: `Número ${result.cae} · vence ${result.caeExpiration?.slice(0, 10) ?? "—"}`,
        });
        router.refresh();
      } else if (result.status === "rejected") {
        const raw = result.responsePayload as Record<string, unknown> | null;
        setRejected({
          reason: typeof raw?.reason === "string" ? raw.reason : undefined,
          provider: result.provider,
        });
      } else {
        toast.info("Autorización registrada", {
          description: "El fisco aún no respondió. Refrescá en unos segundos.",
        });
        router.refresh();
      }
    } catch (err) {
      toast.error("Error al solicitar CAE", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" className="gap-1.5" disabled={loading} onClick={onClick}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Shield className="size-3.5" />}
        Solicitar CAE
      </Button>

      <Dialog open={!!rejected} onOpenChange={(o) => !o && setRejected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="size-5 text-destructive" />
              CAE rechazado
            </DialogTitle>
            <DialogDescription>
              El proveedor fiscal rechazó la solicitud. Corregí los datos del comprobante y volvé a intentar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Proveedor:</span> {rejected?.provider ?? "AFIP"}</p>
            {rejected?.reason && <p><span className="text-muted-foreground">Motivo:</span> {rejected.reason}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => setRejected(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
