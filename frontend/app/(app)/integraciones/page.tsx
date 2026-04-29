"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Integration, IntegrationStatus } from "@/lib/types";
import { getIntegrations } from "@/lib/actions/integrations";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusConfig: Record<IntegrationStatus, { label: string; color: string; icon: typeof Wifi }> = {
  inactive: { label: "Inactiva", color: "text-gray-400", icon: WifiOff },
  active: { label: "Activa", color: "text-p3", icon: Wifi },
  syncing: { label: "Sincronizando", color: "text-blue-500", icon: RefreshCw },
  degraded: { label: "Degradada", color: "text-yellow-600", icon: AlertTriangle },
  failed: { label: "Fallida", color: "text-red-500", icon: AlertTriangle },
  paused: { label: "Pausada", color: "text-gray-500", icon: WifiOff },
};

function IntegracionesSkeleton() {
  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

export default function IntegracionesPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    getIntegrations({ limit: 50 })
      .then((r) => {
        setIntegrations(r.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <IntegracionesSkeleton />;

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Plug className="size-6 text-p3" />
              Integraciones
              <PageHelpTooltip content={SCREEN_HELP.integraciones} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {integrations.length} integraciones configuradas
            </p>
          </div>
        </div>

        {/* Integration cards */}
        {integrations.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No hay integraciones configuradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((int) => {
              const st = statusConfig[int.status] ?? statusConfig.inactive;
              const StatusIcon = st.icon;
              return (
                <div key={int.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm capitalize">{int.provider}</p>
                      <p className="text-xs text-muted-foreground capitalize">{int.type}</p>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", st.color)}>
                      <StatusIcon className="size-3" />
                      {st.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {int.lastSyncAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ultima sync</span>
                        <span className="text-xs">{formatDate(int.lastSyncAt)}</span>
                      </div>
                    )}
                    {int.events && int.events.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Eventos</span>
                        <span>{int.events.length}</span>
                      </div>
                    )}
                  </div>

                  {int.configuration && Object.keys(int.configuration).length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Configuracion:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(int.configuration).slice(0, 4).map((k) => (
                          <Badge key={k} variant="outline" className="text-[10px] h-5">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Available integrations (mock) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Disponible para conectar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MockIntegrationCard
              logo={<ArcaLogo />}
              name="ARCA / AFIP"
              description="Facturación electrónica, consulta de CUIT, y sincronización fiscal con la AFIP."
            />
            <MockIntegrationCard
              logo={<MercadoLibreLogo />}
              name="Mercado Libre"
              description="Sincronizá productos, stock y pedidos con tu tienda de Mercado Libre."
            />
            <MockIntegrationCard
              logo={<TiendaNubeLogo />}
              name="Tienda Nube"
              description="Conectá tu tienda online para sincronizar productos, stock y órdenes."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockIntegrationCard({
  logo,
  name,
  description,
}: {
  logo: React.ReactNode;
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="w-full h-20 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden px-6">
        {logo}
      </div>
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{description}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-auto"
        onClick={() => toast.info("Próximamente disponible")}
      >
        <Plug className="size-3.5 mr-1.5" />
        Conectar
      </Button>
    </div>
  );
}

function ArcaLogo() {
  return <Image src="/arca.png" alt="ARCA" width={140} height={60} className="object-contain max-h-14" />;
}

function MercadoLibreLogo() {
  return <Image src="/mercadolibre.png" alt="Mercado Libre" width={160} height={60} className="object-contain max-h-14" />;
}

function TiendaNubeLogo() {
  return <Image src="/tiendanube.png" alt="Tienda Nube" width={160} height={60} className="object-contain max-h-14" />;
}
