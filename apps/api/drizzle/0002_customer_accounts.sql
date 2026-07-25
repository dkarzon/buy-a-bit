-- Customer accounts: nullable orders.user_id + customer_payers
-- (one Pinch payer per customer per merchant, at most one vaulted card each)

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_user_id_fk'
	) THEN
		ALTER TABLE "orders"
			ADD CONSTRAINT "orders_user_id_user_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
			ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_payers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"merchant_id" uuid NOT NULL,
	"pinch_payer_id" text NOT NULL,
	"pinch_source_id" text,
	"card_scheme" text,
	"card_last4" text,
	"card_expiry_month" integer,
	"card_expiry_year" integer,
	"card_holder_name" text,
	"card_saved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'customer_payers_user_id_user_id_fk'
	) THEN
		ALTER TABLE "customer_payers"
			ADD CONSTRAINT "customer_payers_user_id_user_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
			ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'customer_payers_merchant_id_merchants_id_fk'
	) THEN
		ALTER TABLE "customer_payers"
			ADD CONSTRAINT "customer_payers_merchant_id_merchants_id_fk"
			FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id")
			ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_payers_user_merchant_idx" ON "customer_payers" USING btree ("user_id","merchant_id");
