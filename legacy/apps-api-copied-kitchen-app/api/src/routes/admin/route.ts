import { db } from "@api/db/client";
import { member, organization, user } from "@api/db/schema";
import { auth } from "@api/lib/auth";
import { and, count, eq, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

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
  return (sortOrder as string) === "asc" ? column.asc() : column.desc();
}

const addMemberRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  role: z.enum(["owner", "manager", "staff"]),
});

const adminRoute = new Hono()
  .get("/", async (c) => {
    return c.json({ message: "hello world", status: "ok" });
  })
  .get("/organizations", async (c) => {
    const { searchTerm, page, perPage, sortBy, sortOrder } = c.req.query();
    const pageNum = parseInt((page as string) || "1") || 1;
    const perPageNum = parseInt((perPage as string) || "30") || 30;
    const offset = calculateOffset(pageNum, perPageNum);

    try {
      let conditions: any[] = [];

      if (searchTerm) {
        conditions.push(
          or(
            ilike(organization.name, `%${searchTerm}%`),
            ilike(organization.slug, `%${searchTerm}%`),
          ),
        );
      }

      const [{ count: totalItems }] = await db
        .select({ count: count() })
        .from(organization)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const items = await db
        .select()
        .from(organization)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(perPageNum)
        .offset(offset)
        .orderBy(buildOrderBy({ sortBy, sortOrder, defaultColumn: organization.createdAt }));

      return c.json(
        buildPaginatedResponse({ items, page: pageNum, perPage: perPageNum, totalItems }),
      );
    } catch (error) {
      return c.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to fetch organizations",
        },
        500,
      );
    }
  })
  .get("/organizations/:id/members", async (c) => {
    const orgId = c.req.param("id");
    const { searchTerm, page, perPage, sortBy, sortOrder } = c.req.query();
    const pageNum = parseInt((page as string) || "1") || 1;
    const perPageNum = parseInt((perPage as string) || "30") || 30;
    const offset = calculateOffset(pageNum, perPageNum);

    try {
      let conditions: any[] = [eq(member.organizationId, orgId)];

      if (searchTerm) {
        conditions.push(
          or(
            ilike(member.role, `%${searchTerm}%`),
            ilike(user.name, `%${searchTerm}%`),
            ilike(user.email, `%${searchTerm}%`),
          ),
        );
      }

      const [{ count: totalItems }] = await db
        .select({ count: count() })
        .from(member)
        .leftJoin(user, eq(member.userId, user.id))
        .where(and(...conditions));

      const membersData = await db
        .select({
          member: member,
          user: user,
        })
        .from(member)
        .leftJoin(user, eq(member.userId, user.id))
        .where(and(...conditions))
        .limit(perPageNum)
        .offset(offset)
        .orderBy(
          buildOrderBy({
            sortBy,
            sortOrder,
            columnMap: { role: member.role, createdAt: member.createdAt },
            defaultColumn: member.createdAt,
          }),
        );

      const items = membersData.map((row) => ({
        ...row.member,
        user: row.user,
      }));

      return c.json(
        buildPaginatedResponse({ items, page: pageNum, perPage: perPageNum, totalItems }),
      );
    } catch (error) {
      return c.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to fetch members",
        },
        500,
      );
    }
  })
  .get("/users", async (c) => {
    const { searchTerm, page, perPage, sortBy, sortOrder } = c.req.query();
    const pageNum = parseInt((page as string) || "1") || 1;
    const perPageNum = parseInt((perPage as string) || "30") || 30;
    const offset = calculateOffset(pageNum, perPageNum);

    try {
      let conditions: any[] = [];

      if (searchTerm) {
        conditions.push(
          or(ilike(user.name, `%${searchTerm}%`), ilike(user.email, `%${searchTerm}%`)),
        );
      }

      const [{ count: totalItems }] = await db
        .select({ count: count() })
        .from(user)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const items = await db
        .select()
        .from(user)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(perPageNum)
        .offset(offset)
        .orderBy(buildOrderBy({ sortBy, sortOrder, defaultColumn: user.createdAt }));

      return c.json(
        buildPaginatedResponse({ items, page: pageNum, perPage: perPageNum, totalItems }),
      );
    } catch (error) {
      return c.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to fetch users",
        },
        500,
      );
    }
  })
  .post("/add-to-organization", async (c) => {
    const raw = await c.req.json();
    const parsed = addMemberRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }

    const result = await auth.api.addMember({
      body: {
        userId: parsed.data.userId,
        organizationId: parsed.data.organizationId,
        role: parsed.data.role,
      },
    });

    return c.json(result);
  });

export { adminRoute };
