CREATE TABLE "access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"code" text NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"visitor" text NOT NULL,
	"doc" text DEFAULT '—' NOT NULL,
	"plate" text DEFAULT '' NOT NULL,
	"when_ts" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'vigente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conjuntos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"towers" integer NOT NULL,
	"apts_per_tower" integer NOT NULL,
	"car_spots" integer NOT NULL,
	"moto_spots" integer NOT NULL,
	"visitor_rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conjuntos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"tower" text NOT NULL,
	"apto" text NOT NULL,
	"detail" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parking_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conjunto_id" uuid NOT NULL,
	"type" text NOT NULL,
	"apto_key" text NOT NULL,
	"kind" text NOT NULL,
	"hours" integer NOT NULL,
	"start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parking_spots" (
	"conjunto_id" uuid NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'free' NOT NULL,
	"plate" text DEFAULT '' NOT NULL,
	"apto_key" text DEFAULT '' NOT NULL,
	CONSTRAINT "parking_spots_conjunto_id_id_pk" PRIMARY KEY("conjunto_id","id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_conjunto_id_endpoint_pk" PRIMARY KEY("conjunto_id","endpoint")
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"conjunto_id" uuid NOT NULL,
	"apto_key" text NOT NULL,
	"tower" text NOT NULL,
	"apt" text NOT NULL,
	"phone_enc" text NOT NULL,
	"phone_hash" text NOT NULL,
	"pin_hash" text NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"failed_pins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "residents_conjunto_id_apto_key_pk" PRIMARY KEY("conjunto_id","apto_key")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"conjunto_id" uuid NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "staff_users_conjunto_id_username_pk" PRIMARY KEY("conjunto_id","username")
);
--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_grants" ADD CONSTRAINT "auth_grants_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_conjunto_id_conjuntos_id_fk" FOREIGN KEY ("conjunto_id") REFERENCES "public"."conjuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_log_conjunto_idx" ON "access_log" USING btree ("conjunto_id","ts");--> statement-breakpoint
CREATE INDEX "auth_grants_conjunto_code_idx" ON "auth_grants" USING btree ("conjunto_id","code");--> statement-breakpoint
CREATE INDEX "events_conjunto_idx" ON "events" USING btree ("conjunto_id");--> statement-breakpoint
CREATE INDEX "parking_sessions_conjunto_idx" ON "parking_sessions" USING btree ("conjunto_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_apt_idx" ON "push_subscriptions" USING btree ("conjunto_id","apto_key");--> statement-breakpoint
CREATE INDEX "residents_phone_hash_idx" ON "residents" USING btree ("conjunto_id","phone_hash");