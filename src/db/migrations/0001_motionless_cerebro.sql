ALTER TABLE "inbound_message_log" RENAME COLUMN "twilio_message_sid" TO "whatsapp_message_id";--> statement-breakpoint
ALTER TABLE "bot_bookings" ADD COLUMN "class_name" text;--> statement-breakpoint
ALTER TABLE "conversation_states" ADD COLUMN "bot_paused_until" timestamp with time zone;