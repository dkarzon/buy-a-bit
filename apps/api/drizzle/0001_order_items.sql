-- Multi-product orders: order_items + snapshotted totals; drop orders.product_id

CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_cents" integer;
--> statement-breakpoint
INSERT INTO "order_items" (
	"order_id",
	"product_id",
	"product_name",
	"unit_price_cents",
	"quantity",
	"line_total_cents"
)
SELECT
	o."id",
	o."product_id",
	p."name",
	p."price_cents",
	1,
	p."price_cents"
FROM "orders" o
INNER JOIN "products" p ON p."id" = o."product_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "order_items" oi WHERE oi."order_id" = o."id"
)
AND EXISTS (
	SELECT 1
	FROM information_schema.columns
	WHERE table_name = 'orders' AND column_name = 'product_id'
);
--> statement-breakpoint
UPDATE "orders" o
SET "total_cents" = p."price_cents"
FROM "products" p
WHERE o."product_id" = p."id"
	AND o."total_cents" IS NULL
	AND EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'orders' AND column_name = 'product_id'
	);
--> statement-breakpoint
UPDATE "orders" o
SET "total_cents" = COALESCE((
	SELECT SUM(oi."line_total_cents")
	FROM "order_items" oi
	WHERE oi."order_id" = o."id"
), o."total_cents")
WHERE o."total_cents" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "orders" WHERE "total_cents" IS NULL
	) THEN
		RAISE EXCEPTION 'Cannot set total_cents NOT NULL: some orders still have null totals';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_cents" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'orders' AND column_name = 'product_id'
	) THEN
		ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_product_id_products_id_fk";
		ALTER TABLE "orders" DROP COLUMN "product_id";
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_orders_id_fk'
	) THEN
		ALTER TABLE "order_items"
			ADD CONSTRAINT "order_items_order_id_orders_id_fk"
			FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
			ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_products_id_fk'
	) THEN
		ALTER TABLE "order_items"
			ADD CONSTRAINT "order_items_product_id_products_id_fk"
			FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
			ON DELETE restrict ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");
