# Prisma schema index

[Machine fields and relationships](models.json) · [Complete relationship diagram](database-relations.mmd)

Declared Prisma schema only. Migration SQL, RLS, triggers, and actual production state require separate inspection. Each relation field is listed; inverse fields are retained.

| Name | Kind | Table mapping | Fields | Source |
| --- | --- | --- | ---: | --- |
| Organization | model | organizations | 33 | [schema:20](../../../prisma/schema.prisma#L20) |
| Chapter | model | chapters | 18 | [schema:60](../../../prisma/schema.prisma#L60) |
| ChapterMember | model | chapter_members | 8 | [schema:84](../../../prisma/schema.prisma#L84) |
| ChapterMeeting | model | chapter_meetings | 9 | [schema:99](../../../prisma/schema.prisma#L99) |
| ChapterCurriculumItem | model | chapter_curriculum_items | 8 | [schema:114](../../../prisma/schema.prisma#L114) |
| User | model | users | 139 | [schema:129](../../../prisma/schema.prisma#L129) |
| Profile | model | profiles | 45 | [schema:319](../../../prisma/schema.prisma#L319) |
| ReadinessChecklist | model | readiness_checklist | 12 | [schema:375](../../../prisma/schema.prisma#L375) |
| Application | model | applications | 15 | [schema:395](../../../prisma/schema.prisma#L395) |
| FundingSource | enum | Prisma default | 5 | [schema:419](../../../prisma/schema.prisma#L419) |
| ApplicationStatus | enum | Prisma default | 4 | [schema:427](../../../prisma/schema.prisma#L427) |
| Role | model | roles | 4 | [schema:434](../../../prisma/schema.prisma#L434) |
| UserRole | model | user_roles | 5 | [schema:444](../../../prisma/schema.prisma#L444) |
| Resource | model | resources | 8 | [schema:456](../../../prisma/schema.prisma#L456) |
| ResourceType | enum | Prisma default | 3 | [schema:469](../../../prisma/schema.prisma#L469) |
| JobApplication | model | job_applications | 18 | [schema:475](../../../prisma/schema.prisma#L475) |
| JobApplicationStatus | enum | Prisma default | 7 | [schema:508](../../../prisma/schema.prisma#L508) |
| JobApplicationSource | enum | Prisma default | 4 | [schema:518](../../../prisma/schema.prisma#L518) |
| BenefitRequest | model | benefit_requests | 7 | [schema:525](../../../prisma/schema.prisma#L525) |
| BenefitRequestStatus | enum | Prisma default | 3 | [schema:541](../../../prisma/schema.prisma#L541) |
| ProgramChangeRequest | model | program_change_requests | 13 | [schema:548](../../../prisma/schema.prisma#L548) |
| ProgramChangeRequestStatus | enum | Prisma default | 4 | [schema:570](../../../prisma/schema.prisma#L570) |
| PipelineBoardStage | enum | pipeline_board_stage | 6 | [schema:578](../../../prisma/schema.prisma#L578) |
| MemberStatus | enum | member_status | 3 | [schema:589](../../../prisma/schema.prisma#L589) |
| LearningProgress | model | learning_progress | 8 | [schema:597](../../../prisma/schema.prisma#L597) |
| MemberLabDraft | model | member_lab_drafts | 18 | [schema:614](../../../prisma/schema.prisma#L614) |
| MemberLabSubmission | model | member_lab_submissions | 17 | [schema:642](../../../prisma/schema.prisma#L642) |
| MemberLabReview | model | member_lab_reviews | 11 | [schema:669](../../../prisma/schema.prisma#L669) |
| TrainingStudyPlan | model | training_study_plans | 9 | [schema:686](../../../prisma/schema.prisma#L686) |
| TrainingCourseWork | model | training_course_work | 10 | [schema:704](../../../prisma/schema.prisma#L704) |
| Goal | model | goals | 14 | [schema:722](../../../prisma/schema.prisma#L722) |
| GoalStatus | enum | Prisma default | 3 | [schema:745](../../../prisma/schema.prisma#L745) |
| ResourceProgress | model | resource_progress | 12 | [schema:751](../../../prisma/schema.prisma#L751) |
| MemberEvent | model | member_events | 11 | [schema:772](../../../prisma/schema.prisma#L772) |
| WorkflowDiagnostic | model | workflow_diagnostics | 14 | [schema:795](../../../prisma/schema.prisma#L795) |
| CronExecution | model | cron_executions | 9 | [schema:818](../../../prisma/schema.prisma#L818) |
| WeeklyRecap | model | weekly_recaps | 12 | [schema:835](../../../prisma/schema.prisma#L835) |
| PathwayStepProgress | model | pathway_step_progress | 11 | [schema:855](../../../prisma/schema.prisma#L855) |
| TrainingAccessRequest | model | training_access_requests | 12 | [schema:874](../../../prisma/schema.prisma#L874) |
| TrainingAccessStatus | enum | Prisma default | 7 | [schema:895](../../../prisma/schema.prisma#L895) |
| AutomationRule | model | automation_rules | 9 | [schema:905](../../../prisma/schema.prisma#L905) |
| AIToolResult | model | ai_tool_results | 11 | [schema:919](../../../prisma/schema.prisma#L919) |
| CoachMemory | model | coach_memories | 6 | [schema:944](../../../prisma/schema.prisma#L944) |
| ApplicationAiFeedback | model | application_ai_feedback | 9 | [schema:957](../../../prisma/schema.prisma#L957) |
| ApplicationAiFeedbackHowUsed | enum | application_ai_feedback_how_used | 4 | [schema:974](../../../prisma/schema.prisma#L974) |
| AIToolType | enum | Prisma default | 15 | [schema:983](../../../prisma/schema.prisma#L983) |
| CertStatus | enum | cert_status | 3 | [schema:1001](../../../prisma/schema.prisma#L1001) |
| UserCertification | model | user_certifications | 11 | [schema:1009](../../../prisma/schema.prisma#L1009) |
| BlogPost | model | blog_posts | 14 | [schema:1033](../../../prisma/schema.prisma#L1033) |
| Partner | model | partners | 54 | [schema:1056](../../../prisma/schema.prisma#L1056) |
| PartnerProgramCatalog | model | partner_program_catalog | 8 | [schema:1143](../../../prisma/schema.prisma#L1143) |
| PartnerUser | model | partner_users | 6 | [schema:1159](../../../prisma/schema.prisma#L1159) |
| Counselor | model | counselors | 11 | [schema:1172](../../../prisma/schema.prisma#L1172) |
| CounselorAffiliation | enum | counselor_affiliations | 4 | [schema:1194](../../../prisma/schema.prisma#L1194) |
| CounselorAssignment | model | counselor_assignments | 8 | [schema:1205](../../../prisma/schema.prisma#L1205) |
| MessageThreadKind | enum | message_thread_kind | 3 | [schema:1225](../../../prisma/schema.prisma#L1225) |
| MessageThread | model | message_threads | 19 | [schema:1234](../../../prisma/schema.prisma#L1234) |
| Message | model | messages | 7 | [schema:1263](../../../prisma/schema.prisma#L1263) |
| PartnerReferral | model | partner_referrals | 8 | [schema:1278](../../../prisma/schema.prisma#L1278) |
| SubgroupType | enum | Prisma default | 3 | [schema:1298](../../../prisma/schema.prisma#L1298) |
| MemberSubgroupAssignmentType | enum | Prisma default | 3 | [schema:1304](../../../prisma/schema.prisma#L1304) |
| Subgroup | model | subgroups | 14 | [schema:1310](../../../prisma/schema.prisma#L1310) |
| MemberSubgroup | model | member_subgroups | 9 | [schema:1334](../../../prisma/schema.prisma#L1334) |
| SubgroupLeader | model | subgroup_leaders | 7 | [schema:1353](../../../prisma/schema.prisma#L1353) |
| PlacementRecord | model | placement_records | 21 | [schema:1378](../../../prisma/schema.prisma#L1378) |
| PlacedOutcome | model | placed_outcomes | 11 | [schema:1413](../../../prisma/schema.prisma#L1413) |
| PartnerSignupRequest | model | partner_signup_requests | 11 | [schema:1431](../../../prisma/schema.prisma#L1431) |
| CounselorNote | model | counselor_notes | 8 | [schema:1448](../../../prisma/schema.prisma#L1448) |
| AdvisorSessionNote | model | advisor_session_notes | 8 | [schema:1464](../../../prisma/schema.prisma#L1464) |
| AuditLog | model | audit_logs | 10 | [schema:1480](../../../prisma/schema.prisma#L1480) |
| AuditEvent | model | audit_events | 13 | [schema:1506](../../../prisma/schema.prisma#L1506) |
| WioaReviewSnapshot | model | wioa_review_snapshots | 16 | [schema:1543](../../../prisma/schema.prisma#L1543) |
| InvitationRole | enum | Prisma default | 4 | [schema:1576](../../../prisma/schema.prisma#L1576) |
| InvitationStatus | enum | Prisma default | 4 | [schema:1583](../../../prisma/schema.prisma#L1583) |
| Invitation | model | invitations | 19 | [schema:1590](../../../prisma/schema.prisma#L1590) |
| Employer | model | employers | 38 | [schema:1629](../../../prisma/schema.prisma#L1629) |
| EmployerHiringIntent | model | employer_hiring_intents | 11 | [schema:1680](../../../prisma/schema.prisma#L1680) |
| EmployerScreeningPack | model | employer_screening_packs | 8 | [schema:1700](../../../prisma/schema.prisma#L1700) |
| EmployerSubscription | model | employer_subscriptions | 14 | [schema:1716](../../../prisma/schema.prisma#L1716) |
| JobLocationType | enum | job_location_type | 3 | [schema:1739](../../../prisma/schema.prisma#L1739) |
| JobTypeEnum | enum | job_type_enum | 3 | [schema:1747](../../../prisma/schema.prisma#L1747) |
| JobStatusEnum | enum | job_status_enum | 6 | [schema:1755](../../../prisma/schema.prisma#L1755) |
| Job | model | jobs | 37 | [schema:1766](../../../prisma/schema.prisma#L1766) |
| OrganizationProgramCatalog | model | organization_program_catalog | 23 | [schema:1815](../../../prisma/schema.prisma#L1815) |
| Course | model | courses | 14 | [schema:1852](../../../prisma/schema.prisma#L1852) |
| CourseEnrollment | model | course_enrollments | 19 | [schema:1874](../../../prisma/schema.prisma#L1874) |
| TrainingBillingPacket | model | training_billing_packets | 29 | [schema:1927](../../../prisma/schema.prisma#L1927) |
| XapiStatement | model | xapi_statements | 20 | [schema:1971](../../../prisma/schema.prisma#L1971) |
| CourseProgressStatus | enum | course_progress_status | 3 | [schema:2027](../../../prisma/schema.prisma#L2027) |
| CourseProgress | model | course_progress | 17 | [schema:2036](../../../prisma/schema.prisma#L2036) |
| MemberProgramProgress | model | member_program_progress | 8 | [schema:2069](../../../prisma/schema.prisma#L2069) |
| PreScreeningResponse | model | pre_screening_responses | 13 | [schema:2085](../../../prisma/schema.prisma#L2085) |
| PreScreeningDraft | model | pre_screening_drafts | 13 | [schema:2106](../../../prisma/schema.prisma#L2106) |
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 18 | [schema:2125](../../../prisma/schema.prisma#L2125) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2157](../../../prisma/schema.prisma#L2157) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2174](../../../prisma/schema.prisma#L2174) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2185](../../../prisma/schema.prisma#L2185) |
| ApplicationMessage | model | application_messages | 8 | [schema:2213](../../../prisma/schema.prisma#L2213) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2229](../../../prisma/schema.prisma#L2229) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2248](../../../prisma/schema.prisma#L2248) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2271](../../../prisma/schema.prisma#L2271) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2283](../../../prisma/schema.prisma#L2283) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2304](../../../prisma/schema.prisma#L2304) |
| Mentor | model | mentors | 17 | [schema:2315](../../../prisma/schema.prisma#L2315) |
| MentorSession | model | mentor_sessions | 13 | [schema:2338](../../../prisma/schema.prisma#L2338) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2359](../../../prisma/schema.prisma#L2359) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2368](../../../prisma/schema.prisma#L2368) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2376](../../../prisma/schema.prisma#L2376) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2384](../../../prisma/schema.prisma#L2384) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2411](../../../prisma/schema.prisma#L2411) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2424](../../../prisma/schema.prisma#L2424) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2436](../../../prisma/schema.prisma#L2436) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2448](../../../prisma/schema.prisma#L2448) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2462](../../../prisma/schema.prisma#L2462) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2482](../../../prisma/schema.prisma#L2482) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2496](../../../prisma/schema.prisma#L2496) |
| MemberPoints | model | member_points | 10 | [schema:2517](../../../prisma/schema.prisma#L2517) |
| PointsTransaction | model | points_transactions | 10 | [schema:2534](../../../prisma/schema.prisma#L2534) |
| ReferralCode | model | referral_codes | 5 | [schema:2558](../../../prisma/schema.prisma#L2558) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2572](../../../prisma/schema.prisma#L2572) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2596](../../../prisma/schema.prisma#L2596) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2650](../../../prisma/schema.prisma#L2650) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2673](../../../prisma/schema.prisma#L2673) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2702](../../../prisma/schema.prisma#L2702) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2726](../../../prisma/schema.prisma#L2726) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2762](../../../prisma/schema.prisma#L2762) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2788](../../../prisma/schema.prisma#L2788) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2804](../../../prisma/schema.prisma#L2804) |
| PlacementSurvey | model | placement_surveys | 21 | [schema:2821](../../../prisma/schema.prisma#L2821) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2865](../../../prisma/schema.prisma#L2865) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2873](../../../prisma/schema.prisma#L2873) |
| Testimonial | model | testimonials | 18 | [schema:2882](../../../prisma/schema.prisma#L2882) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2916](../../../prisma/schema.prisma#L2916) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2943](../../../prisma/schema.prisma#L2943) |
| MemberFeedback | model | member_feedback | 8 | [schema:2989](../../../prisma/schema.prisma#L2989) |
| FeatureFlag | model | feature_flags | 9 | [schema:3009](../../../prisma/schema.prisma#L3009) |
| WebhookEvent | model | webhook_events | 13 | [schema:3033](../../../prisma/schema.prisma#L3033) |
| EmailTemplate | model | email_templates | 9 | [schema:3058](../../../prisma/schema.prisma#L3058) |
| Notification | model | notifications | 9 | [schema:3076](../../../prisma/schema.prisma#L3076) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3098](../../../prisma/schema.prisma#L3098) |
| SavedJob | model | saved_jobs | 6 | [schema:3113](../../../prisma/schema.prisma#L3113) |
| WapJob | model | wap_jobs | 8 | [schema:3130](../../../prisma/schema.prisma#L3130) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3149](../../../prisma/schema.prisma#L3149) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3155](../../../prisma/schema.prisma#L3155) |
