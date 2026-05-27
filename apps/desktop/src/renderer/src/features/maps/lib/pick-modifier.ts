import { useEffect, useState } from "react";

export function isPickModifierEvent(event: Pick<MouseEvent, "ctrlKey" | "metaKey">) {
  return event.ctrlKey || event.metaKey;
}

export function usePickModifierHeld() {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    function syncFromKeyboard(event: KeyboardEvent) {
      if (event.key === "Control" || event.key === "Meta") {
        setHeld(event.type === "keydown");
      }
    }

    function reset() {
      setHeld(false);
    }

    window.addEventListener("keydown", syncFromKeyboard);
    window.addEventListener("keyup", syncFromKeyboard);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", syncFromKeyboard);
      window.removeEventListener("keyup", syncFromKeyboard);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return held;
}
