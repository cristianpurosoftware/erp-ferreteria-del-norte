"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Landmark, Plus, Trash2, Loader2 } from "lucide-react";
import {
  getCustomerJurisdictions,
  addCustomerJurisdiction,
  removeCustomerJurisdiction,
  getJurisdictions,
} from "@/lib/actions/jurisdictions";
import type { CustomerJurisdiction, Jurisdiction } from "@/lib/types";

const CONDITION_LABELS: Record<string, string> = {
  inscripto: "Inscripto",
  no_inscripto: "No inscripto",
  exento: "Exento",
  convenio_multilateral: "Convenio multilateral",
};

interface Props {
  customerId: string;
}

export function CustomerJurisdictions({ customerId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CustomerJurisdiction[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [dialog, setDialog] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState({
    jurisdictionId: "",
    condition: "inscripto" as keyof typeof CONDITION_LABELS,
    inscriptionNumber: "",
  });

  const refetch = async () => {
    const list = await getCustomerJurisdictions(customerId);
    setItems(list);
  };

  useEffect(() => {
    Promise.all([
      getCustomerJurisdictions(customerId),
      getJurisdictions({ limit: 200 }),
    ])
      .then(([cj, j]) => {
        setItems(cj);
        setJurisdictions(j.items);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const add = async () => {
    if (!form.jurisdictionId) return;
    setActing("add");
    try {
      const data: Record<string, unknown> = {
        jurisdictionId: form.jurisdictionId,
        condition: form.condition,
      };
      if (form.inscriptionNumber) data.inscriptionNumber = form.inscriptionNumber;
      await addCustomerJurisdiction(customerId, data);
      toast.success("Inscripción agregada");
      setDialog(false);
      setForm({ jurisdictionId: "", condition: "inscripto", inscriptionNumber: "" });
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Quitar esta inscripción?")) return;
    setActing(`r-${id}`);
    try {
      await removeCustomerJurisdiction(customerId, id);
      toast.success("Inscripción eliminada");
      await refetch();
      router.refresh();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(null);
    }
  };

  if (loading) return null;

  const availableJurisdictions = jurisdictions.filter(
    (j) => !items.some((i) => i.jurisdictionId === j.id)
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium text-base flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            Jurisdicciones ({items.length})
          </h3>
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => setDialog(true)}
            disabled={availableJurisdictions.length === 0}
          >
            <Plus className="size-3" />
            Agregar inscripción
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Sin inscripciones IIBB. Agregá la(s) que apliquen al cliente para que se calculen
            percepciones/retenciones automáticamente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Jurisdicción</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Número de inscripción</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cj) => {
                const j = jurisdictions.find((x) => x.id === cj.jurisdictionId);
                return (
                  <TableRow key={cj.id}>
                    <TableCell className="text-sm">
                      {j ? `${j.code} — ${j.name}` : cj.jurisdictionName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {CONDITION_LABELS[cj.condition] ?? cj.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cj.inscriptionNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        disabled={acting === `r-${cj.id}`}
                        onClick={() => remove(cj.id)}
                      >
                        {acting === `r-${cj.id}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar inscripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Jurisdicción</label>
              <select
                value={form.jurisdictionId}
                onChange={(e) => setForm((p) => ({ ...p, jurisdictionId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccioná una jurisdicción</option>
                {availableJurisdictions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.code} — {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Condición</label>
              <select
                value={form.condition}
                onChange={(e) =>
                  setForm((p) => ({ ...p, condition: e.target.value as typeof p.condition }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="inscripto">Inscripto</option>
                <option value="no_inscripto">No inscripto</option>
                <option value="exento">Exento</option>
                <option value="convenio_multilateral">Convenio multilateral</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Número de inscripción</label>
              <Input
                value={form.inscriptionNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, inscriptionNumber: e.target.value }))
                }
                className="h-9 text-sm"
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={add} disabled={!form.jurisdictionId || acting === "add"}>
              {acting === "add" && <Loader2 className="size-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
