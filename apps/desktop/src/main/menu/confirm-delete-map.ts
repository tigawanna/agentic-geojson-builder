import { dialog } from "electron";
import type { BrowserWindow } from "electron";

export async function confirmDeleteMap(window: BrowserWindow, mapName: string): Promise<boolean> {
  const { response } = await dialog.showMessageBox(window, {
    type: "warning",
    title: "Delete map project?",
    message: `"${mapName}" and all of its files will be permanently removed.`,
    buttons: ["Cancel", "Delete"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  return response === 1;
}
