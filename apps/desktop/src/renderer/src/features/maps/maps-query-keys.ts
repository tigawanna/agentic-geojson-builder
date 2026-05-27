export const mapsQueryKeys = {
  all: ["maps"] as const,
  list: () => [...mapsQueryKeys.all, "list"] as const,
};
