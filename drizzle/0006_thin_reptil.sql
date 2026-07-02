CREATE TABLE "payment_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"total_amount_enc" text NOT NULL,
	"installments" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"registered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_agreements" ADD CONSTRAINT "payment_agreements_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_agreements_conjunto_apt_idx" ON "payment_agreements" USING btree ("conjunto_id","apto_key");