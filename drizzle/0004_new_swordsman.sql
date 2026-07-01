CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"pinned" integer DEFAULT 0 NOT NULL,
	"created_by" text DEFAULT 'Administración' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"category" text DEFAULT 'otro' NOT NULL,
	"detail_enc" text NOT NULL,
	"status" text DEFAULT 'abierto' NOT NULL,
	"registered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "owner_units" (
	"owner_id" uuid NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_units_owner_id_conjunto_id_apto_key_pk" PRIMARY KEY("owner_id","conjunto_id","apto_key")
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_enc" text NOT NULL,
	"phone_hash" text NOT NULL,
	"pin_hash" text NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"failed_pins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"subject_enc" text NOT NULL,
	"detail_enc" text NOT NULL,
	"status" text DEFAULT 'abierto' NOT NULL,
	"registered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_units" ADD CONSTRAINT "owner_units_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_units" ADD CONSTRAINT "owner_units_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_conjunto_idx" ON "announcements" USING btree ("conjunto_id","created_at");--> statement-breakpoint
CREATE INDEX "notices_conjunto_apt_idx" ON "notices" USING btree ("conjunto_id","apto_key");--> statement-breakpoint
CREATE INDEX "owner_units_conjunto_apt_idx" ON "owner_units" USING btree ("conjunto_id","apto_key");--> statement-breakpoint
CREATE INDEX "owners_phone_hash_idx" ON "owners" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "service_requests_conjunto_apt_idx" ON "service_requests" USING btree ("conjunto_id","apto_key");