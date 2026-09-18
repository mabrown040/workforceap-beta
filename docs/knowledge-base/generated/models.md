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
| Profile | model | profiles | 46 | [schema:320](../../../prisma/schema.prisma#L320) |
| ReadinessChecklist | model | readiness_checklist | 12 | [schema:378](../../../prisma/schema.prisma#L378) |
| Application | model | applications | 15 | [schema:398](../../../prisma/schema.prisma#L398) |
| FundingSource | enum | Prisma default | 5 | [schema:422](../../../prisma/schema.prisma#L422) |
| ApplicationStatus | enum | Prisma default | 4 | [schema:430](../../../prisma/schema.prisma#L430) |
| Role | model | roles | 4 | [schema:437](../../../prisma/schema.prisma#L437) |
| UserRole | model | user_roles | 5 | [schema:447](../../../prisma/schema.prisma#L447) |
| Resource | model | resources | 8 | [schema:459](../../../prisma/schema.prisma#L459) |
| ResourceType | enum | Prisma default | 3 | [schema:472](../../../prisma/schema.prisma#L472) |
| JobApplication | model | job_applications | 18 | [schema:478](../../../prisma/schema.prisma#L478) |
| JobApplicationStatus | enum | Prisma default | 7 | [schema:511](../../../prisma/schema.prisma#L511) |
| JobApplicationSource | enum | Prisma default | 4 | [schema:521](../../../prisma/schema.prisma#L521) |
| BenefitRequest | model | benefit_requests | 7 | [schema:528](../../../prisma/schema.prisma#L528) |
| BenefitRequestStatus | enum | Prisma default | 3 | [schema:544](../../../prisma/schema.prisma#L544) |
| ProgramChangeRequest | model | program_change_requests | 13 | [schema:551](../../../prisma/schema.prisma#L551) |
| ProgramChangeRequestStatus | enum | Prisma default | 4 | [schema:573](../../../prisma/schema.prisma#L573) |
| PipelineBoardStage | enum | pipeline_board_stage | 6 | [schema:581](../../../prisma/schema.prisma#L581) |
| MemberStatus | enum | member_status | 3 | [schema:592](../../../prisma/schema.prisma#L592) |
| LearningProgress | model | learning_progress | 8 | [schema:600](../../../prisma/schema.prisma#L600) |
| MemberLabDraft | model | member_lab_drafts | 18 | [schema:617](../../../prisma/schema.prisma#L617) |
| MemberLabSubmission | model | member_lab_submissions | 17 | [schema:645](../../../prisma/schema.prisma#L645) |
| MemberLabReview | model | member_lab_reviews | 11 | [schema:672](../../../prisma/schema.prisma#L672) |
| TrainingStudyPlan | model | training_study_plans | 9 | [schema:689](../../../prisma/schema.prisma#L689) |
| TrainingCourseWork | model | training_course_work | 10 | [schema:707](../../../prisma/schema.prisma#L707) |
| Goal | model | goals | 14 | [schema:725](../../../prisma/schema.prisma#L725) |
| GoalStatus | enum | Prisma default | 3 | [schema:748](../../../prisma/schema.prisma#L748) |
| ResourceProgress | model | resource_progress | 12 | [schema:754](../../../prisma/schema.prisma#L754) |
| MemberEvent | model | member_events | 11 | [schema:775](../../../prisma/schema.prisma#L775) |
| WorkflowDiagnostic | model | workflow_diagnostics | 14 | [schema:798](../../../prisma/schema.prisma#L798) |
| CronExecution | model | cron_executions | 9 | [schema:821](../../../prisma/schema.prisma#L821) |
| WeeklyRecap | model | weekly_recaps | 12 | [schema:838](../../../prisma/schema.prisma#L838) |
| PathwayStepProgress | model | pathway_step_progress | 11 | [schema:858](../../../prisma/schema.prisma#L858) |
| TrainingAccessRequest | model | training_access_requests | 12 | [schema:877](../../../prisma/schema.prisma#L877) |
| TrainingAccessStatus | enum | Prisma default | 7 | [schema:898](../../../prisma/schema.prisma#L898) |
| AutomationRule | model | automation_rules | 9 | [schema:908](../../../prisma/schema.prisma#L908) |
| AIToolResult | model | ai_tool_results | 11 | [schema:922](../../../prisma/schema.prisma#L922) |
| CoachMemory | model | coach_memories | 6 | [schema:947](../../../prisma/schema.prisma#L947) |
| ApplicationAiFeedback | model | application_ai_feedback | 9 | [schema:960](../../../prisma/schema.prisma#L960) |
| ApplicationAiFeedbackHowUsed | enum | application_ai_feedback_how_used | 4 | [schema:977](../../../prisma/schema.prisma#L977) |
| AIToolType | enum | Prisma default | 15 | [schema:986](../../../prisma/schema.prisma#L986) |
| CertStatus | enum | cert_status | 3 | [schema:1004](../../../prisma/schema.prisma#L1004) |
| UserCertification | model | user_certifications | 11 | [schema:1012](../../../prisma/schema.prisma#L1012) |
| BlogPost | model | blog_posts | 14 | [schema:1036](../../../prisma/schema.prisma#L1036) |
| Partner | model | partners | 54 | [schema:1059](../../../prisma/schema.prisma#L1059) |
| PartnerProgramCatalog | model | partner_program_catalog | 8 | [schema:1146](../../../prisma/schema.prisma#L1146) |
| PartnerUser | model | partner_users | 6 | [schema:1162](../../../prisma/schema.prisma#L1162) |
| Counselor | model | counselors | 11 | [schema:1175](../../../prisma/schema.prisma#L1175) |
| CounselorAffiliation | enum | counselor_affiliations | 4 | [schema:1197](../../../prisma/schema.prisma#L1197) |
| CounselorAssignment | model | counselor_assignments | 8 | [schema:1208](../../../prisma/schema.prisma#L1208) |
| MessageThreadKind | enum | message_thread_kind | 3 | [schema:1228](../../../prisma/schema.prisma#L1228) |
| MessageThread | model | message_threads | 19 | [schema:1237](../../../prisma/schema.prisma#L1237) |
| Message | model | messages | 7 | [schema:1266](../../../prisma/schema.prisma#L1266) |
| PartnerReferral | model | partner_referrals | 8 | [schema:1281](../../../prisma/schema.prisma#L1281) |
| SubgroupType | enum | Prisma default | 3 | [schema:1301](../../../prisma/schema.prisma#L1301) |
| MemberSubgroupAssignmentType | enum | Prisma default | 3 | [schema:1307](../../../prisma/schema.prisma#L1307) |
| Subgroup | model | subgroups | 14 | [schema:1313](../../../prisma/schema.prisma#L1313) |
| MemberSubgroup | model | member_subgroups | 9 | [schema:1337](../../../prisma/schema.prisma#L1337) |
| SubgroupLeader | model | subgroup_leaders | 7 | [schema:1356](../../../prisma/schema.prisma#L1356) |
| PlacementRecord | model | placement_records | 21 | [schema:1381](../../../prisma/schema.prisma#L1381) |
| PlacedOutcome | model | placed_outcomes | 11 | [schema:1416](../../../prisma/schema.prisma#L1416) |
| PartnerSignupRequest | model | partner_signup_requests | 11 | [schema:1434](../../../prisma/schema.prisma#L1434) |
| CounselorNote | model | counselor_notes | 8 | [schema:1451](../../../prisma/schema.prisma#L1451) |
| AdvisorSessionNote | model | advisor_session_notes | 8 | [schema:1467](../../../prisma/schema.prisma#L1467) |
| AuditLog | model | audit_logs | 10 | [schema:1483](../../../prisma/schema.prisma#L1483) |
| AuditEvent | model | audit_events | 13 | [schema:1509](../../../prisma/schema.prisma#L1509) |
| WioaReviewSnapshot | model | wioa_review_snapshots | 16 | [schema:1546](../../../prisma/schema.prisma#L1546) |
| InvitationRole | enum | Prisma default | 4 | [schema:1579](../../../prisma/schema.prisma#L1579) |
| InvitationStatus | enum | Prisma default | 4 | [schema:1586](../../../prisma/schema.prisma#L1586) |
| Invitation | model | invitations | 19 | [schema:1593](../../../prisma/schema.prisma#L1593) |
| Employer | model | employers | 39 | [schema:1632](../../../prisma/schema.prisma#L1632) |
| EmployerHiringIntent | model | employer_hiring_intents | 11 | [schema:1684](../../../prisma/schema.prisma#L1684) |
| EmployerScreeningPack | model | employer_screening_packs | 8 | [schema:1704](../../../prisma/schema.prisma#L1704) |
| EmployerSubscription | model | employer_subscriptions | 14 | [schema:1720](../../../prisma/schema.prisma#L1720) |
| JobLocationType | enum | job_location_type | 3 | [schema:1743](../../../prisma/schema.prisma#L1743) |
| JobTypeEnum | enum | job_type_enum | 3 | [schema:1751](../../../prisma/schema.prisma#L1751) |
| JobStatusEnum | enum | job_status_enum | 6 | [schema:1759](../../../prisma/schema.prisma#L1759) |
| Job | model | jobs | 37 | [schema:1770](../../../prisma/schema.prisma#L1770) |
| OrganizationProgramCatalog | model | organization_program_catalog | 23 | [schema:1819](../../../prisma/schema.prisma#L1819) |
| Course | model | courses | 14 | [schema:1856](../../../prisma/schema.prisma#L1856) |
| CourseEnrollment | model | course_enrollments | 19 | [schema:1878](../../../prisma/schema.prisma#L1878) |
| TrainingBillingPacket | model | training_billing_packets | 29 | [schema:1931](../../../prisma/schema.prisma#L1931) |
| XapiStatement | model | xapi_statements | 20 | [schema:1975](../../../prisma/schema.prisma#L1975) |
| CourseProgressStatus | enum | course_progress_status | 3 | [schema:2031](../../../prisma/schema.prisma#L2031) |
| CourseProgress | model | course_progress | 17 | [schema:2040](../../../prisma/schema.prisma#L2040) |
| MemberProgramProgress | model | member_program_progress | 8 | [schema:2073](../../../prisma/schema.prisma#L2073) |
| PreScreeningResponse | model | pre_screening_responses | 13 | [schema:2089](../../../prisma/schema.prisma#L2089) |
| PreScreeningDraft | model | pre_screening_drafts | 13 | [schema:2110](../../../prisma/schema.prisma#L2110) |
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 18 | [schema:2129](../../../prisma/schema.prisma#L2129) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2161](../../../prisma/schema.prisma#L2161) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2178](../../../prisma/schema.prisma#L2178) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2189](../../../prisma/schema.prisma#L2189) |
| ApplicationMessage | model | application_messages | 8 | [schema:2217](../../../prisma/schema.prisma#L2217) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2233](../../../prisma/schema.prisma#L2233) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2252](../../../prisma/schema.prisma#L2252) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2275](../../../prisma/schema.prisma#L2275) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2287](../../../prisma/schema.prisma#L2287) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2308](../../../prisma/schema.prisma#L2308) |
| Mentor | model | mentors | 17 | [schema:2319](../../../prisma/schema.prisma#L2319) |
| MentorSession | model | mentor_sessions | 13 | [schema:2342](../../../prisma/schema.prisma#L2342) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2363](../../../prisma/schema.prisma#L2363) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2372](../../../prisma/schema.prisma#L2372) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2380](../../../prisma/schema.prisma#L2380) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2388](../../../prisma/schema.prisma#L2388) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2415](../../../prisma/schema.prisma#L2415) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2428](../../../prisma/schema.prisma#L2428) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2440](../../../prisma/schema.prisma#L2440) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2452](../../../prisma/schema.prisma#L2452) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2466](../../../prisma/schema.prisma#L2466) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2486](../../../prisma/schema.prisma#L2486) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2500](../../../prisma/schema.prisma#L2500) |
| MemberPoints | model | member_points | 10 | [schema:2521](../../../prisma/schema.prisma#L2521) |
| PointsTransaction | model | points_transactions | 10 | [schema:2538](../../../prisma/schema.prisma#L2538) |
| ReferralCode | model | referral_codes | 5 | [schema:2562](../../../prisma/schema.prisma#L2562) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2576](../../../prisma/schema.prisma#L2576) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2600](../../../prisma/schema.prisma#L2600) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2654](../../../prisma/schema.prisma#L2654) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2677](../../../prisma/schema.prisma#L2677) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2706](../../../prisma/schema.prisma#L2706) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2730](../../../prisma/schema.prisma#L2730) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2766](../../../prisma/schema.prisma#L2766) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2792](../../../prisma/schema.prisma#L2792) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2808](../../../prisma/schema.prisma#L2808) |
| PlacementSurvey | model | placement_surveys | 21 | [schema:2825](../../../prisma/schema.prisma#L2825) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2869](../../../prisma/schema.prisma#L2869) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2877](../../../prisma/schema.prisma#L2877) |
| Testimonial | model | testimonials | 18 | [schema:2886](../../../prisma/schema.prisma#L2886) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2920](../../../prisma/schema.prisma#L2920) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2947](../../../prisma/schema.prisma#L2947) |
| MemberFeedback | model | member_feedback | 8 | [schema:2993](../../../prisma/schema.prisma#L2993) |
| FeatureFlag | model | feature_flags | 9 | [schema:3013](../../../prisma/schema.prisma#L3013) |
| WebhookEvent | model | webhook_events | 13 | [schema:3037](../../../prisma/schema.prisma#L3037) |
| EmailTemplate | model | email_templates | 9 | [schema:3062](../../../prisma/schema.prisma#L3062) |
| Notification | model | notifications | 9 | [schema:3080](../../../prisma/schema.prisma#L3080) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3102](../../../prisma/schema.prisma#L3102) |
| SavedJob | model | saved_jobs | 6 | [schema:3117](../../../prisma/schema.prisma#L3117) |
| WapJob | model | wap_jobs | 8 | [schema:3134](../../../prisma/schema.prisma#L3134) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3153](../../../prisma/schema.prisma#L3153) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3159](../../../prisma/schema.prisma#L3159) |
