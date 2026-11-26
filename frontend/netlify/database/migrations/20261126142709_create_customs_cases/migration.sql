CREATE TABLE "customs_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client" text NOT NULL,
	"client_key" text NOT NULL,
	"files" jsonb NOT NULL,
	"record" jsonb NOT NULL,
	"analysis" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "customs_cases_client_idx" ON "customs_cases" ("client_key");--> statement-breakpoint
CREATE INDEX "customs_cases_updated_idx" ON "customs_cases" ("updated_at");