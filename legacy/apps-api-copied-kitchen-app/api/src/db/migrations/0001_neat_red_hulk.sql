CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kitchen_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_location" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"address" text,
	"neighborhood" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuisine_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	CONSTRAINT "cuisine_type_name_unique" UNIQUE("name"),
	CONSTRAINT "cuisine_type_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kitchen_cuisine" (
	"kitchen_id" text NOT NULL,
	"cuisine_id" text NOT NULL,
	CONSTRAINT "kitchen_cuisine_kitchen_id_cuisine_id_pk" PRIMARY KEY("kitchen_id","cuisine_id")
);
--> statement-breakpoint
CREATE TABLE "kitchen_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"description" text,
	"phone" text,
	"location" geometry(point),
	"address" text,
	"neighborhood" text,
	"delivery_radius_km" numeric(5, 2),
	"is_open" boolean DEFAULT false NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"operating_days" text[],
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_profile_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "menu_category" (
	"id" text PRIMARY KEY NOT NULL,
	"kitchen_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" text PRIMARY KEY NOT NULL,
	"kitchen_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_daily_special" boolean DEFAULT false NOT NULL,
	"serving_size" text,
	"preparation_time_mins" integer,
	"dietary_tags" text[],
	"embedding" vector(1536),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorite" ADD CONSTRAINT "customer_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorite" ADD CONSTRAINT "customer_favorite_kitchen_id_kitchen_profile_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchen_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_location" ADD CONSTRAINT "customer_location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_cuisine" ADD CONSTRAINT "kitchen_cuisine_kitchen_id_kitchen_profile_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchen_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_cuisine" ADD CONSTRAINT "kitchen_cuisine_cuisine_id_cuisine_type_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisine_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_profile" ADD CONSTRAINT "kitchen_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_category" ADD CONSTRAINT "menu_category_kitchen_id_kitchen_profile_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchen_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_kitchen_id_kitchen_profile_id_fk" FOREIGN KEY ("kitchen_id") REFERENCES "public"."kitchen_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_category_id_menu_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikey_userId_idx" ON "apikey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_favorite_user_kitchen_uidx" ON "customer_favorite" USING btree ("user_id","kitchen_id");--> statement-breakpoint
CREATE INDEX "customer_favorite_kitchen_id_idx" ON "customer_favorite" USING btree ("kitchen_id");--> statement-breakpoint
CREATE INDEX "customer_location_user_id_idx" ON "customer_location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_location_spatial_idx" ON "customer_location" USING gist ("location");--> statement-breakpoint
CREATE INDEX "kitchen_cuisine_cuisine_id_idx" ON "kitchen_cuisine" USING btree ("cuisine_id");--> statement-breakpoint
CREATE INDEX "kitchen_profile_spatial_open_idx" ON "kitchen_profile" USING gist ("location") WHERE is_open = true;--> statement-breakpoint
CREATE INDEX "kitchen_profile_neighborhood_idx" ON "kitchen_profile" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "menu_category_kitchen_id_idx" ON "menu_category" USING btree ("kitchen_id");--> statement-breakpoint
CREATE INDEX "menu_item_kitchen_available_idx" ON "menu_item" USING btree ("kitchen_id","is_available");--> statement-breakpoint
CREATE INDEX "menu_item_category_id_idx" ON "menu_item" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "menu_item_search_idx" ON "menu_item" USING gin ((
        setweight(to_tsvector('simple', "name"), 'A') ||
        setweight(to_tsvector('simple', coalesce("description", '')), 'B')
      ));