export const AGENT_TRAIL_SEGMENT_DRAWING_GUIDE = `# Trail segment drawing guide (desktop MCP)

Use this workflow when creating trail/path segments via apply_feature_patch or related tools.

## Critical rule: coordinates must match control point locations

**The most common agent failure mode** is passing incorrect coordinates that place the segment far off-screen.

Before creating a segment between control points:

1. **Always call list_control_points** to get the EXACT latitude/longitude of each control point.
2. **Use those coordinates directly** as endpoints of your LineString geometry.
3. **Never guess or hallucinate coordinates** — even if you think you know the area.
4. **Verify your segment is near the map viewport** — if your segment's coordinates are >200m from the current viewport center, something is wrong.

## Coordinate format

GeoJSON coordinates are \`[longitude, latitude]\` (NOT \`[latitude, longitude]\`).

- Control points return \`{ latitude, longitude }\`
- Geometry coordinates must be \`[[longitude, latitude], ...]\`

Example: Control point at lat=-1.2375, lng=36.8405 → coordinate \`[36.8405, -1.2375]\`

## Workflow

1. **list_control_points** — get mapId's control points with their WGS84 coordinates.
2. **Identify start/end points** — find the control points you want to connect.
3. **set_map_viewport** — frame the area between the two points at zoom 17–18.
4. **get_rendered_map_view_with_coverage** — capture to visually trace the trail path.
5. **Build geometry** — construct a LineString from start to end:
   - First coordinate = start control point \`[lng, lat]\`
   - Last coordinate = end control point \`[lng, lat]\`
   - Add 3–8 intermediate points following the visible trail curve
   - Intermediate points should be interpolated between start and end, following the trail
6. **apply_feature_patch** — create the segment:
   - \`op: "upsert_segment"\`
   - \`coordinateSpace: "wgs84"\`
   - \`geometry: { type: "LineString", coordinates: [...] }\`
7. **Verify** — call list_feature_segments and confirm the segment coordinates are near the control points.

## Intermediate point estimation

When drawing between two control points and you can see the trail in the capture:

- Divide the path into roughly equal sections
- Each intermediate point should be a slight offset from the straight line, following the trail's curve
- Keep all intermediate coordinates between the start and end lat/lng values
- A straight trail needs only 2–3 intermediate points; a curvy trail needs 5–8

## Sanity checks

Before calling apply_feature_patch, verify:

| Check | How |
|-------|-----|
| Coordinates in bounds | All lngs between start.lng and end.lng (±0.001) |
| Coordinates in bounds | All lats between start.lat and end.lat (±0.001) |
| At least 2 points | LineString requires minimum 2 coordinates |
| Format correct | Each coordinate is \`[longitude, latitude]\` not \`[latitude, longitude]\` |
| Near viewport | Segment center is within 500m of current map viewport center |

## Common mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Using guessed coordinates | Segment renders 1–2 km off-screen, appears "invisible" | Always fetch real control point coords first |
| Swapping lat/lng | Segment ends up in wrong hemisphere or ocean | GeoJSON = \`[lng, lat]\`, control points return \`{ latitude, longitude }\` |
| Using pdf-pixels without conversion | Segment at pixel coords (e.g., [450, 300]) instead of WGS84 | Set coordinateSpace to "wgs84" and use real WGS84 coords |
| Not broadcasting change | Frontend doesn't update until manual refresh | The apply_feature_patch tool handles broadcasting automatically |

## Tool reference

| Tool | Purpose |
|------|---------|
| list_control_points | Get exact WGS84 coordinates of reference points |
| apply_feature_patch | Create/update/delete segments |
| list_feature_segments | Verify created segments |
| set_map_viewport | Frame area before capture |
| get_rendered_map_view_with_coverage | Visual reference for trail path |
| snap_to_reference | Snap a point to existing guide lines |
| snap_trace_to_reference | Snap an entire trace to guide lines |
`;

export const TRAIL_SEGMENT_DRAWING_PROMPT_NAME = "draw_trail_segment";
export const TRAIL_SEGMENT_DRAWING_PROMPT_DESCRIPTION =
  "Guide for correctly drawing trail segments between control points. " +
  "ALWAYS read this before creating segments via apply_feature_patch to avoid coordinate mistakes.";
