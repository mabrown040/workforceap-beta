# Prisma schema index

[Machine fields and relationships](models.json) · [Complete relationship diagram](database-relations.mmd)

Declared Prisma schema only. Migration SQL, RLS, triggers, and actual production state require separate inspection. Each relation field is listed; inverse fields are retained.

| Name | Kind | Table mapping | Fields | Source |
| --- | --- | --- | ---: | --- |
| Organization | model | organizations | 30 | [schema:20](../../../prisma/schema.prisma#L20) |
| Chapter | model | chapters | 18 | [schema:56](../../../prisma/schema.prisma#L56) |
| ChapterMember | model | chapter_members | 8 | [schema:80](../../../prisma/schema.prisma#L80) |
| ChapterMeeting | model | chapter_meetings | 9 | [schema:95](../../../prisma/schema.prisma#L95) |
| ChapterCurriculumItem | model | chapter_curriculum_items | 8 | [schema:110](../../../prisma/schema.prisma#L110) |
| User | model | users | 139 | [schema:125](../../../prisma/schema.prisma#L125) |
| Profile | model | profiles | 45 | [schema:315](../../../prisma/schema.prisma#L315) |
| ReadinessChecklist | model | readiness_checklist | 12 | [schema:371](../../../prisma/schema.prisma#L371) |
| Application | model | applications | 15 | [schema:391](../../../prisma/schema.prisma#L391) |
| FundingSource | enum | Prisma default | 5 | [schema:415](../../../prisma/schema.prisma#L415) |
| ApplicationStatus | enum | Prisma default | 4 | [schema:423](../../../prisma/schema.prisma#L423) |
| Role | model | roles | 4 | [schema:430](../../../prisma/schema.prisma#L430) |
| UserRole | model | user_roles | 5 | [schema:440](../../../prisma/schema.prisma#L440) |
| Resource | model | resources | 8 | [schema:452](../../../prisma/schema.prisma#L452) |
| ResourceType | enum | Prisma default | 3 | [schema:465](../../../prisma/schema.prisma#L465) |
| JobApplication | model | job_applications | 18 | [schema:471](../../../prisma/schema.prisma#L471) |
| JobApplicationStatus | enum | Prisma default | 7 | [schema:504](../../../prisma/schema.prisma#L504) |
| JobApplicationSource | enum | Prisma default | 4 | [schema:514](../../../prisma/schema.prisma#L514) |
| BenefitRequest | model | benefit_requests | 7 | [schema:521](../../../prisma/schema.prisma#L521) |
| BenefitRequestStatus | enum | Prisma default | 3 | [schema:537](../../../prisma/schema.prisma#L537) |
| ProgramChangeRequest | model | program_change_requests | 13 | [schema:544](../../../prisma/schema.prisma#L544) |
| ProgramChangeRequestStatus | enum | Prisma default | 4 | [schema:566](../../../prisma/schema.prisma#L566) |
| PipelineBoardStage | enum | pipeline_board_stage | 6 | [schema:574](../../../prisma/schema.prisma#L574) |
| MemberStatus | enum | member_status | 3 | [schema:585](../../../prisma/schema.prisma#L585) |
| LearningProgress | model | learning_progress | 8 | [schema:593](../../../prisma/schema.prisma#L593) |
| MemberLabDraft | model | member_lab_drafts | 18 | [schema:610](../../../prisma/schema.prisma#L610) |
| MemberLabSubmission | model | member_lab_submissions | 17 | [schema:638](../../../prisma/schema.prisma#L638) |
| MemberLabReview | model | member_lab_reviews | 11 | [schema:665](../../../prisma/schema.prisma#L665) |
| TrainingStudyPlan | model | training_study_plans | 9 | [schema:682](../../../prisma/schema.prisma#L682) |
| TrainingCourseWork | model | training_course_work | 10 | [schema:700](../../../prisma/schema.prisma#L700) |
| Goal | model | goals | 14 | [schema:718](../../../prisma/schema.prisma#L718) |
| GoalStatus | enum | Prisma default | 3 | [schema:741](../../../prisma/schema.prisma#L741) |
| ResourceProgress | model | resource_progress | 12 | [schema:747](../../../prisma/schema.prisma#L747) |
| MemberEvent | model | member_events | 11 | [schema:768](../../../prisma/schema.prisma#L768) |
| WorkflowDiagnostic | model | workflow_diagnostics | 14 | [schema:791](../../../prisma/schema.prisma#L791) |
| CronExecution | model | cron_executions | 9 | [schema:814](../../../prisma/schema.prisma#L814) |
| WeeklyRecap | model | weekly_recaps | 12 | [schema:831](../../../prisma/schema.prisma#L831) |
| PathwayStepProgress | model | pathway_step_progress | 11 | [schema:851](../../../prisma/schema.prisma#L851) |
| TrainingAccessRequest | model | training_access_requests | 12 | [schema:870](../../../prisma/schema.prisma#L870) |
| TrainingAccessStatus | enum | Prisma default | 7 | [schema:891](../../../prisma/schema.prisma#L891) |
| AutomationRule | model | automation_rules | 9 | [schema:901](../../../prisma/schema.prisma#L901) |
| AIToolResult | model | ai_tool_results | 11 | [schema:915](../../../prisma/schema.prisma#L915) |
| CoachMemory | model | coach_memories | 6 | [schema:940](../../../prisma/schema.prisma#L940) |
| ApplicationAiFeedback | model | application_ai_feedback | 9 | [schema:953](../../../prisma/schema.prisma#L953) |
| ApplicationAiFeedbackHowUsed | enum | application_ai_feedback_how_used | 4 | [schema:970](../../../prisma/schema.prisma#L970) |
| AIToolType | enum | Prisma default | 15 | [schema:979](../../../prisma/schema.prisma#L979) |
| CertStatus | enum | cert_status | 3 | [schema:997](../../../prisma/schema.prisma#L997) |
| UserCertification | model | user_certifications | 11 | [schema:1005](../../../prisma/schema.prisma#L1005) |
| BlogPost | model | blog_posts | 14 | [schema:1029](../../../prisma/schema.prisma#L1029) |
| Partner | model | partners | 54 | [schema:1052](../../../prisma/schema.prisma#L1052) |
| PartnerProgramCatalog | model | partner_program_catalog | 8 | [schema:1139](../../../prisma/schema.prisma#L1139) |
| PartnerUser | model | partner_users | 6 | [schema:1155](../../../prisma/schema.prisma#L1155) |
| Counselor | model | counselors | 11 | [schema:1168](../../../prisma/schema.prisma#L1168) |
| CounselorAffiliation | enum | counselor_affiliations | 4 | [schema:1190](../../../prisma/schema.prisma#L1190) |
| CounselorAssignment | model | counselor_assignments | 8 | [schema:1201](../../../prisma/schema.prisma#L1201) |
| MessageThreadKind | enum | message_thread_kind | 3 | [schema:1221](../../../prisma/schema.prisma#L1221) |
| MessageThread | model | message_threads | 19 | [schema:1230](../../../prisma/schema.prisma#L1230) |
| Message | model | messages | 7 | [schema:1259](../../../prisma/schema.prisma#L1259) |
| PartnerReferral | model | partner_referrals | 8 | [schema:1274](../../../prisma/schema.prisma#L1274) |
| SubgroupType | enum | Prisma default | 3 | [schema:1294](../../../prisma/schema.prisma#L1294) |
| MemberSubgroupAssignmentType | enum | Prisma default | 3 | [schema:1300](../../../prisma/schema.prisma#L1300) |
| Subgroup | model | subgroups | 14 | [schema:1306](../../../prisma/schema.prisma#L1306) |
| MemberSubgroup | model | member_subgroups | 9 | [schema:1330](../../../prisma/schema.prisma#L1330) |
| SubgroupLeader | model | subgroup_leaders | 7 | [schema:1349](../../../prisma/schema.prisma#L1349) |
| PlacementRecord | model | placement_records | 21 | [schema:1374](../../../prisma/schema.prisma#L1374) |
| PlacedOutcome | model | placed_outcomes | 11 | [schema:1409](../../../prisma/schema.prisma#L1409) |
| PartnerSignupRequest | model | partner_signup_requests | 11 | [schema:1427](../../../prisma/schema.prisma#L1427) |
| CounselorNote | model | counselor_notes | 8 | [schema:1444](../../../prisma/schema.prisma#L1444) |
| AdvisorSessionNote | model | advisor_session_notes | 8 | [schema:1460](../../../prisma/schema.prisma#L1460) |
| AuditLog | model | audit_logs | 10 | [schema:1476](../../../prisma/schema.prisma#L1476) |
| AuditEvent | model | audit_events | 13 | [schema:1502](../../../prisma/schema.prisma#L1502) |
| WioaReviewSnapshot | model | wioa_review_snapshots | 16 | [schema:1539](../../../prisma/schema.prisma#L1539) |
| InvitationRole | enum | Prisma default | 4 | [schema:1572](../../../prisma/schema.prisma#L1572) |
| InvitationStatus | enum | Prisma default | 4 | [schema:1579](../../../prisma/schema.prisma#L1579) |
| Invitation | model | invitations | 19 | [schema:1586](../../../prisma/schema.prisma#L1586) |
| Employer | model | employers | 37 | [schema:1625](../../../prisma/schema.prisma#L1625) |
| EmployerHiringIntent | model | employer_hiring_intents | 11 | [schema:1675](../../../prisma/schema.prisma#L1675) |
| EmployerScreeningPack | model | employer_screening_packs | 8 | [schema:1695](../../../prisma/schema.prisma#L1695) |
| EmployerSubscription | model | employer_subscriptions | 14 | [schema:1711](../../../prisma/schema.prisma#L1711) |
| JobLocationType | enum | job_location_type | 3 | [schema:1734](../../../prisma/schema.prisma#L1734) |
| JobTypeEnum | enum | job_type_enum | 3 | [schema:1742](../../../prisma/schema.prisma#L1742) |
| JobStatusEnum | enum | job_status_enum | 6 | [schema:1750](../../../prisma/schema.prisma#L1750) |
| Job | model | jobs | 37 | [schema:1761](../../../prisma/schema.prisma#L1761) |
| OrganizationProgramCatalog | model | organization_program_catalog | 23 | [schema:1810](../../../prisma/schema.prisma#L1810) |
| Course | model | courses | 14 | [schema:1847](../../../prisma/schema.prisma#L1847) |
| CourseEnrollment | model | course_enrollments | 19 | [schema:1869](../../../prisma/schema.prisma#L1869) |
| TrainingBillingPacket | model | training_billing_packets | 29 | [schema:1922](../../../prisma/schema.prisma#L1922) |
| XapiStatement | model | xapi_statements | 20 | [schema:1966](../../../prisma/schema.prisma#L1966) |
| CourseProgressStatus | enum | course_progress_status | 3 | [schema:2022](../../../prisma/schema.prisma#L2022) |
| CourseProgress | model | course_progress | 17 | [schema:2031](../../../prisma/schema.prisma#L2031) |
| MemberProgramProgress | model | member_program_progress | 8 | [schema:2064](../../../prisma/schema.prisma#L2064) |
| PreScreeningResponse | model | pre_screening_responses | 13 | [schema:2080](../../../prisma/schema.prisma#L2080) |
| PreScreeningDraft | model | pre_screening_drafts | 13 | [schema:2101](../../../prisma/schema.prisma#L2101) |
| ApplyEligibilityScreening | model | apply_eligibility_screenings | 18 | [schema:2120](../../../prisma/schema.prisma#L2120) |
| PublicWioaScreening | model | public_wioa_screenings | 9 | [schema:2152](../../../prisma/schema.prisma#L2152) |
| JobPostingApplicationStatus | enum | job_posting_application_status | 6 | [schema:2169](../../../prisma/schema.prisma#L2169) |
| JobPostingApplication | model | job_posting_applications | 18 | [schema:2180](../../../prisma/schema.prisma#L2180) |
| ApplicationMessage | model | application_messages | 8 | [schema:2208](../../../prisma/schema.prisma#L2208) |
| PartnerOutreachLog | model | partner_outreach_logs | 10 | [schema:2224](../../../prisma/schema.prisma#L2224) |
| PortalWorkflowEvent | model | portal_workflow_events | 14 | [schema:2243](../../../prisma/schema.prisma#L2243) |
| AIJobMatchStatus | enum | ai_job_match_status | 7 | [schema:2266](../../../prisma/schema.prisma#L2266) |
| AIJobMatch | model | ai_job_matches | 10 | [schema:2278](../../../prisma/schema.prisma#L2278) |
| MentorSpecialty | model | mentor_specialties | 4 | [schema:2299](../../../prisma/schema.prisma#L2299) |
| Mentor | model | mentors | 17 | [schema:2310](../../../prisma/schema.prisma#L2310) |
| MentorSession | model | mentor_sessions | 13 | [schema:2333](../../../prisma/schema.prisma#L2333) |
| MentorSessionStatus | enum | Prisma default | 4 | [schema:2354](../../../prisma/schema.prisma#L2354) |
| CareerExperienceBand | enum | career_experience_band | 3 | [schema:2363](../../../prisma/schema.prisma#L2363) |
| CareerRecommendationType | enum | career_recommendation_type | 3 | [schema:2371](../../../prisma/schema.prisma#L2371) |
| OnetOccupation | model | onet_occupations | 21 | [schema:2379](../../../prisma/schema.prisma#L2379) |
| OnetOccupationSkill | model | onet_occupation_skills | 6 | [schema:2406](../../../prisma/schema.prisma#L2406) |
| OnetOccupationTask | model | onet_occupation_tasks | 5 | [schema:2419](../../../prisma/schema.prisma#L2419) |
| OnetOccupationTech | model | onet_occupation_tech | 5 | [schema:2431](../../../prisma/schema.prisma#L2431) |
| OnetRelatedOccupation | model | onet_related_occupations | 6 | [schema:2443](../../../prisma/schema.prisma#L2443) |
| CareerProgramMapping | model | career_program_mappings | 11 | [schema:2457](../../../prisma/schema.prisma#L2457) |
| CareerQuizRule | model | career_quiz_rules | 9 | [schema:2477](../../../prisma/schema.prisma#L2477) |
| MemberNextBestAction | model | member_next_best_actions | 12 | [schema:2491](../../../prisma/schema.prisma#L2491) |
| MemberPoints | model | member_points | 10 | [schema:2512](../../../prisma/schema.prisma#L2512) |
| PointsTransaction | model | points_transactions | 10 | [schema:2529](../../../prisma/schema.prisma#L2529) |
| ReferralCode | model | referral_codes | 5 | [schema:2553](../../../prisma/schema.prisma#L2553) |
| ReferralConversion | model | referral_conversions | 9 | [schema:2567](../../../prisma/schema.prisma#L2567) |
| CourseraCourseProgress | model | coursera_course_progress | 29 | [schema:2591](../../../prisma/schema.prisma#L2591) |
| CourseraCanonicalCourseMapping | model | coursera_canonical_course_mappings | 10 | [schema:2645](../../../prisma/schema.prisma#L2645) |
| CourseraCurriculumCourseMapping | model | coursera_curriculum_course_mappings | 9 | [schema:2668](../../../prisma/schema.prisma#L2668) |
| CourseraIdentityMapping | model | coursera_identity_mappings | 11 | [schema:2697](../../../prisma/schema.prisma#L2697) |
| CourseraBadgeProgress | model | coursera_badge_progress | 21 | [schema:2721](../../../prisma/schema.prisma#L2721) |
| AtRiskAlert | model | at_risk_alerts | 13 | [schema:2757](../../../prisma/schema.prisma#L2757) |
| MemberNudgeLog | model | member_nudge_logs | 7 | [schema:2783](../../../prisma/schema.prisma#L2783) |
| PlacementSurveyWave | enum | placement_survey_wave | 4 | [schema:2799](../../../prisma/schema.prisma#L2799) |
| PlacementSurvey | model | placement_surveys | 20 | [schema:2816](../../../prisma/schema.prisma#L2816) |
| TestimonialSource | enum | testimonial_source | 3 | [schema:2858](../../../prisma/schema.prisma#L2858) |
| TestimonialStatus | enum | testimonial_status | 4 | [schema:2866](../../../prisma/schema.prisma#L2866) |
| Testimonial | model | testimonials | 18 | [schema:2875](../../../prisma/schema.prisma#L2875) |
| CourseraSkillsetProgress | model | coursera_skillset_progress | 9 | [schema:2909](../../../prisma/schema.prisma#L2909) |
| MilestoneCascade | model | milestone_cascades | 23 | [schema:2936](../../../prisma/schema.prisma#L2936) |
| MemberFeedback | model | member_feedback | 8 | [schema:2982](../../../prisma/schema.prisma#L2982) |
| FeatureFlag | model | feature_flags | 9 | [schema:3002](../../../prisma/schema.prisma#L3002) |
| WebhookEvent | model | webhook_events | 13 | [schema:3026](../../../prisma/schema.prisma#L3026) |
| EmailTemplate | model | email_templates | 9 | [schema:3051](../../../prisma/schema.prisma#L3051) |
| Notification | model | notifications | 9 | [schema:3069](../../../prisma/schema.prisma#L3069) |
| PushSubscription | model | push_subscriptions | 8 | [schema:3091](../../../prisma/schema.prisma#L3091) |
| SavedJob | model | saved_jobs | 6 | [schema:3106](../../../prisma/schema.prisma#L3106) |
| WapJob | model | wap_jobs | 8 | [schema:3123](../../../prisma/schema.prisma#L3123) |
| TokenLinkType | enum | Prisma default | 3 | [schema:3142](../../../prisma/schema.prisma#L3142) |
| TokenizedLink | model | tokenized_link | 10 | [schema:3148](../../../prisma/schema.prisma#L3148) |
