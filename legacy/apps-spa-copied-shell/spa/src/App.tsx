import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { themeChange } from "theme-change";
import { queryClient, router } from "./main";
import { useViewer } from "./data-access-layer/users/viewer";

export function App() {
  useEffect(() => {
    document.documentElement.dataset.style = "vertical";
    themeChange(false);
  }, []);
  const { viewer } = useViewer();

  return (
    <>
      <RouterProvider
        router={router}
        defaultPreload="intent"
        context={{
          queryClient,
          viewer,
        }}
      />
    </>
  );
}
