# RLS Audit Findings — workforceap-beta

Generated: 2026-06-15

## Summary

- Total tables in schema.prisma: 94
- Tables with ENABLE RLS: 74
- Tables with FORCE RLS: 0
- Total policies found: 364

## Critical Findings

### 1. Tenant-owned tables with ENABLE but NO FORCE RLS (74)

These tables have RLS enabled but table owners (service_role) bypass policies. FORCE RLS is required for full tenant isolation.

- `ai_job_matches` (model: AIJobMatch)
- `ai_tool_results` (model: AIToolResult)
- `application_ai_feedback` (model: ApplicationAiFeedback)
- `application_messages` (model: ApplicationMessage)
- `applications` (model: Application)
- `apply_eligibility_screenings` (model: ApplyEligibilityScreening)
- `at_risk_alerts` (model: AtRiskAlert)
- `audit_events` (model: AuditEvent)
- `audit_logs` (model: AuditLog)
- `benefit_requests` (model: BenefitRequest)
- `coach_memories` (model: CoachMemory)
- `counselor_assignments` (model: CounselorAssignment)
- `counselor_notes` (model: CounselorNote)
- `counselors` (model: Counselor)
- `course_enrollments` (model: CourseEnrollment)
- `course_progress` (model: CourseProgress)
- `coursera_badge_progress` (model: CourseraBadgeProgress)
- `coursera_canonical_course_mappings` (model: CourseraCanonicalCourseMapping)
- `coursera_course_progress` (model: CourseraCourseProgress)
- `coursera_identity_mappings` (model: CourseraIdentityMapping)
- `coursera_skillset_progress` (model: CourseraSkillsetProgress)
- `courses` (model: Course)
- `employer_hiring_intents` (model: EmployerHiringIntent)
- `employer_screening_packs` (model: EmployerScreeningPack)
- `employers` (model: Employer)
- `goals` (model: Goal)
- `invitations` (model: Invitation)
- `job_applications` (model: JobApplication)
- `job_posting_applications` (model: JobPostingApplication)
- `jobs` (model: Job)
- `learning_progress` (model: LearningProgress)
- `member_events` (model: MemberEvent)
- `member_next_best_actions` (model: MemberNextBestAction)
- `member_points` (model: MemberPoints)
- `member_program_progress` (model: MemberProgramProgress)
- `member_subgroups` (model: MemberSubgroup)
- `mentor_sessions` (model: MentorSession)
- `mentor_specialties` (model: MentorSpecialty)
- `mentors` (model: Mentor)
- `message_threads` (model: MessageThread)
- `messages` (model: Message)
- `milestone_cascades` (model: MilestoneCascade)
- `organization_program_catalog` (model: OrganizationProgramCatalog)
- `organizations` (model: Organization)
- `partner_outreach_logs` (model: PartnerOutreachLog)
- `partner_referrals` (model: PartnerReferral)
- `partner_users` (model: PartnerUser)
- `partners` (model: Partner)
- `pathway_step_progress` (model: PathwayStepProgress)
- `placed_outcomes` (model: PlacedOutcome)
- `placement_records` (model: PlacementRecord)
- `placement_surveys` (model: PlacementSurvey)
- `points_transactions` (model: PointsTransaction)
- `portal_workflow_events` (model: PortalWorkflowEvent)
- `pre_screening_drafts` (model: PreScreeningDraft)
- `pre_screening_responses` (model: PreScreeningResponse)
- `profiles` (model: Profile)
- `program_change_requests` (model: ProgramChangeRequest)
- `public_wioa_screenings` (model: PublicWioaScreening)
- `readiness_checklist` (model: ReadinessChecklist)
- `referral_codes` (model: ReferralCode)
- `referral_conversions` (model: ReferralConversion)
- `resource_progress` (model: ResourceProgress)
- `resources` (model: Resource)
- `roles` (model: Role)
- `subgroup_leaders` (model: SubgroupLeader)
- `subgroups` (model: Subgroup)
- `testimonials` (model: Testimonial)
- `training_access_requests` (model: TrainingAccessRequest)
- `user_certifications` (model: UserCertification)
- `user_roles` (model: UserRole)
- `users` (model: User)
- `weekly_recaps` (model: WeeklyRecap)
- `xapi_statements` (model: XapiStatement)

