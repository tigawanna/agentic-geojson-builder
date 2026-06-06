import { useEffect } from "react";
import { router } from "@renderer/router";
import { useMotionPreferences } from "@renderer/features/motion/MotionPreferencesProvider";

export function RouterPageTransitionSync() {
  const { pageTransitionsEnabled } = useMotionPreferences();

  useEffect(() => {
    router.options.defaultViewTransition = pageTransitionsEnabled;
  }, [pageTransitionsEnabled]);

  return null;
}
