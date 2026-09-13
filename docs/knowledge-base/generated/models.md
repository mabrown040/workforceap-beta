# Prisma schema index

[Machine fields and relationships](models.json) · [Complete relationship diagram](database-relations.mmd)

Declared Prisma schema only. Migration SQL, RLS, triggers, and actual production state require separate inspection. Each relation field is listed; inverse fields are retained.

| Name | Kind | Table mapping | Fields | Source |
| --- | --- | --- | ---: | --- |
| Organization | model | organizations | 34 | [schema:20](../../../prisma/schema.prisma#L20) |
| Chapter | model | chapters | 18 | [schema:61](../../../prisma/schema.prisma#L61) |
| ChapterMember | model | chapter_members | 8 | [schema:85](../../../prisma/schema.prisma#L85) |
| ChapterMeeting | model | chapter_meetings | 9 | [schema:100](../../../prisma/schema.prisma#L100) |
| ChapterCurriculumItem | model | chapter_curriculum_items | 8 | [schema:115](../../../prisma/schema.prisma#L115) |
| User | model | users | 139 | [schema:130](../../../prisma/schema.prisma#L130) |
| Profile | model | profiles | 45 | [schema:320](../../../prisma/schema.prisma#L320) |
| ReadinessChecklist | model | readiness_checklist | 12 | [schema:376](../../../prisma/schema.prisma#L376) |
| Application | model | applications | 15 | [schema:396](../../../prisma/schema.prisma#L396) |
| FundingSource | enum | Prisma default | 5 | [schema:420](../../../prisma/schema.prisma#L420) |
| ApplicationStatus | enum | Prisma default | 4 | [schema:428](../../../prisma/schema.prisma#L428) |
| Role | model | roles | 4 | [schema:435](../../../prisma/schema.prisma#L435) |
| UserRole | model | user_roles | 5 | [schema:445](../../../prisma/schema.prisma#L445) |
| Resource | model | resources | 8 | [schema:457](../../../prisma/schema.prisma#L457) |
| ResourceType | enum | Prisma default | 3 | [schema:470](../../../prisma/schema.prisma#L470) |
| JobApplication | model | job_applications | 18 | [schema:476](../../../prisma/schema.prisma#L476) |
| JobApplicationStatus | enum | Prisma default | 7 | [schema:509](../../../prisma/schema.prisma#L509) |
| JobApplicationSource | enum | Prisma default | 4 | [schema:519](../../../prisma/schema.prisma#L519) |
| BenefitRequest | model | benefit_requests | 7 | [schema:526](../../../prisma/schema.prisma#L526) |
| BenefitRequestStatus | enum | Prisma default | 3 | [schema:542](../../../prisma/schema.prisma#L542) |
| ProgramChangeRequest | model | program_change_requests | 13 | [schema:549](../../../prisma/schema.prisma#L549) |
| ProgramChangeRequestStatus | enum | Prisma default | 4 | [schema:571](../../../prisma/schema.prisma#L571) |
| PipelineBoardStage | enum | pipeline_board_stage | 6 | [schema:579](../../../prisma/schema.prisma#L579) |
| MemberStatus | enum | member_status | 3 | [schema:590](../../../prisma/schema.prisma#L590) |
| LearningProgress | model | learning_progress | 8 | [schema:598](../../../prisma/schema.prisma#L598) |
| MemberLabDraft | model | member_lab_drafts | 18 | [schema:615](../../../prisma/schema.prisma#L615) |
| MemberLabSubmission | model | member_lab_submissions | 17 | [schema:643](../../../prisma/schema.prisma#L643) |
| MemberLabReview | model | member_lab_reviews | 11 | [schema:670](../../../prisma/schema.prisma#L670) |
| TrainingStudyPlan | model | training_study_plans | 9 | [schema:687](../../../prisma/schema.prisma#L687) |
| TrainingCourseWork | model | training_course_work | 10 | [schema:705](../../../prisma/schema.prisma#L705) |
| Goal | model | goals | 14 | [schema:723](../../../prisma/schema.prisma#L723) |
| GoalStatus | enum | Prisma default | 3 | [schema:746](../../../prisma/schema.prisma#L746) |
| ResourceProgress | model | resource_progress | 12 | [schema:752](../../../prisma/schema.prisma#L752) |
| MemberEvent | model | member_events | 11 | [schema:773](../../../prisma/schema.prisma#L773) |
| WorkflowDiagnostic | model | workflow_diagnostics | 14 | [schema:796](../../../prisma/schema.prisma#L796) |
| CronExecution | model | cron_executions | 9 | [schema:819](../../../prisma/schema.prisma#L819) |
| WeeklyRecap | model | weekly_recaps | 12 | [schema:836](../../../prisma/schema.prisma#L836) |
| PathwayStepProgress | model | pathway_step_progress | 11 | [schema:856](../../../prisma/schema.prisma#L856) |
| TrainingAccessRequest | model | training_access_requests | 12 | [schema:875](../../../prisma/schema.prisma#L875) |
| TrainingAccessStatus | enum | Prisma default | 7 | [schema:896](../../../prisma/schema.prisma#L896) |
| AutomationRule | model | automation_rules | 9 | [schema:906](../../../prisma/schema.prisma#L906) |
| AIToolResult | model | ai_tool_results | 11 | [schema:920](../../../prisma/schema.prisma#L920) |
| CoachMemory | model | coach_memories | 6 | [schema:945](../../../prisma/schema.prisma#L945) |
| ApplicationAiFeedback | model | application_ai_feedback | 9 | [schema:958](../../../prisma/schema.prisma#L958) |
| ApplicationAiFeedbackHowUsed | enum | application_ai_feedback_how_used | 4 | [schema:975](../../../prisma/schema.prisma#L975) |
| AIToolType | enum | Prisma default | 15 | [schema:984](../../../prisma/schema.prisma#L984) |
| CertStatus | enum | cert_status | 3 | [schema:1002](../../../prisma/schema.prisma#L1002) |
| UserCertification | model | user_certifications | 11 | [schema:1010](../../../prisma/schema.prisma#L1010) |
| BlogPost | model | blog_posts | 14 | [schema:1034](../../../prisma/schema.prisma#L1034) |
| Partner | model | partners | 54 | [schema:1057](../../../prisma/schema.prisma#L1057) |
| PartnerProgramCatalog | model | partner_program_catalog | 8 | [schema:1144](../../../prisma/schema.prisma#L1144) |
| PartnerUser | model | partner_users | 6 | [schema:1160](../../../prisma/schema.prisma#L1160) |
| Counselor | model | counselors | 11 | [schema:1173](../../../prisma/schema.prisma#L1173) |
| CounselorAffiliation | enum | counselor_affiliations | 4 | [schema:1195](../../../prisma/schema.prisma#L1195) |
| CounselorAssignment | model | counselor_assignments | 8 | [schema:1206](../../../prisma/schema.prisma#L1206) |
| MessageThreadKind | enum | message_thread_kind | 3 | [schema:1226](../../../prisma/schema.prisma#L1226) |
| MessageThread | model | message_threads | 19 | [schema:1235](../../../prisma/schema.prisma#L1235) |
| Message | model | messages | 7 | [schema:1264](../../../prisma/schema.prisma#L1264) |
| PartnerReferral | model | partner_referrals | 8 | [schema:1279](../../../prisma/schema.prisma#L1279) |
| SubgroupType | enum | Prisma default | 3 | [schema:1299](../../../prisma/schema.prisma#L1299) |
| MemberSubgroupAssignmentType | enum | Prisma default | 3 | [schema:1305](../../../prisma/schema.prisma#L1305) |
| Subgroup | model | subgroups | 14 | [schema:1311](../../../prisma/schema.prisma#L1311) |
| MemberSubgroup | model | member_subgroups | 9 | [schema:1335](../../../prisma/schema.prisma#L1335) |
| SubgroupLeader | model | subgroup_leaders | 7 | [schema:1354](../../../prisma/schema.prisma#L1354) |
| PlacementRecord | model | placement_records | 21 | [schema:1379](../../../prisma/schema.prisma#L1379) |
| PlacedOutcome | model | placed_outcomes | 11 | [schema:1414](../../../prisma/schema.prisma#L1414) |
| PartnerSignupRequest | model | partner_signup_requests | 11 | [schema:1432](../../../prisma/schema.prisma#L1432) |
| CounselorNote | model | counselor_notes | 8 | [schema:1449](../../../prisma/schema.prisma#L1449) |
| AdvisorSessionNote | model | advisor_session_notes | 8 | [schema:1465](../../../prisma/schema.prisma#L1465) |
| AuditLog | model | audit_logs | 10 | [schema:1481](../../../prisma/schema.prisma#L1481) |
| AuditEvent | model | audit_events | 13 | [schema:1507](../../../prisma/schema.prisma#L1507) |
| WioaReviewSnapshot | model | wioa_review_snapshots | 16 | [schema:1544](../../../prisma/schema.prisma#L1544) |
| InvitationRole | enum | Prisma default | 4 | [schema:1577](../../../prisma/schema.prisma#L1577) |
| InvitationStatus | enum | Prisma default | 4 | [schema:1584](../../../prisma/schema.prisma#L1584) |
| Invitation | model | invitations | 19 | [schema:1591](../../../prisma/schema.prisma#L1591) |
| Employer | model | employers | 39 | [schema:1630](../../../prisma/schema.prisma#L1630) |
| EmployerHiringIntent | model | employer_hiring_intents | 11 | [schema:1682](../../../prisma/schema.prisma#L1682) |
| EmployerScreeningPack | model | employer_screening_packs | 8 | [schema:1702](../../../prisma/schema.prisma#L1702) |
| EmployerSubscription | model | employer_subscriptions | 14 | [schema:1718](../../../prisma/schema.prisma#L1718) |
| JobLocationType | enum | job_location_type | 3 | [schema:1741](../../../prisma/schema.prisma#L1741) |
| JobTypeEnum | enum | job_type_enum | 3 | [schema:1749](../../../prisma/schema.prisma#L1749) |
| JobStatusEnum | enum | job_status_enum | 6 | [schema:1757](../../../prisma/schema.prisma#L1757) |
| Job | model | jobs | 37 | [schema:1768](../../../prisma/schema.prisma#L1768) |
| OrganizationProgramCatalog | model | organization_program_catalog | 23 | [schema:1817](../../../prisma/schema.prisma#L1817) |
| Course | model | courses | 14 | [schema:1854](../../../prisma/schema.prisma#L1854) |
| CourseEnrollment | model | course_enrollments | 19 | [schema:1876](../../../prisma/schema.prisma#L1876) |
| TrainingBillingPacket | model | training_billing_packets | 29 | [schema:1929](../../../prisma/schema.prisma#L1929) |
| XapiStatement | model | xapi_statements | 20 | [schema:1973](../../../prisma/schema.prisma#L1973) |
| CourseProgressStatus | enum | course_progress_status | 3 | [schema:2029](../../../prisma/schema.prisma#L2029) |
| CourseProgress | model | course_progress | 17 | [schema:2038](../../../prisma/schema.prisma#L2038) |
| MemberProgramProgress | model | member_program_progress | 8 | [schema:2071](../../../prisma/schema.prisma#L2071) |
| PreScreeningResponse | model | pre_screening_responses | 13 | [schema:2087](../../../prisma/schema.prisma#L2087) |
| PreScreeningDraft | model | pre_screening_drafts | 13 | [schema:2108](../../../prisma/schema.prisma#L2108) |
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 18 | [schema:2127](../../../prisma/schema.prisma#L2127) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2159](../../../prisma/schema.prisma#L2159) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2176](../../../prisma/schema.prisma#L2176) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2187](../../../prisma/schema.prisma#L2187) |
| ApplicationMessage | model | application_messages | 8 | [schema:2215](../../../prisma/schema.prisma#L2215) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2231](../../../prisma/schema.prisma#L2231) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2250](../../../prisma/schema.prisma#L2250) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2273](../../../prisma/schema.prisma#L2273) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2285](../../../prisma/schema.prisma#L2285) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2306](../../../prisma/schema.prisma#L2306) |
| Mentor | model | mentors | 17 | [schema:2317](../../../prisma/schema.prisma#L2317) |
| MentorSession | model | mentor_sessions | 13 | [schema:2340](../../../prisma/schema.prisma#L2340) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2361](../../../prisma/schema.prisma#L2361) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2370](../../../prisma/schema.prisma#L2370) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2378](../../../prisma/schema.prisma#L2378) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2386](../../../prisma/schema.prisma#L2386) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2413](../../../prisma/schema.prisma#L2413) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2426](../../../prisma/schema.prisma#L2426) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2438](../../../prisma/schema.prisma#L2438) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2450](../../../prisma/schema.prisma#L2450) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2464](../../../prisma/schema.prisma#L2464) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2484](../../../prisma/schema.prisma#L2484) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2498](../../../prisma/schema.prisma#L2498) |
| MemberPoints | model | member_points | 10 | [schema:2519](../../../prisma/schema.prisma#L2519) |
| PointsTransaction | model | points_transactions | 10 | [schema:2536](../../../prisma/schema.prisma#L2536) |
| ReferralCode | model | referral_codes | 5 | [schema:2560](../../../prisma/schema.prisma#L2560) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2574](../../../prisma/schema.prisma#L2574) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2598](../../../prisma/schema.prisma#L2598) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2652](../../../prisma/schema.prisma#L2652) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2675](../../../prisma/schema.prisma#L2675) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2704](../../../prisma/schema.prisma#L2704) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2728](../../../prisma/schema.prisma#L2728) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2764](../../../prisma/schema.prisma#L2764) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2790](../../../prisma/schema.prisma#L2790) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2806](../../../prisma/schema.prisma#L2806) |
| PlacementSurvey | model | placement_surveys | 21 | [schema:2823](../../../prisma/schema.prisma#L2823) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2867](../../../prisma/schema.prisma#L2867) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2875](../../../prisma/schema.prisma#L2875) |
| Testimonial | model | testimonials | 18 | [schema:2884](../../../prisma/schema.prisma#L2884) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2918](../../../prisma/schema.prisma#L2918) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2945](../../../prisma/schema.prisma#L2945) |
| MemberFeedback | model | member_feedback | 8 | [schema:2991](../../../prisma/schema.prisma#L2991) |
| FeatureFlag | model | feature_flags | 9 | [schema:3011](../../../prisma/schema.prisma#L3011) |
| WebhookEvent | model | webhook_events | 13 | [schema:3035](../../../prisma/schema.prisma#L3035) |
| EmailTemplate | model | email_templates | 9 | [schema:3060](../../../prisma/schema.prisma#L3060) |
| Notification | model | notifications | 9 | [schema:3078](../../../prisma/schema.prisma#L3078) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3100](../../../prisma/schema.prisma#L3100) |
| SavedJob | model | saved_jobs | 6 | [schema:3115](../../../prisma/schema.prisma#L3115) |
| WapJob | model | wap_jobs | 8 | [schema:3132](../../../prisma/schema.prisma#L3132) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3151](../../../prisma/schema.prisma#L3151) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3157](../../../prisma/schema.prisma#L3157) |
