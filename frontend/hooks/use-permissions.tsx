"use client";

import * as React from "react";

interface PermissionsContextValue {
  permissions: string[];
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  canAll: (...permissions: string[]) => boolean;
}

const PermissionsContext = React.createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  const value = React.useMemo<PermissionsContextValue>(() => {
    const set = new Set(permissions);
    return {
      permissions,
      can: (p) => set.has(p),
      canAny: (...ps) => ps.some((p) => set.has(p)),
      canAll: (...ps) => ps.every((p) => set.has(p)),
    };
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = React.useContext(PermissionsContext);
  if (!ctx) {
    // Permit usage outside the provider (server-rendered pages without permissions)
    // by returning a no-op implementation — behave as if the user has no perms.
    return {
      permissions: [],
      can: () => false,
      canAny: () => false,
      canAll: () => false,
    };
  }
  return ctx;
}
