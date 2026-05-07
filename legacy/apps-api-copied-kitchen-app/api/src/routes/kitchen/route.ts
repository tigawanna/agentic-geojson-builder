import { db } from "@api/db/client";
import { cuisineType, kitchenCuisine, kitchenProfile, user as userTable } from "@api/db/schema";
import { auth } from "@api/lib/auth";
import { count, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const dayHoursSchema = z.object({
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
});

const operatingHoursSchema = z
  .object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  })
  .partial()
  .optional();

const createKitchenProfileSchema = z.object({
  organizationId: z.string().min(1),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  deliveryRadiusKm: z.string().optional(),
  operatingHours: operatingHoursSchema,
  coverImage: z.string().url().optional().or(z.literal("")),
});

const updateKitchenProfileSchema = createKitchenProfileSchema
  .omit({ organizationId: true })
  .partial();

const setCuisinesSchema = z.object({
  cuisineIds: z.array(z.string().min(1)),
});

function calculateOffset(page: number, perPage: number) {
  return (page - 1) * perPage;
}

function buildPaginatedResponse<T>({
  items,
  page,
  perPage,
  totalItems,
}: {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
}) {
  return {
    items,
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      hasMore: page * perPage < totalItems,
    },
  };
}

function buildOrderBy({
  sortBy,
  sortOrder,
  columnMap,
  defaultColumn,
}: {
  sortBy?: string;
  sortOrder?: string;
  columnMap?: Record<string, any>;
  defaultColumn: any;
}) {
  const column = sortBy && columnMap?.[sortBy] ? columnMap[sortBy] : defaultColumn;
  return sortOrder === "asc" ? column.asc() : column.desc();
}

export const kitchenRoute = new Hono()
  .post("/claim-owner", async (c) => {
    const session = await auth.api.getSession({
      headers: new Headers(c.req.raw.headers),
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (session.user.role === "owner") {
      return c.json({ success: true });
    }

    const [updated] = await db
      .update(userTable)
      .set({ role: "owner" })
      .where(eq(userTable.id, session.user.id))
      .returning({ id: userTable.id, role: userTable.role });

    if (!updated) {
      return c.json({ error: "Failed to update user role" }, 500);
    }

    return c.json({ success: true });
  })
  .post("/profile", async (c) => {
    const raw = await c.req.json();
    const parsed = createKitchenProfileSchema.safeParse(raw);

    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }

    try {
      const id = crypto.randomUUID();
      const [profile] = await db
        .insert(kitchenProfile)
        .values({
          id,
          organizationId: parsed.data.organizationId,
          description: parsed.data.description,
          phone: parsed.data.phone,
          address: parsed.data.address,
          neighborhood: parsed.data.neighborhood,
          deliveryRadiusKm: parsed.data.deliveryRadiusKm,
          operatingHours: parsed.data.operatingHours as any,
          coverImage: parsed.data.coverImage || undefined,
        })
        .returning();

      return c.json({ item: profile }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        return c.json({ error: "A kitchen profile already exists for this organization" }, 409);
      }
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to create kitchen profile" },
        500,
      );
    }
  })
  .patch("/profile/:id", async (c) => {
    const id = c.req.param("id");
    const raw = await c.req.json();
    const parsed = updateKitchenProfileSchema.safeParse(raw);

    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }

    try {
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return c.json({ error: "No fields to update" }, 400);
      }

      const [profile] = await db
        .update(kitchenProfile)
        .set(updateData)
        .where(eq(kitchenProfile.id, id))
        .returning();

      if (!profile) {
        return c.json({ error: "Kitchen profile not found" }, 404);
      }

      return c.json({ item: profile });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to update kitchen profile" },
        500,
      );
    }
  })
  .get("/profile/by-org/:orgId", async (c) => {
    const orgId = c.req.param("orgId");

    try {
      const [profile] = await db
        .select()
        .from(kitchenProfile)
        .where(eq(kitchenProfile.organizationId, orgId))
        .limit(1);

      if (!profile) {
        return c.json({ error: "Kitchen profile not found for this organization" }, 404);
      }

      return c.json({ item: profile });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to fetch kitchen profile" },
        500,
      );
    }
  })
  .get("/cuisines", async (c) => {
    const {
      page = 1,
      perPage = 30,
      searchTerm,
      searchOn,
      sortBy,
      sortOrder = "asc",
    } = c.req.query();
    const pageNum = parseInt(page as string) || 1;
    const perPageNum = parseInt(perPage as string) || 30;
    const offset = calculateOffset(pageNum, perPageNum);

    try {
      const [{ count: totalItems }] = await db.select({ count: count() }).from(cuisineType);

      const items = await db.select().from(cuisineType).limit(perPageNum).offset(offset);

      return c.json(
        buildPaginatedResponse({ items, page: pageNum, perPage: perPageNum, totalItems }),
      );
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to fetch cuisine types" },
        500,
      );
    }
  })
  .get("/profile/:kitchenId/cuisines", async (c) => {
    const kitchenId = c.req.param("kitchenId");
    const { page = 1, perPage = 30, searchTerm, sortOrder = "asc" } = c.req.query();
    const pageNum = parseInt(page as string) || 1;
    const perPageNum = parseInt(perPage as string) || 30;
    const offset = calculateOffset(pageNum, perPageNum);

    try {
      const [{ count: totalItems }] = await db
        .select({ count: count() })
        .from(kitchenCuisine)
        .innerJoin(cuisineType, eq(kitchenCuisine.cuisineId, cuisineType.id))
        .where(eq(kitchenCuisine.kitchenId, kitchenId));

      const items = await db
        .select({
          cuisineId: kitchenCuisine.cuisineId,
          name: cuisineType.name,
          slug: cuisineType.slug,
          icon: cuisineType.icon,
        })
        .from(kitchenCuisine)
        .innerJoin(cuisineType, eq(kitchenCuisine.cuisineId, cuisineType.id))
        .where(eq(kitchenCuisine.kitchenId, kitchenId))
        .limit(perPageNum)
        .offset(offset);

      return c.json(
        buildPaginatedResponse({ items, page: pageNum, perPage: perPageNum, totalItems }),
      );
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to fetch kitchen cuisines" },
        500,
      );
    }
  })
  .put("/profile/:kitchenId/cuisines", async (c) => {
    const kitchenId = c.req.param("kitchenId");
    const raw = await c.req.json();
    const parsed = setCuisinesSchema.safeParse(raw);

    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }

    try {
      await db.delete(kitchenCuisine).where(eq(kitchenCuisine.kitchenId, kitchenId));

      if (parsed.data.cuisineIds.length > 0) {
        const validCuisines = await db
          .select({ id: cuisineType.id })
          .from(cuisineType)
          .where(inArray(cuisineType.id, parsed.data.cuisineIds));

        const validIds = new Set(validCuisines.map((c) => c.id));

        const inserts = parsed.data.cuisineIds
          .filter((id) => validIds.has(id))
          .map((cuisineId) => ({
            kitchenId,
            cuisineId,
          }));

        if (inserts.length > 0) {
          await db.insert(kitchenCuisine).values(inserts);
        }
      }

      return c.json({ success: true });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to update kitchen cuisines" },
        500,
      );
    }
  });
