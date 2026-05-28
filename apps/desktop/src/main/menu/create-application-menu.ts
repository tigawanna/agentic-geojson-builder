import { app, Menu, shell } from "electron";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";

function buildAppMenu(): Menu {
  const isMac = process.platform === "darwin";
  const isDev = !app.isPackaged;

  const fileSubmenu = [
    {
      label: "New Map Project",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        sendAppMenuAction({ type: "new-map-project" });
      },
    },
    { type: "separator" as const },
    isMac ? { role: "close" as const } : { role: "quit" as const },
  ];

  const editSubmenu = [
    { role: "undo" as const },
    { role: "redo" as const },
    { type: "separator" as const },
    { role: "cut" as const },
    { role: "copy" as const },
    { role: "paste" as const },
    { role: "selectAll" as const },
  ];

  const viewSubmenu = [
    { role: "reload" as const },
    ...(isDev ? [{ role: "toggleDevTools" as const }] : []),
    { type: "separator" as const },
    { role: "resetZoom" as const },
    { role: "zoomIn" as const },
    { role: "zoomOut" as const },
    { type: "separator" as const },
    { role: "togglefullscreen" as const },
  ];

  const goSubmenu = [
    {
      label: "Home",
      accelerator: "CmdOrCtrl+1",
      click: () => {
        sendAppMenuAction({ type: "navigate", path: "/" });
      },
    },
    {
      label: "Maps",
      accelerator: "CmdOrCtrl+2",
      click: () => {
        sendAppMenuAction({ type: "navigate", path: "/maps" });
      },
    },
    {
      label: "Posts",
      accelerator: "CmdOrCtrl+3",
      click: () => {
        sendAppMenuAction({ type: "navigate", path: "/posts" });
      },
    },
    { type: "separator" as const },
    {
      label: "Settings",
      accelerator: "CmdOrCtrl+,",
      click: () => {
        sendAppMenuAction({ type: "navigate", path: "/settings" });
      },
    },
    {
      label: "About",
      click: () => {
        sendAppMenuAction({ type: "navigate", path: "/about" });
      },
    },
  ];

  const helpSubmenu = [
    {
      label: "Check for Updates",
      click: () => {
        sendAppMenuAction({ type: "check-updates" });
      },
    },
    {
      label: "Documentation",
      click: () => {
        void shell.openExternal("https://github.com/");
      },
    },
  ];

  const template: Electron.MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            {
              label: "Settings",
              accelerator: "CmdOrCtrl+,",
              click: () => {
                sendAppMenuAction({ type: "navigate", path: "/settings" });
              },
            },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
        { label: "File", submenu: fileSubmenu },
        { label: "Edit", submenu: editSubmenu },
        { label: "View", submenu: viewSubmenu },
        { label: "Go", submenu: goSubmenu },
        { label: "Window", role: "windowMenu" },
        { label: "Help", submenu: helpSubmenu },
      ]
    : [
        { label: "File", submenu: fileSubmenu },
        { label: "Edit", submenu: editSubmenu },
        { label: "View", submenu: viewSubmenu },
        { label: "Go", submenu: goSubmenu },
        { label: "Help", submenu: helpSubmenu },
      ];

  return Menu.buildFromTemplate(template);
}

export function createApplicationMenu(): void {
  Menu.setApplicationMenu(buildAppMenu());
}
