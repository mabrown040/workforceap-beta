# WorkforceAP Environment Variables — Production Configuration

**File:** `.env.local` (for local dev) or Vercel Environment Variables (for production)  
**Last Updated:** 2026-04-24

---

## Required Variables

### Email Service (Resend)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `RESEND_API_KEY` | ✅ Set (`re_...`) | (your dev key) | Resend Dashboard |
| `EMAIL_FROM` | `info@workforceap.org` | `info@workforceap.org` | Your domain |
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` | Gmail / Google Workspace |
| `SMTP_USER` | `michael.brown2@workforceap.org` | (your email) | Gmail account |
| `SMTP_PASS` | (app password) | (app password) | Google Account → App Passwords |
| `SMTP_PORT` | `587` | `587` | Standard TLS port |

### Database (Supabase)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | (set in Vercel) | (same) | Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (set in Vercel) | (same) | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | (set in Vercel) | (same) | Supabase Project Settings → API |

### Authentication (Supabase Auth)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.workforceap.org` | `http://localhost:3000` | Your domain |

### Rate Limiting (Upstash Redis) — Optional but Recommended
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `UPSTASH_REDIS_REST_URL` | (set in Vercel) | (optional) | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | (set in Vercel) | (optional) | Upstash Console |

**Note:** Without Upstash, signup/apply rate limits fail open (Supabase enforces its own auth limits). Contact/confirmation remain fail-closed (spam risk).

### AI Tools: ElevenLabs (Voice Interview + Conversational AI Coaches)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `ELEVENLABS_API_KEY` | (set in Vercel) | (set in .env) | ElevenLabs Dashboard |
| `ELEVENLABS_READINESS_AGENT_ID` | `agent_5801kmznwny0e8gtmb726aaeevnt` | (same) | ElevenLabs ConvAI |
| `ELEVENLABS_INTERVIEW_AGENT_ID` | `agent_9001kmy4g522e5ttvj88k5z1ygem` | (same) | ElevenLabs ConvAI |
| `ELEVENLABS_COUNSELOR_AGENT_ID` | `agent_2801kmznvsemfmms06r0e02es1b9` | (same) | ElevenLabs ConvAI |
| `ELEVENLABS_EMPLOYER_AGENT_ID` | `agent_0901kmznx45vf19s9psjrctqr6x5` | (same) | ElevenLabs ConvAI |
| `ELEVENLABS_PARTNER_AGENT_ID` | `agent_7601kntxhqx3e0mvznpwk9bqj5yw` | (same) | ElevenLabs ConvAI |
| `ELEVENLABS_RESUME_COACH_AGENT_ID` | `agent_6601kmznw90ffxkbk7mpbym73vh9` | (same) | ElevenLabs ConvAI |

### AI Tools: Groq (Chat/Completion Backend)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `GROQ_API_KEY` | (set in Vercel) | (set in .env) | Groq Dashboard |

### AI Tools: Anthropic (Interview Feedback Fallback)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `ANTHROPIC_API_KEY` | (optional) | (optional) | Anthropic Console |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-latest` | (same) | Model selector |

### AI Tools: O*NET (Skill Mapper)
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `ONET_API_KEY` | (optional — public data) | (optional) | https://services.onetcenter.org/ |

### Web Scraping / Research
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `FIRECRAWL_API_KEY` | (set in Vercel) | (optional) | Firecrawl Dashboard |
| `TAVILY_API_KEY` | (set in Vercel) | (optional) | Tavily Dashboard |

### Staff MFA Enforcement
| Variable | Production Value | Local Dev Value | Description |
|----------|------------------|-----------------|-------------|
| `STAFF_MFA_ENFORCEMENT` | unset or `1` (on by default) | `0` or unset | Production (`VERCEL_ENV=production`) fails closed: MFA is required unless this is explicitly `0`/`false`/`off`. Non-production stays opt-in (`1` to enable). |

**Note:** Do not ship production with `STAFF_MFA_ENFORCEMENT=0`. Enroll staff MFA before go-live.

### Optional: Analytics/Monitoring
| Variable | Production Value | Local Dev Value | Source |
|----------|------------------|-----------------|--------|
| `NEXT_PUBLIC_GA_ID` | (optional) | (optional) | Google Analytics |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | (auto-set by Vercel) | — | Vercel |

---

## Current Vercel Production Status

**Checked:** 2026-04-24

**Present:**
- ✅ `RESEND_API_KEY` — Email service functional
- ✅ `ELEVENLABS_API_KEY` + agent IDs — Voice coaches functional
- ✅ `GROQ_API_KEY` — AI chat/completion functional
- ✅ `NEXT_PUBLIC_SUPABASE_URL` — Database works
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Auth works
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — Server-side DB operations work
- ✅ `SMTP_HOST/USER/PASS/PORT` — Gmail SMTP for transactional email
- ✅ `UPSTASH_REDIS_REST_URL/TOKEN` — Rate limiting active (50/30min for signup)

---

## Security Notes

⚠️ **NEVER commit `.env.local` to git**  
⚠️ **NEVER share `SUPABASE_SERVICE_ROLE_KEY`** — it bypasses all Row Level Security  
⚠️ **Rotate keys if accidentally exposed**

**Protection:**
- `.env.local` is in `.gitignore` (should not be committed)
- Vercel env vars are encrypted at rest
- Use `NEXT_PUBLIC_` prefix only for client-safe variables

---

## Launch Checklist (May 1)

- [x] Auth flows (login, signup, invite) tested
- [x] Password reset working (public + admin-triggered)
- [x] Rate limits bumped to 50/30min for workforce centers
- [x] Staff MFA fail-closed in Vercel production (`STAFF_MFA_ENFORCEMENT` unset/`1`; explicit `0` to disable)
- [x] Voice coach first-message config fixed
- [x] Voice coach transcripts auto-save
- [x] No member-facing "Coming soon" stubs
- [x] No dead links or localhost fallbacks on public surfaces
- [ ] **Mike:** Live prod smoke test
- [ ] **Mike:** Pre-launch tag + env snapshot
- [ ] **Mike:** DB fixture cleanup (Test employers/jobs)
- [ ] **Mike:** Verify `partnersupport@` / `partnerships@` MX delivery

---

## Related Files

- `DEPLOY.md` — Deployment guide
- `EMAIL-SETUP.md` — Full email configuration guide
- `lib/email.ts` — Email sending functions
- `lib/rate-limit.ts` — Rate limiting configuration
- `lib/ai/elevenlabsAgents.ts` — ElevenLabs agent registry

---

*Document for Mike — WorkforceAP Tech Lead*
