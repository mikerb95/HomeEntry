CREATE TABLE "reserve_fund_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_enc" text NOT NULL,
	"concept_enc" text NOT NULL,
	"movement_date" timestamp with time zone NOT NULL,
	"registered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "fondo_imprevistos_pct" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "reserve_fund_movements" ADD CONSTRAINT "reserve_fund_movements_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reserve_fund_movements_conjunto_idx" ON "reserve_fund_movements" USING btree ("conjunto_id");