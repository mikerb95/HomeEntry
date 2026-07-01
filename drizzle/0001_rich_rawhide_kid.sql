CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"period" text NOT NULL,
	"concept" text DEFAULT 'Cuota de administración' NOT NULL,
	"amount_enc" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"amount_enc" text NOT NULL,
	"category" text DEFAULT 'otro' NOT NULL,
	"description_enc" text NOT NULL,
	"invoice_ref_enc" text,
	"expense_date" timestamp with time zone NOT NULL,
	"registered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"amount_enc" text NOT NULL,
	"method" text DEFAULT 'transferencia' NOT NULL,
	"gateway_ref" text,
	"paid_at" timestamp with time zone NOT NULL,
	"registered_by" text NOT NULL,
	"note_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"name_enc" text NOT NULL,
	"category" text DEFAULT 'otro' NOT NULL,
	"tax_id_enc" text,
	"contact_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "mora_rate_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "mora_grace_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charges_conjunto_apt_idx" ON "charges" USING btree ("conjunto_id","apto_key");--> statement-breakpoint
CREATE INDEX "charges_conjunto_period_idx" ON "charges" USING btree ("conjunto_id","period");--> statement-breakpoint
CREATE INDEX "expenses_conjunto_date_idx" ON "expenses" USING btree ("conjunto_id","expense_date");--> statement-breakpoint
CREATE INDEX "expenses_conjunto_vendor_idx" ON "expenses" USING btree ("conjunto_id","vendor_id");--> statement-breakpoint
CREATE INDEX "payments_conjunto_apt_idx" ON "payments" USING btree ("conjunto_id","apto_key");--> statement-breakpoint
CREATE INDEX "vendors_conjunto_idx" ON "vendors" USING btree ("conjunto_id");