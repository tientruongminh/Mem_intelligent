CREATE TYPE "InsightMethod" AS ENUM ('ANOMALY_DETECTION', 'CLUSTERING', 'CLASSIFICATION', 'ASSOCIATION_RULE');
CREATE TYPE "InsightReferenceType" AS ENUM ('CUSTOMER', 'CONVERSATION', 'MESSAGE', 'WORKFLOW_NODE', 'EMPLOYEE');
CREATE TYPE "EmployeeExperienceType" AS ENUM ('OVERALL', 'CUSTOMER_SEGMENT');

ALTER TABLE "insights"
  ADD COLUMN "method" "InsightMethod" NOT NULL DEFAULT 'CLASSIFICATION',
  ADD COLUMN "severity" TEXT,
  ADD COLUMN "analysis_json" JSONB,
  ADD COLUMN "reference_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "reply_suggestions" ADD COLUMN "metadata_json" JSONB;

CREATE TABLE "insight_references" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "insight_id" UUID NOT NULL,
  "reference_type" "InsightReferenceType" NOT NULL,
  "reference_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "excerpt" TEXT,
  "relevance_score" DOUBLE PRECISION,
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insight_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_experiences" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "type" "EmployeeExperienceType" NOT NULL,
  "customer_segment" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "playbook_json" JSONB,
  "evidence_json" JSONB,
  "confidence_score" DOUBLE PRECISION NOT NULL,
  "sample_size" INTEGER NOT NULL,
  "generated_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "employee_experiences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insight_references_insight_id_reference_type_reference_id_key"
  ON "insight_references"("insight_id", "reference_type", "reference_id");
CREATE INDEX "insight_references_organization_id_reference_type_reference_id_idx"
  ON "insight_references"("organization_id", "reference_type", "reference_id");
CREATE INDEX "employee_experiences_organization_id_employee_id_type_idx"
  ON "employee_experiences"("organization_id", "employee_id", "type");

ALTER TABLE "insight_references"
  ADD CONSTRAINT "insight_references_insight_id_fkey"
  FOREIGN KEY ("insight_id") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_experiences"
  ADD CONSTRAINT "employee_experiences_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_daily_metrics"
  ADD CONSTRAINT "employee_daily_metrics_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
