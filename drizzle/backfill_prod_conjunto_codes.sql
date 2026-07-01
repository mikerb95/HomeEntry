-- Backfill manual para PRODUCCIÓN (Neon) — solo si la tabla `conjuntos` YA tiene
-- filas. Si prod está vacía, NO uses esto: basta con `drizzle-kit push`.
--
-- El problema: la migración normal agrega `city_code` y `code` como NOT NULL,
-- y eso falla contra filas existentes que no los tienen. Este script hace el
-- cambio en el orden seguro: columnas nullables -> backfill -> NOT NULL.
--
-- Corre el bloque completo dentro de UNA transacción. Idempotente.
BEGIN;

-- 1. Catálogo de ciudades (mismos códigos que el seed).
CREATE TABLE IF NOT EXISTS "cities" (
  "code" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "department" text NOT NULL
);
INSERT INTO "cities" ("code", "name", "department") VALUES
  ('BOG', 'Bogotá', 'Cundinamarca'),
  ('MDE', 'Medellín', 'Antioquia'),
  ('CLO', 'Cali', 'Valle del Cauca'),
  ('BAQ', 'Barranquilla', 'Atlántico'),
  ('CTG', 'Cartagena', 'Bolívar'),
  ('BGA', 'Bucaramanga', 'Santander'),
  ('PEI', 'Pereira', 'Risaralda')
ON CONFLICT ("code") DO NOTHING;

-- 2. Columnas nuevas, por ahora NULLABLES para poder rellenar.
ALTER TABLE "conjuntos" ADD COLUMN IF NOT EXISTS "city_code" text;
ALTER TABLE "conjuntos" ADD COLUMN IF NOT EXISTS "code" text;

-- 3. (MANUAL) Asigna la ciudad de cada conjunto existente. No se puede adivinar:
--    edita/duplica estas líneas con el slug real de cada conjunto.
--    Ejemplo:
-- UPDATE "conjuntos" SET "city_code" = 'BOG' WHERE "slug" = 'laspalmas';
-- UPDATE "conjuntos" SET "city_code" = 'MDE' WHERE "slug" = 'otro-conjunto';

-- 4. Genera un código único "CIU+4dígitos" para cada conjunto sin código.
--    Requiere que el paso 3 ya haya puesto city_code (si no, aborta con aviso).
DO $$
DECLARE
  r RECORD;
  new_code text;
BEGIN
  IF EXISTS (SELECT 1 FROM "conjuntos" WHERE "city_code" IS NULL) THEN
    RAISE EXCEPTION 'Hay conjuntos sin city_code: completa el paso 3 antes de continuar';
  END IF;

  FOR r IN SELECT "id", "city_code" FROM "conjuntos" WHERE "code" IS NULL LOOP
    LOOP
      new_code := r."city_code" || lpad(floor(random() * 10000)::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "conjuntos" WHERE "code" = new_code);
    END LOOP;
    UPDATE "conjuntos" SET "code" = new_code WHERE "id" = r."id";
  END LOOP;
END $$;

-- 5. Ahora sí, endurece: NOT NULL + FK + UNIQUE (igual que el schema).
ALTER TABLE "conjuntos" ALTER COLUMN "city_code" SET NOT NULL;
ALTER TABLE "conjuntos" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "conjuntos"
  ADD CONSTRAINT "conjuntos_city_code_cities_code_fk"
  FOREIGN KEY ("city_code") REFERENCES "public"."cities"("code");
ALTER TABLE "conjuntos" ADD CONSTRAINT "conjuntos_code_unique" UNIQUE ("code");

COMMIT;
