import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = join(scriptDir, "..");
const sourceNodeModulesDir = join(desktopDir, "node_modules");
const stagingNodeModulesDir = join(desktopDir, ".packaging-deps", "node_modules");
const runtimePackages = [
  "sharp",
  "detect-libc",
  "semver",
  "@img/colour",
  "@electric-sql/pglite",
  "@electric-sql/pglite-postgis",
];

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function resolvePackageDir(requireFrom, name) {
  const directPath = join(sourceNodeModulesDir, name);
  if (existsSync(directPath)) {
    return realpathSync(directPath);
  }

  try {
    return dirname(requireFrom.resolve(`${name}/package.json`));
  } catch {
    let current = dirname(requireFrom.resolve(name));
    while (current !== sourceNodeModulesDir && current !== dirname(current)) {
      if (existsSync(join(current, "package.json"))) {
        return realpathSync(current);
      }
      current = dirname(current);
    }
    throw new Error(`Could not resolve runtime package: ${name}`);
  }
}

function copyPackage(requireFrom, name) {
  const sourceDir = resolvePackageDir(requireFrom, name);
  const targetPath = join(stagingNodeModulesDir, name);
  rmSync(targetPath, { recursive: true, force: true });
  ensureDir(dirname(targetPath));
  cpSync(sourceDir, targetPath, { recursive: true, dereference: true });
}

function copySharpPlatformPackages(requireFrom) {
  const sharpPackageDir = resolvePackageDir(requireFrom, "sharp");
  const sharpImgDir = join(dirname(sharpPackageDir), "@img");
  if (!existsSync(sharpImgDir)) {
    return;
  }

  const targetImgDir = join(stagingNodeModulesDir, "@img");
  rmSync(targetImgDir, { recursive: true, force: true });
  ensureDir(targetImgDir);

  for (const entry of readdirSync(sharpImgDir)) {
    cpSync(join(sharpImgDir, entry), join(targetImgDir, entry), {
      recursive: true,
      dereference: true,
    });
  }
}

function main() {
  const requireFromDesktop = createRequire(join(desktopDir, "package.json"));
  const requireFromSharp = createRequire(
    join(resolvePackageDir(requireFromDesktop, "sharp"), "package.json"),
  );

  rmSync(join(desktopDir, ".packaging-deps"), { recursive: true, force: true });
  ensureDir(stagingNodeModulesDir);

  for (const packageName of runtimePackages) {
    if (
      packageName === "detect-libc" ||
      packageName === "semver" ||
      packageName === "@img/colour"
    ) {
      copyPackage(requireFromSharp, packageName);
      continue;
    }
    copyPackage(requireFromDesktop, packageName);
  }

  copySharpPlatformPackages(requireFromDesktop);
  console.log(`Copied runtime packages into ${stagingNodeModulesDir}`);
}

main();
