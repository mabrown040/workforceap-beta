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
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 20 | [schema:2127](../../../prisma/schema.prisma#L2127) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2163](../../../prisma/schema.prisma#L2163) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2180](../../../prisma/schema.prisma#L2180) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2191](../../../prisma/schema.prisma#L2191) |
| ApplicationMessage | model | application_messages | 8 | [schema:2219](../../../prisma/schema.prisma#L2219) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2235](../../../prisma/schema.prisma#L2235) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2254](../../../prisma/schema.prisma#L2254) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2277](../../../prisma/schema.prisma#L2277) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2289](../../../prisma/schema.prisma#L2289) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2310](../../../prisma/schema.prisma#L2310) |
| Mentor | model | mentors | 17 | [schema:2321](../../../prisma/schema.prisma#L2321) |
| MentorSession | model | mentor_sessions | 13 | [schema:2344](../../../prisma/schema.prisma#L2344) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2365](../../../prisma/schema.prisma#L2365) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2374](../../../prisma/schema.prisma#L2374) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2382](../../../prisma/schema.prisma#L2382) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2390](../../../prisma/schema.prisma#L2390) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2417](../../../prisma/schema.prisma#L2417) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2430](../../../prisma/schema.prisma#L2430) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2442](../../../prisma/schema.prisma#L2442) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2454](../../../prisma/schema.prisma#L2454) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2468](../../../prisma/schema.prisma#L2468) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2488](../../../prisma/schema.prisma#L2488) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2502](../../../prisma/schema.prisma#L2502) |
| MemberPoints | model | member_points | 10 | [schema:2523](../../../prisma/schema.prisma#L2523) |
| PointsTransaction | model | points_transactions | 10 | [schema:2540](../../../prisma/schema.prisma#L2540) |
| ReferralCode | model | referral_codes | 5 | [schema:2564](../../../prisma/schema.prisma#L2564) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2578](../../../prisma/schema.prisma#L2578) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2602](../../../prisma/schema.prisma#L2602) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2656](../../../prisma/schema.prisma#L2656) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2679](../../../prisma/schema.prisma#L2679) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2708](../../../prisma/schema.prisma#L2708) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2732](../../../prisma/schema.prisma#L2732) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2768](../../../prisma/schema.prisma#L2768) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2794](../../../prisma/schema.prisma#L2794) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2810](../../../prisma/schema.prisma#L2810) |
| PlacementSurvey | model | placement_surveys | 21 | [schema:2827](../../../prisma/schema.prisma#L2827) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2871](../../../prisma/schema.prisma#L2871) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2879](../../../prisma/schema.prisma#L2879) |
| Testimonial | model | testimonials | 18 | [schema:2888](../../../prisma/schema.prisma#L2888) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2922](../../../prisma/schema.prisma#L2922) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2949](../../../prisma/schema.prisma#L2949) |
| MemberFeedback | model | member_feedback | 8 | [schema:2995](../../../prisma/schema.prisma#L2995) |
| FeatureFlag | model | feature_flags | 9 | [schema:3015](../../../prisma/schema.prisma#L3015) |
| WebhookEvent | model | webhook_events | 13 | [schema:3039](../../../prisma/schema.prisma#L3039) |
| EmailTemplate | model | email_templates | 9 | [schema:3064](../../../prisma/schema.prisma#L3064) |
| Notification | model | notifications | 9 | [schema:3082](../../../prisma/schema.prisma#L3082) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3104](../../../prisma/schema.prisma#L3104) |
| SavedJob | model | saved_jobs | 6 | [schema:3119](../../../prisma/schema.prisma#L3119) |
| WapJob | model | wap_jobs | 8 | [schema:3136](../../../prisma/schema.prisma#L3136) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3155](../../../prisma/schema.prisma#L3155) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3161](../../../prisma/schema.prisma#L3161) |
