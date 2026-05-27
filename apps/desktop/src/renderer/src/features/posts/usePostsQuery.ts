import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios";

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

async function fetchPosts(): Promise<Post[]> {
  const res = await api.get<Post[]>("/posts", { params: { _limit: 10 } });
  return res.data;
}

export function usePostsQuery() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
}
