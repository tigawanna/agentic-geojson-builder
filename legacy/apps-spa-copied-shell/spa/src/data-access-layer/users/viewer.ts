import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

type ViewerUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};
type ViewerSession = {
  id: string;
};
// export type BetterAuthUserRoles = "tenant" | "staff" | "admin" | "manager";
export type TViewer = {
  user?: ViewerUser;
  session?: ViewerSession;
};
export const viewerqueryOptions = queryOptions({
  queryKey: ["viewer"],
  queryFn: async () => {
    const data = {
      user: {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "tenant",
      },
      session: {
        id: "1",
      },
    };
    return { data, error: null };
  },
});

export function useViewer() {
  const qc = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries(viewerqueryOptions);
      // throw redirect({ to: "/auth", search: { returnTo: "/" } });
    },
  });
  const viewerQuery = useSuspenseQuery(viewerqueryOptions);

  return {
    viewerQuery,
    viewer: {
      user: viewerQuery.data.data?.user,
      session: viewerQuery.data.data?.session,
    },
    logoutMutation,
  } as const;
}
