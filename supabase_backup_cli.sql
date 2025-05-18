

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_source" AS ENUM (
    'AIRBNB',
    'BOOKING',
    'DIRECT'
);


ALTER TYPE "public"."booking_source" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("operation" "text", "max_operations" integer, "period" interval) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM auth.audit_log_entries
  WHERE actor_id = auth.uid()
    AND event_type = operation
    AND created_at > now() - period;
    
  RETURN recent_count < max_operations;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("operation" "text", "max_operations" integer, "period" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url) -- Adjust fields as needed
  VALUES (new.id, new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url'); -- Example: pulling from metadata if available during signup
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_calendar_sources_profile_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.profile_id = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_calendar_sources_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_user_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "guest_name" "text" NOT NULL,
    "total_amount" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "prepayment" numeric DEFAULT '0'::numeric NOT NULL,
    "source" "public"."booking_source" DEFAULT 'DIRECT'::"public"."booking_source" NOT NULL,
    "airbnb_id" "text",
    "booking_com_id" "text"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bookings"."airbnb_id" IS 'Unique identifier from Airbnb iCal feed';



COMMENT ON COLUMN "public"."bookings"."booking_com_id" IS 'Unique identifier from Booking.com iCal feed';



CREATE TABLE IF NOT EXISTS "public"."expense_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "amount" numeric DEFAULT 0 NOT NULL,
    "date" "date" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "months" integer[],
    CONSTRAINT "valid_months" CHECK ((("months" IS NULL) OR (("array_length"("months", 1) > 0) AND ("array_position"("months", 0) IS NULL) AND ("array_position"("months", 13) IS NULL))))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "avatar_url" "text",
    "website" "text",
    "phone_number" "text",
    "company_name" "text",
    "email" "text",
    "address" "text",
    "vat_number" "text",
    "full_name" "text",
    "airbnb_ical_url" "text",
    "booking_com_ical_url" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."booking_com_ical_url" IS 'URL for Booking.com iCal feed';



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



CREATE INDEX "idx_bookings_airbnb_id" ON "public"."bookings" USING "btree" ("airbnb_id");



CREATE INDEX "idx_bookings_booking_com_id" ON "public"."bookings" USING "btree" ("booking_com_id");



CREATE INDEX "idx_bookings_dates" ON "public"."bookings" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_bookings_source" ON "public"."bookings" USING "btree" ("source");



CREATE INDEX "idx_expenses_months" ON "public"."expenses" USING "gin" ("months");



CREATE OR REPLACE TRIGGER "set_bookings_user_id" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id"();



CREATE OR REPLACE TRIGGER "set_expenses_user_id" BEFORE INSERT ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_user_id"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create their own bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own expenses" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own bookings" ON "public"."bookings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own expenses" ON "public"."expenses" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can only view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own expenses" ON "public"."expenses" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view expense categories" ON "public"."expense_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own expenses" ON "public"."expenses" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


[
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "id",
    "ordinal_position": 1,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "is_primary_key": "YES",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "start_date",
    "ordinal_position": 2,
    "data_type": "date",
    "udt_name": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 0,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "end_date",
    "ordinal_position": 3,
    "data_type": "date",
    "udt_name": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 0,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "guest_name",
    "ordinal_position": 4,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "total_amount",
    "ordinal_position": 5,
    "data_type": "numeric",
    "udt_name": "numeric",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "0",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "notes",
    "ordinal_position": 6,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "created_at",
    "ordinal_position": 7,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": "now()",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "updated_at",
    "ordinal_position": 8,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": "now()",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "user_id",
    "ordinal_position": 9,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": "auth.users(id)",
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "prepayment",
    "ordinal_position": 10,
    "data_type": "numeric",
    "udt_name": "numeric",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "'0'::numeric",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "source",
    "ordinal_position": 11,
    "data_type": "USER-DEFINED",
    "udt_name": "booking_source",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "'DIRECT'::booking_source",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "airbnb_id",
    "ordinal_position": 12,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": "Unique identifier from Airbnb iCal feed"
  },
  {
    "table_schema": "public",
    "table_name": "bookings",
    "table_description": null,
    "column_name": "booking_com_id",
    "ordinal_position": 13,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": "Unique identifier from Booking.com iCal feed"
  },
  {
    "table_schema": "public",
    "table_name": "expense_categories",
    "table_description": null,
    "column_name": "id",
    "ordinal_position": 1,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "is_primary_key": "YES",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expense_categories",
    "table_description": null,
    "column_name": "name",
    "ordinal_position": 2,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expense_categories",
    "table_description": null,
    "column_name": "created_at",
    "ordinal_position": 3,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": "now()",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "id",
    "ordinal_position": 1,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "is_primary_key": "YES",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "category_id",
    "ordinal_position": 2,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": "public.expense_categories(id)",
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "amount",
    "ordinal_position": 3,
    "data_type": "numeric",
    "udt_name": "numeric",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": "0",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "date",
    "ordinal_position": 4,
    "data_type": "date",
    "udt_name": "date",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 0,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "description",
    "ordinal_position": 5,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "created_at",
    "ordinal_position": 6,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": "now()",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "updated_at",
    "ordinal_position": 7,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": "now()",
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "user_id",
    "ordinal_position": 8,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": "auth.users(id)",
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "expenses",
    "table_description": null,
    "column_name": "months",
    "ordinal_position": 9,
    "data_type": "ARRAY",
    "udt_name": "_int4",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "id",
    "ordinal_position": 1,
    "data_type": "uuid",
    "udt_name": "uuid",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "NO",
    "column_default": null,
    "is_primary_key": "YES",
    "foreign_key_references": "auth.users(id)",
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "updated_at",
    "ordinal_position": 2,
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": 6,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "username",
    "ordinal_position": 3,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "avatar_url",
    "ordinal_position": 4,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "website",
    "ordinal_position": 5,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "phone_number",
    "ordinal_position": 6,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "company_name",
    "ordinal_position": 7,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "email",
    "ordinal_position": 8,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "address",
    "ordinal_position": 9,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "vat_number",
    "ordinal_position": 10,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "full_name",
    "ordinal_position": 11,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "airbnb_ical_url",
    "ordinal_position": 12,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": null
  },
  {
    "table_schema": "public",
    "table_name": "profiles",
    "table_description": null,
    "column_name": "booking_com_ical_url",
    "ordinal_position": 13,
    "data_type": "text",
    "udt_name": "text",
    "character_maximum_length": null,
    "numeric_precision": null,
    "numeric_scale": null,
    "datetime_precision": null,
    "is_nullable": "YES",
    "column_default": null,
    "is_primary_key": "NO",
    "foreign_key_references": null,
    "column_description": "URL for Booking.com iCal feed"
  }
]

















































































































































































GRANT ALL ON FUNCTION "public"."check_rate_limit"("operation" "text", "max_operations" integer, "period" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("operation" "text", "max_operations" integer, "period" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("operation" "text", "max_operations" integer, "period" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_calendar_sources_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_calendar_sources_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_calendar_sources_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "service_role";



























GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."expense_categories" TO "anon";
GRANT ALL ON TABLE "public"."expense_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_categories" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
