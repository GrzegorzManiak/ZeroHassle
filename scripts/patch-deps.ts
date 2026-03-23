import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const patchFile = (relativePath: string, applyPatch: (contents: string) => string) => {
  const absolutePath = resolve(root, relativePath);

  if (!existsSync(absolutePath)) {
    console.warn(`[patch:deps] Skipping missing file: ${relativePath}`);
    return;
  }

  const original = readFileSync(absolutePath, 'utf8');
  const updated = applyPatch(original);

  if (updated !== original) {
    writeFileSync(absolutePath, updated, 'utf8');
    console.log(`[patch:deps] Patched ${relativePath}`);
  } else {
    console.log(`[patch:deps] No changes needed for ${relativePath}`);
  }
};

patchFile('node_modules/better-auth/dist/plugins/two-factor/index.mjs', (contents) => {
  const patchedBlock =
    'viewBackupCodes: createAuthEndpoint(\n        "/two-factor/view-backup-codes",\n        {\n          method: "POST",\n          body: z.object({';
  if (contents.includes(patchedBlock)) {
    return contents;
  }

  const duplicatedBrokenBlock =
    'viewBackupCodes: createAuthEndpoint(\n        "/two-factor/view-backup-codes",\n        {\n          method: "GET",\n          method: "POST",\n            userId: z.coerce.string().meta({';
  if (contents.includes(duplicatedBrokenBlock)) {
    return contents.replace(
      duplicatedBrokenBlock,
      'viewBackupCodes: createAuthEndpoint(\n        "/two-factor/view-backup-codes",\n        {\n          method: "POST",\n          body: z.object({\n            userId: z.coerce.string().meta({',
    );
  }

  const cleanBlock =
    'viewBackupCodes: createAuthEndpoint(\n        "/two-factor/view-backup-codes",\n        {\n          method: "GET",\n          body: z.object({';
  if (contents.includes(cleanBlock)) {
    return contents.replace(
      cleanBlock,
      'viewBackupCodes: createAuthEndpoint(\n        "/two-factor/view-backup-codes",\n        {\n          method: "POST",\n          body: z.object({',
    );
  }

  throw new Error('[patch:deps] Could not patch better-auth two-factor endpoint');
});

patchFile('node_modules/novel/dist/index.js', (contents) => {
  if (contents.includes("const Tweet=()=>null;") || !contents.includes("from'react-tweet'")) {
    return contents;
  }

  const tweetImport = "import Dt from'katex';import {Tweet}from'react-tweet';export{default as CharacterCount}";
  if (contents.includes(tweetImport)) {
    return contents.replace(
      tweetImport,
      "import Dt from'katex';const Tweet=()=>null;export{default as CharacterCount}",
    );
  }

  throw new Error('[patch:deps] Could not patch novel react-tweet import');
});

patchFile('node_modules/dormroom/mod.ts', (contents) => {
  return contents
    .replace(
      'import {\n  ExecFn,\n  RawFn,\n  studioMiddleware,\n  StudioOptions,\n  QueryableObject,\n  GetSchemaFn,\n  QueryableHandler,\n} from "queryable-object";',
      'import type {\n  ExecFn,\n  RawFn,\n  StudioOptions,\n  QueryableObject,\n  GetSchemaFn,\n  QueryableHandler,\n} from "queryable-object";\nimport { studioMiddleware } from "queryable-object";'
    )
    .replace('import { getMultiStub, MultiStubConfig } from "multistub";', 'import { getMultiStub, type MultiStubConfig } from "multistub";')
    .replace('if (url.pathname === (studioConfig.pathname || "/db")) {', 'if (url.pathname === ((studioConfig || {} as any).pathname || "/db")) {');
});

patchFile('node_modules/multistub/multistub.ts', (contents) => {
  return contents.replace(
    'const [primaryStub, ...secondaryStubs] = getStubs(namespace, configs);',
    'const [primaryStub, ...secondaryStubs] = getStubs(namespace, configs as any);'
  );
});

patchFile('node_modules/queryable-object/queryable.ts', (contents) => {
  return contents.replace(
    'export { studioMiddleware, StudioOptions } from "./studio-middleware";',
    'export type { StudioOptions } from "./studio-middleware";\nexport { studioMiddleware } from "./studio-middleware";'
  );
});

patchFile('node_modules/queryable-object/studio-middleware.ts', (contents) => {
  return contents.replace(
    'columnNames.reduce((obj, col, idx)',
    'columnNames.reduce((obj: any, col: any, idx: any)'
  );
});

patchFile('node_modules/remote-sql-cursor/do.ts', (contents) => {
  let updated = contents.replace(
    'export {\n  RemoteSqlStorageCursor,\n  exec,\n  makeStub,\n  SqlStorageRow,\n  SqlStorageValue,\n} from "./js";',
    'export type {\n  SqlStorageRow,\n  SqlStorageValue,\n} from "./js";\nexport { RemoteSqlStorageCursor, exec, makeStub } from "./js";'
  );
  updated = updated.replace(/error\.message/g, '(error as any).message');
  return updated;
});

patchFile('node_modules/transferable-object/transferable-object.ts', (contents) => {
  let updated = contents.replace(/undefined,/g, 'undefined as any,');
  updated = updated.replace('return super.fetch(request);', 'return super.fetch!(request);');
  return updated;
});
