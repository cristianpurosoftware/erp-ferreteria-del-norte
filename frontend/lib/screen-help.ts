export const SCREEN_HELP = {
  dashboard:
    "Vista general del negocio. Muestra ventas del día, pedidos pendientes, stock crítico y clientes con saldo vencido.",
  pedidos:
    "Pedidos tomados a clientes con su estado actual (borrador, pendiente, confirmado, en preparación, despachado, entregado). Incluye productos, cantidades, descuentos y condición de entrega.",
  catalogo:
    "Productos disponibles para vender, con precios, stock, marca, categoría y unidad de medida. Permite dar de alta, editar y marcar activos o fuera de línea.",
  stock:
    "Disponibilidad real por depósito y ubicación. Muestra lotes con vencimiento, stock comprometido por pedidos y movimientos (ingresos, egresos, ajustes, transferencias).",
  caja:
    "Movimientos de dinero del día. Cobros, pagos, apertura y cierre de caja, rendiciones y diferencias.",
  "caja/historial":
    "Historial de todas las sesiones de caja. Quién abrió, quién cerró, montos de apertura y cierre, diferencias y notas. Filtrable por caja, usuario, estado y rango de fechas.",
  clientes:
    "Clientes del negocio con condición comercial, fiscal, saldo, historial de pedidos y cobranzas. Permite bloqueos, asignación de vendedor y zona.",
  "comercial/zonas":
    "Áreas comerciales que agrupan clientes por territorio. Ayudan a organizar ventas, rutas y responsables.",
  "comercial/rutas":
    "Secuencias ordenadas de visitas a clientes para preventa o reparto. Cada ruta tiene un vendedor o repartidor asignado.",
  "comercial/promociones":
    "Descuentos, 3x2 y precios especiales por período, producto o cliente. Muestra estado (borrador, activa, vencida) y condiciones.",
  "comercial/comisiones":
    "Comisiones generadas por vendedor cuando un pedido se entrega. Muestra acumuladas, aprobadas y pendientes.",
  "logistica/picking":
    "Preparación de pedidos en depósito. Tareas asignadas, productos a armar y estado de avance hasta el control de salida.",
  "logistica/envios":
    "Despachos con camión y chofer. Muestra paradas, entregas realizadas, rechazos y devoluciones.",
  "logistica/hojas-de-ruta":
    "Documento que agrupa los envíos que salen con un camión. Incluye remitos y comprobantes a entregar.",
  "logistica/vehiculos":
    "Flota disponible para reparto. Patente, capacidad y estado.",
  "logistica/choferes":
    "Repartidores y transportistas. Datos de contacto, vehículo asignado y disponibilidad.",
  "logistica/devoluciones":
    "Mercadería que vuelve al depósito. Clasifica por condición (revendible, dañada, vencida, cuarentena) y genera nota de crédito cuando corresponde.",
  "logistica/conteos":
    "Inventarios físicos, cíclicos o generales. Diferencias quedan documentadas y se aplican como ajuste de stock.",
  cobranzas:
    "Saldo de cada cliente y pagos registrados. Muestra deuda vencida, al día, antigüedad (aging) y medios de cobro.",
  compras:
    "Órdenes de compra a proveedores, con estado (pendiente, parcial, completa) y vínculo con las recepciones de mercadería.",
  "compras/facturas":
    "Facturas recibidas de proveedores, con estado de conciliación contra la orden de compra y el remito (matching 3 vías).",
  "compras/proveedores":
    "Proveedores activos, con condiciones comerciales, plazos de pago y datos fiscales.",
  "compras/remitos-proveedor":
    "Remitos recibidos con la mercadería que entra al depósito.",
  "compras/reclamos":
    "Reclamos a proveedores por faltantes, roturas, vencimientos cortos o diferencias de recepción.",
  comprobantes:
    "Facturas, notas de crédito, notas de débito y remitos emitidos. Estado fiscal, CAE y vínculo con la operación comercial.",
  "comprobantes/remitos":
    "Documentos de entrega emitidos al despachar un pedido.",
  "comprobantes/notas-credito":
    "Comprobantes que devuelven saldo al cliente por devoluciones, errores o acuerdos comerciales.",
  "comprobantes/notas-debito":
    "Comprobantes que suman deuda al cliente por cargos extra o ajustes.",
  "fiscal/jurisdicciones":
    "Dato maestro fiscal. Provincias y municipios donde opera el negocio, con la condición fiscal asociada por cliente (inscripto, no inscripto, exento, convenio multilateral).",
  "fiscal/autorizaciones":
    "Historial de autorizaciones fiscales de comprobantes (CAE/AFIP). Muestra estado, número y resultado de cada validación asociada a facturas emitidas.",
  "tesoreria/cuentas-bancarias":
    "Cuentas propias del negocio. Saldo, movimientos y tipo (corriente, caja de ahorro).",
  "tesoreria/cheques":
    "Cheques recibidos y emitidos. Cartera, depositados, cobrados, rechazados o endosados.",
  "tesoreria/conciliacion":
    "Cruce de los movimientos del extracto bancario con los pagos y cobros registrados para detectar diferencias.",
  "tesoreria/retenciones":
    "Retenciones aplicadas a proveedores y percepciones aplicadas a clientes. IVA, Ganancias, IIBB, SUSS.",
  "tesoreria/retenciones/padrones":
    "Listados oficiales (ARBA, AGIP, Convenio Multilateral) que se usan para calcular percepciones de IIBB por jurisdicción.",
  "tesoreria/ordenes-pago":
    "Pagos programados a proveedores. Muestra vencimiento, estado de aprobación y medio de pago.",
  "tesoreria/batches":
    "Agrupaciones de órdenes de pago para ejecutar en lote (por ejemplo, remesa bancaria).",
  "tesoreria/rendiciones":
    "Dinero que un repartidor o cobrador entrega después de la ruta, con detalle por cliente y medio de cobro.",
  reportes:
    "Vistas resumidas del negocio: ventas por período, rentabilidad, cobranzas y stock crítico. Exportables.",
  "reportes/ventas":
    "Resumen de ventas del período: facturación mensual, evolución diaria, pedidos por estado y top clientes.",
  "reportes/rentabilidad":
    "Margen bruto del período (ingresos vs costos) con detalle por producto y productos de mayor margen.",
  "reportes/cobranzas":
    "Deuda de clientes con aging (al día, 15-30, 30-60, 60+ días), top deudores y totales en mora.",
  "reportes/stock":
    "Indicadores de inventario: productos sin stock, bajo mínimo y ranking de más vendidos.",
  "reportes/avanzados":
    "Reportes detallados con filtros y cruces específicos por área (comercial, logística, cuentas).",
  "cobranzas/cuentas-corrientes":
    "Saldo actual de cada cliente con límite de crédito, % usado y antigüedad (aging) de la deuda.",
  "cobranzas/pagos-registrados":
    "Listado de pagos recibidos con medio de cobro, monto, fecha y cliente asociado.",
  "stock/niveles":
    "Disponibilidad real de cada producto por depósito: disponible, reservado, en tránsito y mínimo.",
  "stock/lotes":
    "Lotes con vencimiento por producto. Estado: activo, bloqueado, vencido o consumido.",
  "stock/ubicaciones":
    "Posiciones físicas dentro del depósito: pick, bulk, cuarentena, devoluciones, staging.",
  "stock/vencimientos":
    "Lotes que vencen en los próximos días, priorizados por urgencia para rotar o bloquear.",
  "stock/movimientos":
    "Historial de ingresos, egresos, ajustes y transferencias de stock con su origen/destino.",
  equipo:
    "Usuarios del sistema, roles, permisos y actividad. Permite crear perfiles y revisar accesos.",
  "equipo/usuarios":
    "Usuarios activos, inactivos y bloqueados. Permite editar rol, datos personales y reiniciar clave.",
  "equipo/roles":
    "Roles y permisos disponibles. Define qué acciones puede realizar cada perfil.",
  "equipo/actividad":
    "Bitácora de acciones sensibles realizadas por los usuarios del sistema.",
  configuracion:
    "Parámetros generales del negocio: sucursales, depósitos, listas de precios, condiciones de pago y tipos de comprobante.",
  "configuracion/empresa":
    "Datos fiscales y de contacto de la empresa: razón social, nombre comercial, teléfono, email y dirección.",
  "configuracion/sucursales":
    "Sucursales o puntos de operación. Cada una puede tener depósitos, cajas y usuarios asignados.",
  "configuracion/depositos":
    "Depósitos físicos o virtuales donde se almacena stock. Cada depósito pertenece a una sucursal.",
  "configuracion/categorias":
    "Categorías de productos. Permiten clasificación jerárquica con una categoría padre opcional.",
  "configuracion/marcas":
    "Marcas asociadas a los productos del catálogo.",
  "configuracion/unidades":
    "Unidades de medida utilizadas en productos (unidades, gramos, mililitros, etc.).",
  "configuracion/impuestos":
    "Impuestos y tasas aplicables a productos y comprobantes. Permite marcar un impuesto por defecto.",
  "configuracion/tipos-comprobante":
    "Tipos de comprobante reconocidos por el sistema: facturas A, B, C, notas de crédito y débito.",
  "configuracion/condiciones-pago":
    "Condiciones de pago por cantidad de días (contado, 30, 60, 90, etc.).",
  "configuracion/metodos-pago":
    "Medios de pago aceptados: efectivo, transferencia, tarjetas, cheques.",
  "configuracion/cajas":
    "Cajas asignadas a sucursales para registrar cobros y pagos. Cada caja puede abrir sesiones.",
  "configuracion/listas-precio":
    "Listas de precio con vigencia y moneda. La lista default se aplica por defecto a nuevos clientes.",
  "configuracion/jurisdicciones":
    "Jurisdicciones fiscales: nación, provincias y municipios. Se usan para retenciones y padrones.",
  auditoria:
    "Registro de acciones sensibles: quién cambió qué y cuándo. Sirve para control interno y trazabilidad.",
  integraciones:
    "Conexiones con sistemas externos (AFIP, mensajería, canales de venta). Estado de sincronización e historial de eventos.",
} as const;
