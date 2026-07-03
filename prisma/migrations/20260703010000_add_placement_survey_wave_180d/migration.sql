-- Add the 180-day placement survey wave.
-- Follows the same pattern as 20260404120000_add_voice_interview_video_ai_tool_type
-- and friends: a bare `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, safe to
-- re-run and safe outside an explicit transaction block.
ALTER TYPE "placement_survey_wave" ADD VALUE IF NOT EXISTS 'hundred_eighty_day';
