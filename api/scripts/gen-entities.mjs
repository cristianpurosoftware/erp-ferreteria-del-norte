#!/usr/bin/env node
// Regenerate api/src/entities.generated.ts by scanning every *.entity.ts
// under src/modules/ and producing a static import list + array export.
// TypeORM consumes this list in data-source.ts so it never needs to glob-
// require .ts files at runtime (vitest and ts-node disagree about what
// "require(.ts)" should do).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const apiRoot = join(__dirname, '..');
const modulesDir = join(apiRoot, 'src', 'modules');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(full));
    else if (name.isFile() && name.name.endsWith('.entity.ts')) out.push(full);
  }
  return out;
}

const files = walk(modulesDir).sort();

const entries = files.map((full) => {
  const importPath = './' + relative(join(apiRoot, 'src'), full).replace(/\.ts$/, '');
  const contents = readFileSync(full, 'utf8');
  const match = contents.match(/export\s+class\s+(\w+Entity)/);
  if (!match) throw new Error(`No exported Entity class in ${full}`);
  return { importPath, className: match[1] };
});

const imports = entries.map((e) => `import { ${e.className} } from '${e.importPath}';`).join('\n');
const list = entries.map((e) => `  ${e.className}`).join(',\n');

const out = `// AUTO-GENERATED. Edits to this file will be lost next time scripts/gen-entities.mjs runs.
// Static imports of every module entity so TypeORM does not need a glob-require at runtime.
// Regenerate with: npm run gen:entities

${imports}

export const entityClasses = [
${list},
];
`;

writeFileSync(join(apiRoot, 'src', 'entities.generated.ts'), out);
console.log(`wrote src/entities.generated.ts with ${entries.length} entities`);
