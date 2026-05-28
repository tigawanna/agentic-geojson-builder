import { useQuery } from "@tanstack/react-query";
import { api } from "@renderer/lib/axios";

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface PaginatedPosts {
  items: Post[];
}

function isPost(value: unknown): value is Post {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value &&
    "body" in value
  );
}

function normalizePosts(data: unknown): Post[] {
  if (Array.isArray(data)) {
    return data.filter(isPost);
  }

  if (typeof data === "object" && data !== null && "items" in data) {
    const items = (data as PaginatedPosts).items;
    if (Array.isArray(items)) {
      return items.filter(isPost);
    }
  }

  throw new Error("Unexpected posts response shape");
}

async function fetchPosts(): Promise<Post[]> {
  const res = await api.get<unknown>("/posts", { params: { _limit: 10 } });
  return normalizePosts(res.data);
}

export function usePostsQuery() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
}
