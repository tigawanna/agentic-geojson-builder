import { test, expect, _electron as electron } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");

test("app boots and shows sidebar + home heading", async () => {
  const app = await electron.launch({
    args: [join(projectRoot, "out/main/index.js")],
    cwd: projectRoot,
  });

  const win = await app.firstWindow();
  await win.waitForLoadState("domcontentloaded");

  await expect(win.locator("aside")).toBeVisible();
  await expect(win.locator("h2").first()).toBeVisible();

  await app.close();
});
