CREATE TABLE "cities" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "city_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conjuntos" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conjuntos" ADD CONSTRAINT "conjuntos_city_code_cities_code_fk" FOREIGN KEY ("city_code") REFERENCES "public"."cities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conjuntos" ADD CONSTRAINT "conjuntos_code_unique" UNIQUE("code");