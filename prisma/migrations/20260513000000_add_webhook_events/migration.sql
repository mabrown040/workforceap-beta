    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_source_idx" ON "webhook_events"("source");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "webhook_events_next_retry_at_idx" ON "webhook_events"("next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_events_event_id_idx" ON "webhook_events"("event_id");
