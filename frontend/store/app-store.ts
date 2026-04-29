import { create } from "zustand";
import type {
  OrderStatus,
  CustomerStatus,
  ProductStatus,
  CustomerCategory,
  PromotionStatus,
  CommissionStatus,
  LotStatus,
} from "@/lib/types";

interface AppStore {
  // --- Sidebar ---
  currentModule: string;
  setCurrentModule: (module: string) => void;

  // --- Pedidos ---
  ordersSearch: string;
  ordersStatusFilter: OrderStatus | "all";
  ordersChannelFilter: string | "all";
  ordersZoneFilter: string | "all";
  ordersRouteFilter: string | "all";
  setOrdersSearch: (q: string) => void;
  setOrdersStatusFilter: (f: OrderStatus | "all") => void;
  setOrdersChannelFilter: (f: string | "all") => void;
  setOrdersZoneFilter: (f: string | "all") => void;
  setOrdersRouteFilter: (f: string | "all") => void;

  // --- Catalogo ---
  catalogSearch: string;
  catalogCategoryFilter: string | "all";
  catalogBrandFilter: string | "all";
  catalogStatusFilter: ProductStatus | "all";
  setCatalogSearch: (q: string) => void;
  setCatalogCategoryFilter: (f: string | "all") => void;
  setCatalogBrandFilter: (f: string | "all") => void;
  setCatalogStatusFilter: (f: ProductStatus | "all") => void;

  // --- Stock ---
  stockSearch: string;
  stockLevelFilter: string | "all";
  lotsSearch: string;
  lotsStatusFilter: LotStatus | "all";
  locationsSearch: string;
  locationsWarehouseFilter: string | "all";
  setStockSearch: (q: string) => void;
  setStockLevelFilter: (f: string | "all") => void;
  setLotsSearch: (q: string) => void;
  setLotsStatusFilter: (f: LotStatus | "all") => void;
  setLocationsSearch: (q: string) => void;
  setLocationsWarehouseFilter: (f: string | "all") => void;

  // --- Cobranzas ---
  collectionsSearch: string;
  collectionsStatusFilter: string | "all";
  setCollectionsSearch: (q: string) => void;
  setCollectionsStatusFilter: (f: string | "all") => void;

  // --- Clientes ---
  customersSearch: string;
  customersStatusFilter: CustomerStatus | "all";
  customersCategoryFilter: CustomerCategory | "all";
  customersZoneFilter: string | "all";
  customersRouteFilter: string | "all";
  setCustomersSearch: (q: string) => void;
  setCustomersStatusFilter: (f: CustomerStatus | "all") => void;
  setCustomersCategoryFilter: (f: CustomerCategory | "all") => void;
  setCustomersZoneFilter: (f: string | "all") => void;
  setCustomersRouteFilter: (f: string | "all") => void;

  // --- Comercial: Zonas ---
  zonesSearch: string;
  setZonesSearch: (q: string) => void;

  // --- Comercial: Rutas ---
  routesSearch: string;
  routesZoneFilter: string | "all";
  setRoutesSearch: (q: string) => void;
  setRoutesZoneFilter: (f: string | "all") => void;

  // --- Comercial: Promociones ---
  promotionsSearch: string;
  promotionsStatusFilter: PromotionStatus | "all";
  setPromotionsSearch: (q: string) => void;
  setPromotionsStatusFilter: (f: PromotionStatus | "all") => void;

  // --- Comercial: Comisiones ---
  commissionsSearch: string;
  commissionsStatusFilter: CommissionStatus | "all";
  commissionsSellerFilter: string | "all";
  commissionsMonthFilter: string;
  setCommissionsSearch: (q: string) => void;
  setCommissionsStatusFilter: (f: CommissionStatus | "all") => void;
  setCommissionsSellerFilter: (f: string | "all") => void;
  setCommissionsMonthFilter: (f: string) => void;

  // --- Logística ---
  pickingSearch: string;
  pickingStatusFilter: string | "all";
  shipmentsSearch: string;
  shipmentsStatusFilter: string | "all";
  returnsSearch: string;
  returnsStatusFilter: string | "all";
  inventoryCountsStatusFilter: string | "all";
  setPickingSearch: (q: string) => void;
  setPickingStatusFilter: (f: string | "all") => void;
  setShipmentsSearch: (q: string) => void;
  setShipmentsStatusFilter: (f: string | "all") => void;
  setReturnsSearch: (q: string) => void;
  setReturnsStatusFilter: (f: string | "all") => void;
  setInventoryCountsStatusFilter: (f: string | "all") => void;

  // --- Reportes ---
  reportPeriod: "week" | "month" | "quarter" | "year";
  setReportPeriod: (p: "week" | "month" | "quarter" | "year") => void;

  // --- Reset ---
  clearAllFilters: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Sidebar
  currentModule: "dashboard",
  setCurrentModule: (module) => set({ currentModule: module }),

  // Pedidos
  ordersSearch: "",
  ordersStatusFilter: "all",
  ordersChannelFilter: "all",
  ordersZoneFilter: "all",
  ordersRouteFilter: "all",
  setOrdersSearch: (q) => set({ ordersSearch: q }),
  setOrdersStatusFilter: (f) => set({ ordersStatusFilter: f }),
  setOrdersChannelFilter: (f) => set({ ordersChannelFilter: f }),
  setOrdersZoneFilter: (f) => set({ ordersZoneFilter: f }),
  setOrdersRouteFilter: (f) => set({ ordersRouteFilter: f }),

