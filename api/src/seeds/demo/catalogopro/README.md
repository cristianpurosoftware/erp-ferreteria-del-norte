# Catálogo Pro — seed data

Snapshot del catálogo de productos tomado de los endpoints `AppVendedores` de la
API Razycia (`http://api.razycia.net:11444/RazAPI`). Lo consume `seeds/catalogopro-demo.seed.ts`.

## Archivos

- `catalog-mapped.json` — **el que consume el seed.** Shape: `{ brands, categoriesFlat, products }`.
- `raw/` — respuestas originales de la API, sin transformar. Sirven para debug / regenerar.
  - `articulos.json` — `/api/AppVendedores/Articulos`
  - `categorias.json` — `/api/AppVendedores/Categorias`
  - `marcas.json` — `/api/AppVendedores/Marcas`
  - `lineas.json` — `/api/AppVendedores/Lineas`
  - `rubros.json` — `/api/AppVendedores/Rubros`
  - `proveedores.json` — `/api/AppVendedores/Proveedores`
  - `precios-y-stocks.json` — `/api/AppVendedores/PreciosYStocks?idCliente=1`
- `fetch-and-build.ts` — script para refetch + regenerar `catalog-mapped.json`.

## Regenerar

Requiere un JWT vigente de Razycia (`Bearer ...`).

```bash
RAZYCIA_TOKEN="Bearer eyJhbGciOi..." \
  npx ts-node src/seeds/demo/catalogopro/fetch-and-build.ts
```

Env opcionales:
- `RAZYCIA_BASE_URL` (default `http://api.razycia.net:11444/RazAPI`)
- `RAZYCIA_ID_CLIENTE` (default `1` — `PreciosYStocks` es cliente-scoped).

## Correr el seed

El seed resuelve el path en este orden:
1. `CATALOGOPRO_CATALOG_JSON` env var (si está seteada)
2. `api/src/seeds/demo/catalogopro/catalog-mapped.json` (default, este archivo)
3. `/tmp/catalogopro/catalog-mapped.json` (fallback legacy)

```bash
# Default: levanta todo desde el JSON in-repo
npm run seed

# Re-seedear productos desde cero
CATALOGOPRO_RESET_PRODUCTS=true npm run seed

# Tope de productos (default 500)
CATALOGOPRO_TOP_N=1000 npm run seed
```
