"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton({ invoiceId }: { invoiceId: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.open(`/imprimir/comprobante/${invoiceId}`, "_blank", "noopener,noreferrer")}
    >
      <Printer className="size-4 mr-2" /> Reimprimir PDF
    </Button>
  );
}
