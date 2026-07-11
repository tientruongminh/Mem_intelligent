-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'SALE', 'ANALYST');

-- CreateEnum
CREATE TYPE "TelegramSessionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "TelegramBotRole" AS ENUM ('SUGGESTION', 'ANALYST');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationOutcome" AS ENUM ('NONE', 'WON', 'LOST', 'STOPPED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkflowGraphStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceRole" AS ENUM ('PRIMARY', 'SUPPORTING', 'CONTEXT');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowOperationType" AS ENUM ('ADD_NODE', 'UPDATE_NODE', 'MERGE_NODES', 'ADD_EDGE', 'UPDATE_EDGE', 'DELETE_NODE', 'DELETE_EDGE', 'NO_CHANGE');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('NODE', 'EDGE', 'GRAPH');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('GENERATED', 'SENT', 'VIEWED', 'USED', 'PARTIALLY_USED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SuggestionReferenceType" AS ENUM ('MESSAGE', 'WORKFLOW_NODE', 'INSIGHT', 'SIMILAR_CONVERSATION', 'EMPLOYEE_EXPERIENCE');

-- CreateEnum
CREATE TYPE "SuggestionFeedbackType" AS ENUM ('USED', 'PARTIALLY_USED', 'NOT_RELEVANT', 'TOO_LONG', 'TOO_FORMAL', 'TOO_AGGRESSIVE', 'REQUEST_ALTERNATIVE');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('SUGGESTION', 'ANALYST');

-- CreateEnum
CREATE TYPE "AssistantDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EMPLOYEE_DAILY', 'TEAM_DAILY', 'MANAGER_DAILY');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('HTML', 'JSON');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATED', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'EMPLOYEE', 'SYSTEM', 'SERVICE', 'AGENT');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('SUCCESS', 'FAILED', 'DENIED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "EmployeeRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_user_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "telegram_user_id" TEXT,
    "phone_masked" TEXT NOT NULL,
    "username" TEXT,
    "encrypted_session" TEXT,
    "status" "TelegramSessionStatus" NOT NULL DEFAULT 'PENDING',
    "last_sync_cursor" TEXT,
    "last_synced_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "telegram_user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bot_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "bot_role" "TelegramBotRole" NOT NULL,
    "telegram_bot_id" TEXT,
    "bot_username" TEXT NOT NULL,
    "openclaw_account_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "telegram_bot_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_bot_bindings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "telegram_bot_account_id" UUID NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "pairing_status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "paired_at" TIMESTAMPTZ(3),
    "last_interaction_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_bot_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "owner_employee_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "telegram_username" TEXT,
    "phone" TEXT,
    "customer_type" TEXT,
    "product_interest" TEXT,
    "lead_score" INTEGER,
    "notes" TEXT,
    "first_contact_at" TIMESTAMPTZ(3),
    "last_contact_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "previous_conversation_id" UUID,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" "ConversationOutcome" NOT NULL DEFAULT 'NONE',
    "current_summary_id" UUID,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "last_customer_message_at" TIMESTAMPTZ(3),
    "last_sale_message_at" TIMESTAMPTZ(3),
    "last_message_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "closed_by_employee_id" UUID,
    "close_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "telegram_user_session_id" UUID NOT NULL,
    "telegram_message_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_employee_id" UUID,
    "sender_customer_id" UUID,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "text_content" TEXT,
    "reply_to_message_id" UUID,
    "sent_at" TIMESTAMPTZ(3) NOT NULL,
    "edited_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "raw_payload_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_summaries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "summary_text" TEXT NOT NULL,
    "customer_needs_json" JSONB,
    "customer_concerns_json" JSONB,
    "products_json" JSONB,
    "commitments_json" JSONB,
    "next_actions_json" JSONB,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_graphs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "current_revision" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkflowGraphStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_graphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_nodes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workflow_graph_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_summary" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "metadata_json" JSONB,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_by_analysis_run_id" UUID,
    "last_updated_by_analysis_run_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edges" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workflow_graph_id" UUID NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata_json" JSONB,
    "created_by_analysis_run_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_node_evidences" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workflow_node_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "evidence_role" "EvidenceRole" NOT NULL DEFAULT 'PRIMARY',
    "excerpt" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_node_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edge_evidences" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workflow_edge_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "excerpt" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_edge_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_analysis_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "workflow_graph_id" UUID NOT NULL,
    "from_message_id" UUID,
    "to_message_id" UUID,
    "base_revision" INTEGER NOT NULL,
    "result_revision" INTEGER,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "input_snapshot_json" JSONB NOT NULL,
    "output_json" JSONB,
    "token_usage_json" JSONB,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_change_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workflow_analysis_run_id" UUID NOT NULL,
    "workflow_graph_id" UUID NOT NULL,
    "operation_type" "WorkflowOperationType" NOT NULL,
    "entity_type" "WorkflowEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_suggestions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "based_on_from_message_id" UUID,
    "based_on_to_message_id" UUID,
    "workflow_revision" INTEGER NOT NULL,
    "suggestion_text" TEXT NOT NULL,
    "short_rationale" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'GENERATED',
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "openclaw_agent_id" TEXT,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,
    "sent_at" TIMESTAMPTZ(3),
    "viewed_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reply_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_suggestion_references" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "reply_suggestion_id" UUID NOT NULL,
    "reference_type" "SuggestionReferenceType" NOT NULL,
    "message_id" UUID,
    "workflow_node_id" UUID,
    "insight_id" UUID,
    "source_conversation_id" UUID,
    "excerpt" TEXT,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_suggestion_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_suggestion_feedback" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "reply_suggestion_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "feedback_type" "SuggestionFeedbackType" NOT NULL,
    "feedback_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_suggestion_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "telegram_bot_account_id" UUID NOT NULL,
    "openclaw_session_key" TEXT NOT NULL,
    "active_customer_id" UUID,
    "active_conversation_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_interaction_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assistant_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_interactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assistant_session_id" UUID NOT NULL,
    "direction" "AssistantDirection" NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "telegram_message_id" TEXT,
    "content" TEXT NOT NULL,
    "related_customer_id" UUID,
    "related_conversation_id" UUID,
    "related_suggestion_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric_name" TEXT,
    "metric_value" DOUBLE PRECISION,
    "baseline_value" DOUBLE PRECISION,
    "sample_size" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "time_window_start" TIMESTAMPTZ(3) NOT NULL,
    "time_window_end" TIMESTAMPTZ(3) NOT NULL,
    "evidence_json" JSONB,
    "status" "InsightStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_daily_metrics" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "assigned_customers" INTEGER NOT NULL,
    "active_conversations" INTEGER NOT NULL,
    "closed_conversations" INTEGER NOT NULL,
    "won_count" INTEGER NOT NULL,
    "lost_count" INTEGER NOT NULL,
    "stopped_count" INTEGER NOT NULL,
    "conversion_rate" DOUBLE PRECISION NOT NULL,
    "average_first_response_seconds" DOUBLE PRECISION,
    "average_close_seconds" DOUBLE PRECISION,
    "median_close_seconds" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "employee_id" UUID,
    "report_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "bucket_name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "checksum" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "generated_at" TIMESTAMPTZ(3),
    "uploaded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "available_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_tool_call_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID,
    "agent_type" "AgentType" NOT NULL,
    "assistant_session_id" UUID,
    "tool_name" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "input_summary_json" JSONB,
    "output_summary_json" JSONB,
    "status" "ToolCallStatus" NOT NULL,
    "duration_ms" INTEGER,
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_tool_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "employees_organization_id_role_idx" ON "employees"("organization_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_employee_code_key" ON "employees"("organization_id", "employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_email_key" ON "employees"("organization_id", "email");

-- CreateIndex
CREATE INDEX "telegram_user_sessions_organization_id_employee_id_status_idx" ON "telegram_user_sessions"("organization_id", "employee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_bot_accounts_organization_id_bot_role_key" ON "telegram_bot_accounts"("organization_id", "bot_role");

-- CreateIndex
CREATE UNIQUE INDEX "employee_bot_bindings_organization_id_employee_id_telegram__key" ON "employee_bot_bindings"("organization_id", "employee_id", "telegram_bot_account_id");

-- CreateIndex
CREATE INDEX "customers_organization_id_last_contact_at_idx" ON "customers"("organization_id", "last_contact_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_owner_employee_id_telegram_user_i_key" ON "customers"("organization_id", "owner_employee_id", "telegram_user_id");

-- CreateIndex
CREATE INDEX "conversations_organization_id_status_last_message_at_idx" ON "conversations"("organization_id", "status", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_organization_id_customer_id_employee_id_statu_idx" ON "conversations"("organization_id", "customer_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE INDEX "messages_organization_id_sent_at_idx" ON "messages"("organization_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_telegram_user_session_id_telegram_message_id_key" ON "messages"("telegram_user_session_id", "telegram_message_id");

-- CreateIndex
CREATE INDEX "conversation_summaries_organization_id_conversation_id_idx" ON "conversation_summaries"("organization_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_summaries_conversation_id_version_key" ON "conversation_summaries"("conversation_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_graphs_conversation_id_key" ON "workflow_graphs"("conversation_id");

-- CreateIndex
CREATE INDEX "workflow_graphs_organization_id_status_idx" ON "workflow_graphs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "workflow_nodes_organization_id_workflow_graph_id_deleted_at_idx" ON "workflow_nodes"("organization_id", "workflow_graph_id", "deleted_at");

-- CreateIndex
CREATE INDEX "workflow_edges_organization_id_workflow_graph_id_deleted_at_idx" ON "workflow_edges"("organization_id", "workflow_graph_id", "deleted_at");

-- CreateIndex
CREATE INDEX "workflow_node_evidences_organization_id_workflow_node_id_idx" ON "workflow_node_evidences"("organization_id", "workflow_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_node_evidences_workflow_node_id_message_id_key" ON "workflow_node_evidences"("workflow_node_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_edge_evidences_workflow_edge_id_message_id_key" ON "workflow_edge_evidences"("workflow_edge_id", "message_id");

-- CreateIndex
CREATE INDEX "workflow_analysis_runs_organization_id_conversation_id_crea_idx" ON "workflow_analysis_runs"("organization_id", "conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_change_logs_organization_id_workflow_graph_id_crea_idx" ON "workflow_change_logs"("organization_id", "workflow_graph_id", "created_at");

-- CreateIndex
CREATE INDEX "reply_suggestions_organization_id_conversation_id_generated_idx" ON "reply_suggestions"("organization_id", "conversation_id", "generated_at");

-- CreateIndex
CREATE INDEX "reply_suggestion_references_organization_id_reply_suggestio_idx" ON "reply_suggestion_references"("organization_id", "reply_suggestion_id");

-- CreateIndex
CREATE INDEX "reply_suggestion_feedback_organization_id_employee_id_creat_idx" ON "reply_suggestion_feedback"("organization_id", "employee_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_sessions_organization_id_employee_id_agent_type_key" ON "assistant_sessions"("organization_id", "employee_id", "agent_type");

-- CreateIndex
CREATE INDEX "assistant_interactions_organization_id_assistant_session_id_idx" ON "assistant_interactions"("organization_id", "assistant_session_id", "created_at");

-- CreateIndex
CREATE INDEX "insights_organization_id_status_time_window_end_idx" ON "insights"("organization_id", "status", "time_window_end");

-- CreateIndex
CREATE UNIQUE INDEX "employee_daily_metrics_organization_id_employee_id_metric_d_key" ON "employee_daily_metrics"("organization_id", "employee_id", "metric_date");

-- CreateIndex
CREATE INDEX "reports_organization_id_report_date_report_type_idx" ON "reports"("organization_id", "report_date", "report_type");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_organization_id_occurred_at_idx" ON "outbox_events"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "mcp_tool_call_logs_organization_id_employee_id_created_at_idx" ON "mcp_tool_call_logs"("organization_id", "employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_employee_id_fkey" FOREIGN KEY ("owner_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_closed_by_employee_id_fkey" FOREIGN KEY ("closed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_previous_conversation_id_fkey" FOREIGN KEY ("previous_conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_telegram_user_session_id_fkey" FOREIGN KEY ("telegram_user_session_id") REFERENCES "telegram_user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_graphs" ADD CONSTRAINT "workflow_graphs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_graph_id_fkey" FOREIGN KEY ("workflow_graph_id") REFERENCES "workflow_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_graph_id_fkey" FOREIGN KEY ("workflow_graph_id") REFERENCES "workflow_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "workflow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "workflow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_node_evidences" ADD CONSTRAINT "workflow_node_evidences_workflow_node_id_fkey" FOREIGN KEY ("workflow_node_id") REFERENCES "workflow_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_node_evidences" ADD CONSTRAINT "workflow_node_evidences_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge_evidences" ADD CONSTRAINT "workflow_edge_evidences_workflow_edge_id_fkey" FOREIGN KEY ("workflow_edge_id") REFERENCES "workflow_edges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge_evidences" ADD CONSTRAINT "workflow_edge_evidences_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_analysis_runs" ADD CONSTRAINT "workflow_analysis_runs_workflow_graph_id_fkey" FOREIGN KEY ("workflow_graph_id") REFERENCES "workflow_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_change_logs" ADD CONSTRAINT "workflow_change_logs_workflow_analysis_run_id_fkey" FOREIGN KEY ("workflow_analysis_run_id") REFERENCES "workflow_analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_suggestions" ADD CONSTRAINT "reply_suggestions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_suggestion_references" ADD CONSTRAINT "reply_suggestion_references_reply_suggestion_id_fkey" FOREIGN KEY ("reply_suggestion_id") REFERENCES "reply_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_suggestion_feedback" ADD CONSTRAINT "reply_suggestion_feedback_reply_suggestion_id_fkey" FOREIGN KEY ("reply_suggestion_id") REFERENCES "reply_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_interactions" ADD CONSTRAINT "assistant_interactions_assistant_session_id_fkey" FOREIGN KEY ("assistant_session_id") REFERENCES "assistant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
