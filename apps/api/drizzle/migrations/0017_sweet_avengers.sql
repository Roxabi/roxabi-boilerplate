ALTER TABLE "members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_api_keys_last_four" ON "api_keys" USING btree ("last_four");--> statement-breakpoint
CREATE INDEX "members_deleted_at_idx" ON "members" USING btree ("deleted_at") WHERE "members"."deleted_at" is not null;