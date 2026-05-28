import { createFileRoute } from "@tanstack/react-router";
import { PostsPage } from "@renderer/features/posts/PostsPage";

export const Route = createFileRoute("/posts/")({
  component: PostsPage,
});
