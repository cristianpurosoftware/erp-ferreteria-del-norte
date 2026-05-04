# Runbook comercial — Demo Ferretería del Norte

Objetivo: mostrar una demo vendible para ferretería/mostrador sin exponer credenciales ni detalles internos. Este guion asume ambiente de demo controlado y datos cargados con `npm run seed:ferreteria` o con la DB demo ya preparada.

## Posicionamiento

**Ferretería del Norte** es una demo de operación diaria de mostrador: catálogo grande, búsqueda rápida por SKU/nombre, venta POS, ticket/factura simulada, descuento/forma de pago, impacto en stock y reportes operativos.

Mensaje principal para prospectos:

> “En una ferretería el problema no es sólo facturar: es encontrar rápido el producto, confirmar stock, cobrar en mostrador, emitir comprobante y después entender qué se vendió y qué hay que reponer.”

## Recorrido recomendado, 7 minutos

### 1. Dashboard — contexto del negocio

Qué mostrar:
- Ventas del día y evolución reciente.
- Productos con stock bajo o movimiento alto.
- Atajos hacia Mostrador/POS, Catálogo, Stock y Reportes.

Qué decir:
- “Arrancamos por indicadores operativos, no por configuración. El dueño o encargado ve si el día viene bien y dónde necesita actuar.”

Criterio de calidad:
- No debe verse vacío. Si las métricas aparecen en cero pero hay ventas/facturas demo, hay que revisar seed o query de dashboard.

### 2. Mostrador / POS — venta rápida

Ruta sugerida: `/pos`.

Qué mostrar:
- Buscar producto por SKU/nombre.
- Agregar 1–3 ítems al carrito.
- Modificar cantidad o precio si el flujo lo permite.
- Elegir pago contado/efectivo.
- Finalizar venta y mostrar ticket/factura simulada.

SKU de referencia:
- `108050` — Tornillo Drywall Fino 6 x 1" - x 200 Unidades — precio demo ARS 170 — stock seed objetivo: 180 unidades por depósito.
- `131009` — Taladro Percutor 13 mm - HP1630 - 710w — precio demo ARS 246.500 — stock seed objetivo: 12 unidades por depósito.
- `147001` — Cemento de Contacto Fanacola 90 x 40 Grs — precio demo ARS 8.150 — stock seed objetivo: 36 unidades por depósito.
- Antes de una llamada, validar por API/browser que estos SKUs siguen visibles en el ambiente que se va a mostrar. El seed Ferretería fuerza stock suficiente para estos tres SKUs cuando crea filas nuevas.
- Verificación dev 2026-05-04: los 3 SKUs responden por API dev, tienen 3 listas de precio activas (General, Mayorista y USD) y stock disponible agregado suficiente: `108050` 40 unidades, `131009` 42 unidades y `147001` 238 unidades.

Qué decir:
- “El mostrador está optimizado para velocidad: buscar, cobrar e imprimir. Lo fiscal está simulado en demo; en cliente real se conecta el certificado/servicio correspondiente.”

### 3. Catálogo — surtido ferretero realista

Qué mostrar:
- Volumen de productos y categorías ferreteras.
- Búsqueda por producto común: tornillo, grifería, pintura, cable, herramienta.
- Precio/lista y stock relacionado.

Qué decir:
- “No es una demo con 10 productos ficticios. El valor está en trabajar con un catálogo voluminoso y ordenado desde el primer día.”

### 4. Stock — impacto operativo

Qué mostrar:
- Stock por depósito/salón.
- Producto vendido desde POS y su stock disponible.
- Reporte/lista de stock crítico si está cargado.

Qué decir:
- “Cada venta alimenta stock. Esto permite reponer a tiempo y evitar vender lo que no hay.”

### 5. Facturación / ticket — comprobante de venta

Qué mostrar:
- Comprobante generado por la venta.
- Remito/factura imprimible en formato A4 desde el cierre del POS.
- Aclaración visible/verbal de CAE simulado en demo.

Qué decir:
- “En demo usamos CAE simulado. En producción se configura fiscalmente con el cliente. El punto clave comercial es que el mostrador termina con un comprobante imprimible y trazable.”

### 6. Reportes — cierre comercial

Qué mostrar:
- Ventas por día/producto/categoría si están disponibles.
- Productos más vendidos y stock bajo.
- Reportes de caja o comprobantes si están listos.

Qué decir:
- “El cierre no es una pantalla aislada: lo que ocurrió en mostrador se transforma en información para compra, reposición y decisión.”

## Checklist antes de mostrar a un prospecto

- [ ] Frontend carga login y dashboard sin errores visibles.
- [ ] API `/health` responde OK.
- [ ] Usuario demo funciona en ambiente controlado; no poner credenciales en documentación compartible.
- [ ] Existe al menos un SKU estable para buscar en POS.
- [ ] POS puede completar una venta demo sin tocar producción real.
- [ ] La venta genera ticket/factura con indicación de simulación fiscal.
- [ ] Stock refleja o permite explicar el impacto de la venta.
- [ ] Dashboard y reportes no aparecen vacíos.
- [ ] La navegación no abruma: para llamada comercial priorizar Dashboard, Mostrador/POS, Catálogo, Stock, Facturación y Reportes. Activar `NEXT_PUBLIC_DEMO_SCOPE=ferreteria-demo` en el frontend dev para aplicar el recorte y validar con `npm run test:demo-scope`.

## Gaps detectados / próximos ajustes

1. **SKU garantizado para walkthrough**: registrar 2–3 SKUs estables, con nombre, precio y stock suficiente, para no improvisar durante la demo.
2. **Seed Ferretería**: el repo tiene `npm run seed:ferreteria` y `npm run seed:ferreteria:prod`; documentar cuándo usar cada uno y validar si conviene conectarlo al seed principal o mantenerlo explícito.
3. **Navegación demo reducida**: scope versionado en frontend para `NEXT_PUBLIC_DEMO_SCOPE=ferreteria-demo`; mantenerlo cubierto con `npm run test:demo-scope` y configurarlo en el ambiente dev antes de una llamada.
4. **Docs compartibles**: separar este runbook comercial de handoffs internos que puedan contener URLs de infraestructura, usuarios o credenciales.
5. **Smoke dev/prod no destructivo**: mantener una checklist curl/browser que no cree ventas salvo en ambiente dev.

## Notas de seguridad

- No incluir tokens, passwords, DB URLs ni secretos en este documento.
- No hacer ventas de prueba write-heavy contra producción sin aprobación explícita.
- Mantener `main`/producción sin tocar salvo autorización de Cris; los cambios terminados van primero a `dev`.