### 2. Tenant-owned tables MISSING ENABLE RLS (0)

These tables have no RLS at all. Any authenticated user can access all rows.

None.

### 3. Non-tenant tables with ENABLE but NO FORCE RLS (0)

These are system/global tables where FORCE RLS may not be appropriate (no org_id/user_id column).

None.

### 4. Non-tenant tables MISSING ENABLE RLS (20)

These are system/global tables that may not need RLS (no sensitive tenant data).

- `automation_rules` (model: AutomationRule)
- `blog_posts` (model: BlogPost)
- `career_program_mappings` (model: CareerProgramMapping)
- `career_quiz_rules` (model: CareerQuizRule)
- `cron_executions` (model: CronExecution)
- `email_templates` (model: EmailTemplate)
- `feature_flags` (model: FeatureFlag)
- `member_feedback` (model: MemberFeedback)
- `member_nudge_logs` (model: MemberNudgeLog)
- `notifications` (model: Notification)
- `onet_occupation_skills` (model: OnetOccupationSkill)
- `onet_occupation_tasks` (model: OnetOccupationTask)
- `onet_occupation_tech` (model: OnetOccupationTech)
- `onet_occupations` (model: OnetOccupation)
- `onet_related_occupations` (model: OnetRelatedOccupation)
- `partner_signup_requests` (model: PartnerSignupRequest)
- `tokenized_link` (model: TokenizedLink)
- `wap_jobs` (model: WapJob)
- `webhook_events` (model: WebhookEvent)
- `workflow_diagnostics` (model: WorkflowDiagnostic)

### 5. Duplicate/stale policies (28)

Same policy name defined in multiple migrations/files. The last-applied one wins, but this creates drift risk.

- `applications.applications_select_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `course_enrollments.course_enrollments_select_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `course_enrollments.course_enrollments_update_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `job_applications.job_applications_delete_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `job_applications.job_applications_insert_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `job_applications.job_applications_select_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `job_applications.job_applications_update_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `member_next_best_actions.member_next_best_actions_delete_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `member_next_best_actions.member_next_best_actions_insert_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `member_next_best_actions.member_next_best_actions_select_own`: defined in 20260513040000_add_rls_policies, 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `member_next_best_actions.member_next_best_actions_update_own`: defined in 20260513040000_add_rls_policies, 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_sessions.mentor_sessions_delete_participant`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_sessions.mentor_sessions_insert_participant`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_sessions.mentor_sessions_select_participant`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_sessions.mentor_sessions_update_participant`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_specialties.mentor_specialties_delete_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_specialties.mentor_specialties_insert_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_specialties.mentor_specialties_select_visible`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentor_specialties.mentor_specialties_update_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentors.mentors_select_active`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentors.mentors_select_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `mentors.mentors_update_own`: defined in 20260413183000_enable_rls_for_mentor_and_enrollment_tables.sql, policies.sql
- `profiles.profiles_select_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `profiles.profiles_update_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `resources.resources_select_all`: defined in 20260513040000_add_rls_policies, 20260615000000_nullif_helpers_applications_writes
- `user_roles.user_roles_select_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `users.users_select_own`: defined in 20260513040000_add_rls_policies, policies.sql
- `users.users_update_own`: defined in 20260513040000_add_rls_policies, policies.sql

## Recommendations

1. **Add FORCE RLS** to all tenant-owned tables that currently only have ENABLE RLS.
2. **Add ENABLE RLS** to any tenant-owned tables that are completely missing it.
3. **Consolidate duplicate policies** — remove stale definitions from older migrations or `policies.sql`.
4. **Verify org_id predicates** — ensure all admin/counselor policies use `can_access_org_row()` or equivalent.

## Full Matrix

See `rls_audit_matrix.json` for machine-readable table/policy matrix.
