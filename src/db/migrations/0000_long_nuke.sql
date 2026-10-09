CREATE TABLE IF NOT EXISTS "bot_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"momence_booking_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"momence_session_id" text NOT NULL,
	"class_starts_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"confirmation_sent_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"reminder_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "bot_bookings_momence_booking_id_unique" UNIQUE("momence_booking_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_states" (
	"whatsapp_phone" text PRIMARY KEY NOT NULL,
	"current_state" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbound_message_log" (
	"twilio_message_sid" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_cache" (
	"momence_session_id" text PRIMARY KEY NOT NULL,
	"class_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"instructor" text,
	"spots_available" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_phone" text NOT NULL,
	"momence_customer_id" text,
	"name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_whatsapp_phone_unique" UNIQUE("whatsapp_phone")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_bookings" ADD CONSTRAINT "bot_bookings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_bookings_reminder_due_idx" ON "bot_bookings" USING btree ("class_starts_at","reminder_sent_at");