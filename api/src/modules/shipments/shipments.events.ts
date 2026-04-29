export const ShipmentEvents = {
  CREATED: 'shipment.created',
  LOADED: 'shipment.loaded',
  DEPARTED: 'shipment.departed',
  STOP_ARRIVED: 'shipment.stop_arrived',
  STOP_DELIVERED: 'shipment.stop_delivered',
  STOP_REJECTED: 'shipment.stop_rejected',
  STOP_PARTIAL: 'shipment.stop_partial',
  COMPLETED: 'shipment.completed',
  CANCELLED: 'shipment.cancelled',
} as const;
