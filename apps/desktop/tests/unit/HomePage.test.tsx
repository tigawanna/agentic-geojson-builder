import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../../src/renderer/src/i18n";
import { HomePage } from "../../src/renderer/src/features/home/HomePage";

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.spyOn(window.api, "invoke").mockImplementation(async (channel: string) => {
      if (channel === "app:getVersion") return "1.2.3";
      if (channel === "app:getPlatform") return "darwin";
      return undefined;
    });
  });

  it("renders the heading and shows version/platform from IPC", async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1.2.3")).toBeInTheDocument());
    expect(screen.getByText("darwin")).toBeInTheDocument();
  });
});
