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
| Employer | model | employers | 37 | [schema:1629](../../../prisma/schema.prisma#L1629) |
| EmployerHiringIntent | model | employer_hiring_intents | 11 | [schema:1679](../../../prisma/schema.prisma#L1679) |
| EmployerScreeningPack | model | employer_screening_packs | 8 | [schema:1699](../../../prisma/schema.prisma#L1699) |
| EmployerSubscription | model | employer_subscriptions | 14 | [schema:1715](../../../prisma/schema.prisma#L1715) |
| JobLocationType | enum | job_location_type | 3 | [schema:1738](../../../prisma/schema.prisma#L1738) |
| JobTypeEnum | enum | job_type_enum | 3 | [schema:1746](../../../prisma/schema.prisma#L1746) |
| JobStatusEnum | enum | job_status_enum | 6 | [schema:1754](../../../prisma/schema.prisma#L1754) |
| Job | model | jobs | 37 | [schema:1765](../../../prisma/schema.prisma#L1765) |
| OrganizationProgramCatalog | model | organization_program_catalog | 23 | [schema:1814](../../../prisma/schema.prisma#L1814) |
| Course | model | courses | 14 | [schema:1851](../../../prisma/schema.prisma#L1851) |
| CourseEnrollment | model | course_enrollments | 19 | [schema:1873](../../../prisma/schema.prisma#L1873) |
| TrainingBillingPacket | model | training_billing_packets | 29 | [schema:1926](../../../prisma/schema.prisma#L1926) |
| XapiStatement | model | xapi_statements | 20 | [schema:1970](../../../prisma/schema.prisma#L1970) |
| CourseProgressStatus | enum | course_progress_status | 3 | [schema:2026](../../../prisma/schema.prisma#L2026) |
| CourseProgress | model | course_progress | 17 | [schema:2035](../../../prisma/schema.prisma#L2035) |
| MemberProgramProgress | model | member_program_progress | 8 | [schema:2068](../../../prisma/schema.prisma#L2068) |
| PreScreeningResponse | model | pre_screening_responses | 13 | [schema:2084](../../../prisma/schema.prisma#L2084) |
| PreScreeningDraft | model | pre_screening_drafts | 13 | [schema:2105](../../../prisma/schema.prisma#L2105) |
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 18 | [schema:2124](../../../prisma/schema.prisma#L2124) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2156](../../../prisma/schema.prisma#L2156) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2173](../../../prisma/schema.prisma#L2173) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2184](../../../prisma/schema.prisma#L2184) |
| ApplicationMessage | model | application_messages | 8 | [schema:2212](../../../prisma/schema.prisma#L2212) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2228](../../../prisma/schema.prisma#L2228) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2247](../../../prisma/schema.prisma#L2247) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2270](../../../prisma/schema.prisma#L2270) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2282](../../../prisma/schema.prisma#L2282) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2303](../../../prisma/schema.prisma#L2303) |
| Mentor | model | mentors | 17 | [schema:2314](../../../prisma/schema.prisma#L2314) |
| MentorSession | model | mentor_sessions | 13 | [schema:2337](../../../prisma/schema.prisma#L2337) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2358](../../../prisma/schema.prisma#L2358) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2367](../../../prisma/schema.prisma#L2367) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2375](../../../prisma/schema.prisma#L2375) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2383](../../../prisma/schema.prisma#L2383) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2410](../../../prisma/schema.prisma#L2410) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2423](../../../prisma/schema.prisma#L2423) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2435](../../../prisma/schema.prisma#L2435) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2447](../../../prisma/schema.prisma#L2447) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2461](../../../prisma/schema.prisma#L2461) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2481](../../../prisma/schema.prisma#L2481) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2495](../../../prisma/schema.prisma#L2495) |
| MemberPoints | model | member_points | 10 | [schema:2516](../../../prisma/schema.prisma#L2516) |
| PointsTransaction | model | points_transactions | 10 | [schema:2533](../../../prisma/schema.prisma#L2533) |
| ReferralCode | model | referral_codes | 5 | [schema:2557](../../../prisma/schema.prisma#L2557) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2571](../../../prisma/schema.prisma#L2571) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2595](../../../prisma/schema.prisma#L2595) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2649](../../../prisma/schema.prisma#L2649) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2672](../../../prisma/schema.prisma#L2672) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2701](../../../prisma/schema.prisma#L2701) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2725](../../../prisma/schema.prisma#L2725) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2761](../../../prisma/schema.prisma#L2761) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2787](../../../prisma/schema.prisma#L2787) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2803](../../../prisma/schema.prisma#L2803) |
| PlacementSurvey | model | placement_surveys | 21 | [schema:2820](../../../prisma/schema.prisma#L2820) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2864](../../../prisma/schema.prisma#L2864) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2872](../../../prisma/schema.prisma#L2872) |
| Testimonial | model | testimonials | 18 | [schema:2881](../../../prisma/schema.prisma#L2881) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2915](../../../prisma/schema.prisma#L2915) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2942](../../../prisma/schema.prisma#L2942) |
| MemberFeedback | model | member_feedback | 8 | [schema:2988](../../../prisma/schema.prisma#L2988) |
| FeatureFlag | model | feature_flags | 9 | [schema:3008](../../../prisma/schema.prisma#L3008) |
| WebhookEvent | model | webhook_events | 13 | [schema:3032](../../../prisma/schema.prisma#L3032) |
| EmailTemplate | model | email_templates | 9 | [schema:3057](../../../prisma/schema.prisma#L3057) |
| Notification | model | notifications | 9 | [schema:3075](../../../prisma/schema.prisma#L3075) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3097](../../../prisma/schema.prisma#L3097) |
| SavedJob | model | saved_jobs | 6 | [schema:3112](../../../prisma/schema.prisma#L3112) |
| WapJob | model | wap_jobs | 8 | [schema:3129](../../../prisma/schema.prisma#L3129) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3148](../../../prisma/schema.prisma#L3148) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3154](../../../prisma/schema.prisma#L3154) |
