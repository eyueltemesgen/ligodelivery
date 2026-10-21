/**
 * Run the honest-ratings migration against real Postgres (PGlite) and assert
 * the two things that matter:
 *
 *  1. The seeded 4.5 is cleared for shops with no reviews, and a shop with a
 *     real average keeps it.
 *  2. Deleting the last review leaves the shop at 0 ("New") instead of
 *     resurrecting the placeholder the row used to hold.
 *
 * Point 2 is the regression the migration exists for: the old trigger used
 * `COALESCE(avg, s.rating)`, which preserved whatever stale value the row held.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) =>
  readFileSync(resolve(here, `../../supabase/migrations/${name}`), "utf8");

const db = new PGlite();

// Stand-ins for the pieces of the real schema the migration touches. The
// trigger body is copied verbatim from the migration, so what is under test is
// the real function, not a paraphrase.
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;

  CREATE TABLE public.shops (
    id uuid PRIMARY KEY,
    name text,
    rating numeric(2,1) NOT NULL DEFAULT 4.5,
    rating_count int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    is_featured boolean NOT NULL DEFAULT false
  );

  CREATE TABLE public.products (
    id uuid PRIMARY KEY,
    shop_id uuid,
    rating numeric(2,1) NOT NULL DEFAULT 0,
    rating_count int NOT NULL DEFAULT 0
  );

  CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid NOT NULL,
    product_id uuid,
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    is_hidden boolean NOT NULL DEFAULT false
  );

  INSERT INTO public.shops (id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Unreviewed (seeded 4.5)'),
    ('22222222-2222-2222-2222-222222222222', 'Has one real 3-star review'),
    ('33333333-3333-3333-3333-333333333333', 'Unreviewed, seeded then edited');

  UPDATE public.shops SET rating_count = 1 WHERE id = '22222222-2222-2222-2222-222222222222';
  INSERT INTO public.reviews (shop_id, rating) VALUES
    ('22222222-2222-2222-2222-222222222222', 3);
  UPDATE public.shops SET rating = 3.0 WHERE id = '22222222-2222-2222-2222-222222222222';
`);

// The old aggregate function, so the "before" state is real rather than assumed.
await db.exec(`
  CREATE OR REPLACE FUNCTION public.reviews_recompute_aggregates()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    _shops uuid[] := ARRAY[]::uuid[];
    _products uuid[] := ARRAY[]::uuid[];
  BEGIN
    IF TG_OP <> 'DELETE' THEN
      _shops := _shops || NEW.shop_id;
      IF NEW.product_id IS NOT NULL THEN _products := _products || NEW.product_id; END IF;
    END IF;
    IF TG_OP <> 'INSERT' THEN
      _shops := _shops || OLD.shop_id;
      IF OLD.product_id IS NOT NULL THEN _products := _products || OLD.product_id; END IF;
    END IF;
    UPDATE public.shops s SET
      rating_count = (SELECT COUNT(*)::int FROM public.reviews r
                      WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
      rating = COALESCE(
        (SELECT AVG(r.rating)::numeric(2,1) FROM public.reviews r
         WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
        s.rating)
    WHERE s.id = ANY(_shops);
    RETURN NULL;
  END; $$;
  CREATE TRIGGER reviews_aggregate AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.reviews_recompute_aggregates();
`);

const before = await db.query(
  `SELECT name, rating, rating_count FROM public.shops ORDER BY name`,
);
console.log("before:", before.rows.map((r) => `${r.name}=${r.rating}/${r.rating_count}`).join(", "));

await db.exec(read("20261006110000_honest_shop_ratings.sql"));

const after = await db.query(
  `SELECT name, rating, rating_count FROM public.shops ORDER BY name`,
);

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

const get = (name) => after.rows.find((r) => r.name.startsWith(name));
const num = (v) => Number(v);

check(
  "unreviewed shop no longer advertises 4.5",
  num(get("Unreviewed (seeded").rating) === 0,
  `got ${get("Unreviewed (seeded").rating}`,
);
check(
  "unreviewed shop keeps rating_count 0",
  get("Unreviewed (seeded").rating_count === 0,
);
check(
  "shop with a real review keeps its average",
  num(get("Has one real").rating) === 3.0,
  `got ${get("Has one real").rating}`,
);
check(
  "shop with a real review keeps its count",
  get("Has one real").rating_count === 1,
);
check(
  "a seeded-then-edited unreviewed shop is also cleared",
  num(get("Unreviewed, seeded").rating) === 0,
  `got ${get("Unreviewed, seeded").rating}`,
);

// New shops must not inherit the placeholder.
const def = await db.query(`
  SELECT column_default FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'rating'
`);
check(
  "new shops default to 0, not 4.5",
  String(def.rows[0].column_default).startsWith("0"),
  `default ${def.rows[0].column_default}`,
);

// The regression the migration exists for: delete the last review.
await db.exec(`DELETE FROM public.reviews`);
const afterDelete = await db.query(
  `SELECT rating, rating_count FROM public.shops WHERE id = '22222222-2222-2222-2222-222222222222'`,
);
check(
  "deleting the last review leaves 0, not the stale average",
  num(afterDelete.rows[0].rating) === 0 && afterDelete.rows[0].rating_count === 0,
  `got ${afterDelete.rows[0].rating}/${afterDelete.rows[0].rating_count}`,
);

// Re-adding a review must still compute a real average.
await db.exec(`INSERT INTO public.reviews (shop_id, rating) VALUES ('22222222-2222-2222-2222-222222222222', 5)`);
const afterInsert = await db.query(
  `SELECT rating, rating_count FROM public.shops WHERE id = '22222222-2222-2222-2222-222222222222'`,
);
check(
  "a new review still computes the average",
  num(afterInsert.rows[0].rating) === 5.0 && afterInsert.rows[0].rating_count === 1,
  `got ${afterInsert.rows[0].rating}/${afterInsert.rows[0].rating_count}`,
);

// Idempotency: re-running must not change anything.
await db.exec(read("20261006110000_honest_shop_ratings.sql"));
const twice = await db.query(
  `SELECT rating, rating_count FROM public.shops WHERE id = '22222222-2222-2222-2222-222222222222'`,
);
check(
  "migration is idempotent",
  num(twice.rows[0].rating) === 5.0 && twice.rows[0].rating_count === 1,
);

const idx = await db.query(
  `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='shops_ranking_idx'`,
);
check("ranking index created", idx.rows.length === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
