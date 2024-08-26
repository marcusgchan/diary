ALTER TABLE "diary" ADD COLUMN "deleting" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "deleting" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "image_key" ADD COLUMN "deleting" boolean DEFAULT false NOT NULL;