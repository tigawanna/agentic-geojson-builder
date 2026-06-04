export function hotkeyToElectronAccelerator(hotkey: string): string {
  return hotkey
    .split("+")
    .map((part) => {
      if (part === "Mod") {
        return "CmdOrCtrl";
      }
      if (part === "Shift") {
        return "Shift";
      }
      if (part === "Alt") {
        return "Alt";
      }
      if (part === "Meta") {
        return "Cmd";
      }
      if (part === "Control" || part === "Ctrl") {
        return "Ctrl";
      }
      if (part === ",") {
        return ",";
      }
      if (part.length === 1) {
        return part.toUpperCase();
      }
      return part;
    })
    .join("+");
}
