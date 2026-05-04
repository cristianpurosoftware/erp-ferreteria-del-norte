"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="size-4 mr-2" /> Reimprimir
    </Button>
  );
}
