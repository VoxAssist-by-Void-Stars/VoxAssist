import fg from "fast-glob";
import { readFile } from "fs/promises";
import path from "path";
import { sha256 } from "./hash";

export interface VaultFile {
  /** Vault-relative path using forward slashes. */
  path: string;
  raw: string;
  fileHash: string;
}

/** Walk a vault directory and return every markdown file (`*.md`, recursive) with raw text + sha256. */
export async function walkVault(vaultDir: string): Promise<VaultFile[]> {
  const absVault = path.resolve(vaultDir);
  const relativePaths = await fg("**/*.md", {
    cwd: absVault,
    onlyFiles: true,
    dot: false,
  });

  relativePaths.sort();

  const files: VaultFile[] = [];
  for (const rel of relativePaths) {
    const absolutePath = path.join(absVault, rel);
    const raw = await readFile(absolutePath, "utf8");
    files.push({
      path: rel.split(path.sep).join("/"),
      raw,
      fileHash: sha256(raw),
    });
  }
  return files;
}
