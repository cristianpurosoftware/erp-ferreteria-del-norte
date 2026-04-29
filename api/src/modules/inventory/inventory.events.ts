export const InventoryEvents = {
  MOVEMENT_CREATED: 'inventory.movement_created',
  RESERVED: 'inventory.reserved',
  RELEASED: 'inventory.released',
  TRANSFERRED: 'inventory.transferred',
  ADJUSTED: 'inventory.adjusted',
  STOCK_LOW: 'stock.low',
  STOCK_EXPIRING: 'stock.expiring',
} as const;
