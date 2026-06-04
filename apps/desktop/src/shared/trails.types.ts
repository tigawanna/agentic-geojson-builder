export type TrailMetadata = Record<string, string>;

export type TrailKind = "loop" | "out-and-back" | "connector" | "route";

export const TRAIL_KINDS: TrailKind[] = ["loop", "out-and-back", "connector", "route"];

export type TrailStatus = "draft" | "needs-review" | "accepted" | "rejected";

export type TrailMemberDirection = "forward" | "reverse";

export type TrailMemberRecord = {
  id: number;
  trailId: number;
  segmentEdgeId: number;
  orderIndex: number;
  direction: TrailMemberDirection;
  createdAt: string;
  updatedAt: string;
};

export type TrailRecord = {
  id: number;
  mapId: number;
  slug: string;
  name: string | null;
  kind: TrailKind;
  color: string | null;
  status: TrailStatus;
  metadata: TrailMetadata;
  members: TrailMemberRecord[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTrailInput = {
  mapId: number;
  slug: string;
  name?: string | null;
  kind?: TrailKind;
  color?: string | null;
  status?: TrailStatus;
  metadata?: TrailMetadata;
};

export type UpdateTrailInput = {
  mapId: number;
  trailId: number;
  slug?: string;
  name?: string | null;
  kind?: TrailKind;
  color?: string | null;
  status?: TrailStatus;
  metadata?: TrailMetadata;
};

export type DeleteTrailInput = {
  mapId: number;
  trailId: number;
};

export type SetTrailMembersInput = {
  mapId: number;
  trailId: number;
  members: Array<{
    segmentEdgeId: number;
    orderIndex: number;
    direction?: TrailMemberDirection;
  }>;
};

export type TrailsChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted" | "members-updated";
  trailId?: number;
};
