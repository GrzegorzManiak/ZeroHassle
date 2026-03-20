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