  // Catalogo
  catalogSearch: "",
  catalogCategoryFilter: "all",
  catalogBrandFilter: "all",
  catalogStatusFilter: "all",
  setCatalogSearch: (q) => set({ catalogSearch: q }),
  setCatalogCategoryFilter: (f) => set({ catalogCategoryFilter: f }),
  setCatalogBrandFilter: (f) => set({ catalogBrandFilter: f }),
  setCatalogStatusFilter: (f) => set({ catalogStatusFilter: f }),

  // Stock
  stockSearch: "",
  stockLevelFilter: "all",
  lotsSearch: "",
  lotsStatusFilter: "all",
  locationsSearch: "",
  locationsWarehouseFilter: "all",
  setStockSearch: (q) => set({ stockSearch: q }),
  setStockLevelFilter: (f) => set({ stockLevelFilter: f }),
  setLotsSearch: (q) => set({ lotsSearch: q }),
  setLotsStatusFilter: (f) => set({ lotsStatusFilter: f }),
  setLocationsSearch: (q) => set({ locationsSearch: q }),
  setLocationsWarehouseFilter: (f) => set({ locationsWarehouseFilter: f }),

  // Cobranzas
  collectionsSearch: "",
  collectionsStatusFilter: "all",
  setCollectionsSearch: (q) => set({ collectionsSearch: q }),
  setCollectionsStatusFilter: (f) => set({ collectionsStatusFilter: f }),

  // Clientes
  customersSearch: "",
  customersStatusFilter: "all",
  customersCategoryFilter: "all",
  customersZoneFilter: "all",
  customersRouteFilter: "all",
  setCustomersSearch: (q) => set({ customersSearch: q }),
  setCustomersStatusFilter: (f) => set({ customersStatusFilter: f }),
  setCustomersCategoryFilter: (f) => set({ customersCategoryFilter: f }),
  setCustomersZoneFilter: (f) => set({ customersZoneFilter: f }),
  setCustomersRouteFilter: (f) => set({ customersRouteFilter: f }),

  // Comercial — Zonas
  zonesSearch: "",
  setZonesSearch: (q) => set({ zonesSearch: q }),

  // Comercial — Rutas
  routesSearch: "",
  routesZoneFilter: "all",
  setRoutesSearch: (q) => set({ routesSearch: q }),
  setRoutesZoneFilter: (f) => set({ routesZoneFilter: f }),

  // Comercial — Promociones
  promotionsSearch: "",
  promotionsStatusFilter: "all",
  setPromotionsSearch: (q) => set({ promotionsSearch: q }),
  setPromotionsStatusFilter: (f) => set({ promotionsStatusFilter: f }),

  // Comercial — Comisiones
  commissionsSearch: "",
  commissionsStatusFilter: "all",
  commissionsSellerFilter: "all",
  commissionsMonthFilter: "",
  setCommissionsSearch: (q) => set({ commissionsSearch: q }),
  setCommissionsStatusFilter: (f) => set({ commissionsStatusFilter: f }),
  setCommissionsSellerFilter: (f) => set({ commissionsSellerFilter: f }),
  setCommissionsMonthFilter: (f) => set({ commissionsMonthFilter: f }),

  // Logística
  pickingSearch: "",
  pickingStatusFilter: "all",
  shipmentsSearch: "",
  shipmentsStatusFilter: "all",
  returnsSearch: "",
  returnsStatusFilter: "all",
  inventoryCountsStatusFilter: "all",
  setPickingSearch: (q) => set({ pickingSearch: q }),
  setPickingStatusFilter: (f) => set({ pickingStatusFilter: f }),
  setShipmentsSearch: (q) => set({ shipmentsSearch: q }),
  setShipmentsStatusFilter: (f) => set({ shipmentsStatusFilter: f }),
  setReturnsSearch: (q) => set({ returnsSearch: q }),
  setReturnsStatusFilter: (f) => set({ returnsStatusFilter: f }),
  setInventoryCountsStatusFilter: (f) => set({ inventoryCountsStatusFilter: f }),

  // Reportes
  reportPeriod: "month",
  setReportPeriod: (p) => set({ reportPeriod: p }),

  // Reset
  clearAllFilters: () =>
    set({
      ordersSearch: "",
      ordersStatusFilter: "all",
      ordersChannelFilter: "all",
      ordersZoneFilter: "all",
      ordersRouteFilter: "all",
      catalogSearch: "",
      catalogCategoryFilter: "all",
      catalogBrandFilter: "all",
      catalogStatusFilter: "all",
      stockSearch: "",
      stockLevelFilter: "all",
      lotsSearch: "",
      lotsStatusFilter: "all",
      locationsSearch: "",
      locationsWarehouseFilter: "all",
      collectionsSearch: "",
      collectionsStatusFilter: "all",
      customersSearch: "",
      customersStatusFilter: "all",
      customersCategoryFilter: "all",
      customersZoneFilter: "all",
      customersRouteFilter: "all",
      zonesSearch: "",
      routesSearch: "",
      routesZoneFilter: "all",
      promotionsSearch: "",
      promotionsStatusFilter: "all",
      commissionsSearch: "",
      commissionsStatusFilter: "all",
      commissionsSellerFilter: "all",
    }),
}));
