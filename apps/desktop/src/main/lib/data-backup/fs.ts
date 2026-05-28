import { access, cp, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export type DirectoryInventory = {
  fileCount: number;
  sizeBytes: number;
  mapFolderCount: number;
};

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function inventoryDirectory(
  dirPath: string,
  countMapFolders = false,
): Promise<DirectoryInventory> {
  let fileCount = 0;
  let sizeBytes = 0;
  let mapFolderCount = 0;

  async function walk(currentPath: string, isMapsRoot: boolean): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (isMapsRoot && /^\d+$/.test(entry.name)) {
          mapFolderCount += 1;
        }
        await walk(entryPath, false);
        continue;
      }

      if (entry.isFile()) {
        const fileStat = await stat(entryPath);
        fileCount += 1;
        sizeBytes += fileStat.size;
      }
    }
  }

  await walk(dirPath, countMapFolders);
  return { fileCount, sizeBytes, mapFolderCount };
}

export async function copyDirectoryTree(sourceDir: string, targetDir: string): Promise<void> {
  if (!(await pathExists(sourceDir))) {
    return;
  }

  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}

export async function removeDirectory(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export async function finalizeStagingDirectory(
  stagingDir: string,
  finalDir: string,
): Promise<void> {
  if (await pathExists(finalDir)) {
    await removeDirectory(finalDir);
  }
  await rename(stagingDir, finalDir);
}

export async function moveDirectory(sourceDir: string, targetDir: string): Promise<void> {
  if (await pathExists(targetDir)) {
    await removeDirectory(targetDir);
  }
  await mkdir(join(targetDir, ".."), { recursive: true });
  await rename(sourceDir, targetDir);
}
