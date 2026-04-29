"use client";

import * as React from "react";
import { Printer } from "lucide-react";

export function PrintControls() {
  React.useEffect(() => {
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="no-print fixed top-4 right-4 flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-black/85"
      >
        <Printer className="size-3.5" /> Imprimir
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="inline-flex items-center gap-1.5 rounded-md border border-black/20 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
      >
        Cerrar
      </button>
    </div>
  );
}
