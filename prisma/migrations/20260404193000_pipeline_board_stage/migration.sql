-- Admin pipeline kanban: optional manual column per member (null = derived stage)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_board_stage') THEN
    CREATE TYPE pipeline_board_stage AS ENUM ('applied', 'enrolled', 'in_training', 'certified', 'job_searching', 'placed');
  END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pipeline_board_stage" pipeline_board_stage;
