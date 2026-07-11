ALTER TYPE "ReportFormat" ADD VALUE IF NOT EXISTS 'LATEX';

ALTER TABLE "customers"
  ADD COLUMN "profile_json" JSONB;

ALTER TABLE "insights"
  ADD COLUMN "explanation_text" TEXT;
