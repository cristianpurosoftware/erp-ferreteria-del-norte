"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importPadron } from "@/lib/actions/treasury";
import { WITHHOLDING_KIND_LABELS } from "@/lib/types";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

interface PadronRow {
  kind: string;
  jurisdictionId?: string;
  cuit: string;
  ratePerception?: number;
  rateWithholding?: number;
  validFrom?: string;
  validTo?: string;
}

function parseCSV(text: string): PadronRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return {
      kind: row.kind || row.tipo || "iibb",
      jurisdictionId: row.jurisdictionid || row.jurisdiction_id || undefined,
      cuit: row.cuit,
      ratePerception: row.rateperception ? Number(row.rateperception) : undefined,
      rateWithholding: row.ratewithholding ? Number(row.ratewithholding) : undefined,
      validFrom: row.validfrom || row.valid_from || undefined,
      validTo: row.validto || row.valid_to || undefined,
    } as PadronRow;
  });
}

export default function PadronesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PadronRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = async (f: File | null) => {
    setFile(f);
    if (!f) {
      setPreview([]);
      return;
    }
    const text = await f.text();
    setPreview(parseCSV(text).slice(0, 10));
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const result = await importPadron({ rows });
      toast.success(`Padrón importado`, {
        description: `${result.imported} registros cargados.`,
      });
      setFile(null);
      setPreview([]);
    } catch (err) {
      toast.error("Error al importar", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <Link
            href="/tesoreria/retenciones"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a retenciones
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-3 flex items-center gap-2">
            <FileSpreadsheet className="size-6 text-p3" />
            Importar padrón
            <PageHelpTooltip content={SCREEN_HELP["tesoreria/retenciones/padrones"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CSV con columnas: <code className="font-mono text-xs">kind, jurisdictionId, cuit, ratePerception, rateWithholding, validFrom, validTo</code>.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Archivo CSV</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="h-9 text-sm"
            />
          </div>
          {preview.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Vista previa (primeras {preview.length} filas):
              </p>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Tipo</TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Jurisdicción</TableHead>
                      <TableHead>% percepción</TableHead>
                      <TableHead>% retención</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{WITHHOLDING_KIND_LABELS[r.kind] ?? r.kind}</TableCell>
                        <TableCell className="font-mono text-xs">{r.cuit}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {"—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {r.ratePerception ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {r.rateWithholding ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.validFrom ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.validTo ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview([]);
              }}
              disabled={!file || loading}
            >
              Limpiar
            </Button>
            <Button onClick={submit} disabled={!file || loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Importar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
