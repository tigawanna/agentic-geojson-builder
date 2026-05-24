import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { Bot, LoaderCircle, MapPin, Route, Sparkles } from "lucide-react";
import { useState } from "react";

type MapAiPanelProps = {
  mapId: number;
  mapName: string;
  onBeforeSend?: () => Promise<unknown>;
};

export function MapAiPanel({ mapId, mapName, onBeforeSend }: MapAiPanelProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, clear, isLoading, error } = useChat({
    connection: fetchServerSentEvents("/api/ai/map-assistant"),
    body: {
      mapId,
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    if (onBeforeSend) {
      await onBeforeSend();
    }

    await sendMessage(trimmed);
    setInput("");
  }

  async function sendStarter(message: string) {
    if (isLoading) {
      return;
    }

    if (onBeforeSend) {
      await onBeforeSend();
    }

    await sendMessage(message);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4" data-test="map-ai-panel">
      <Card>
        <CardHeader className="px-4 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            Map assistant
          </CardTitle>
          <CardDescription>
            Ask about georeference quality, trail segments, and export readiness for {mapName}. The
            assistant captures the current PDF and map view before each message so tools can inspect
            what you see.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              sendStarter(
                "Load project context and the latest rendered map view, then summarize what you can see on the PDF and map panes.",
              )
            }
            data-test="map-ai-starter-context"
          >
            <Bot className="size-4" />
            Summarize map
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              sendStarter(
                "List trail segments and suggest which groups look incomplete or need more vertices.",
              )
            }
            data-test="map-ai-starter-segments"
          >
            <Route className="size-4" />
            Review trails
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              sendStarter(
                "Explain how I should place the next reference points to improve georeference accuracy.",
              )
            }
            data-test="map-ai-starter-georef"
          >
            <MapPin className="size-4" />
            Georef advice
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || messages.length === 0}
            onClick={clear}
            data-test="map-ai-clear"
          >
            Clear chat
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1">
        <CardContent className="flex h-full min-h-[24rem] flex-col gap-4 p-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-base-content/60 flex flex-1 items-center justify-center rounded-lg border border-dashed border-base-content/15 px-6 py-10 text-center text-sm">
                Start with a prompt above or ask a specific question about this map.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto w-full max-w-3xl rounded-xl border border-base-content/10 bg-base-200 p-4"
                      : "mr-auto w-full max-w-3xl rounded-xl border border-base-content/10 bg-base-100 p-4"
                  }
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-base-content/60">
                    {message.role === "assistant" ? "Assistant" : "You"}
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <p key={index} className="whitespace-pre-wrap leading-6">
                            {part.content}
                          </p>
                        );
                      }

                      if (part.type === "thinking") {
                        return (
                          <p key={index} className="text-xs italic text-base-content/60">
                            Thinking: {part.content}
                          </p>
                        );
                      }

                      if (part.type === "tool-call") {
                        return (
                          <div
                            key={index}
                            className="rounded-md border border-dashed border-base-content/15 bg-base-200/60 px-3 py-2 text-xs text-base-content/70"
                          >
                            Tool: <span className="font-medium text-base-content">{part.name}</span>
                          </div>
                        );
                      }

                      if (part.type === "tool-result") {
                        return (
                          <div
                            key={index}
                            className="rounded-md border border-dashed border-base-content/15 bg-base-200/60 px-3 py-2 text-xs text-base-content/70"
                          >
                            Tool result received
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? (
            <p className="text-sm text-error" data-test="map-ai-error">
              {error.message}
            </p>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 flex-col gap-3 border-t border-base-content/10 pt-4"
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ask about georeference, trail gaps, or whether this map is ready to export..."
              rows={4}
              disabled={isLoading}
              data-test="map-ai-input"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-base-content/60">
                Requires OPENROUTER_API_KEY on the server. Mutations create draft segments only.
              </p>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="min-w-32"
                data-test="map-ai-submit"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
