# WorkforceAP nonprofit ElevenLabs cutover

The September 5, 2026 provider migration updates the existing agents owned by
`michael.brown2@workforceap.org`. It preserves the personal workspace for rollback.
Application activation requires the matching nonprofit API key and Lilley branch
in the existing Vercel `workforceap-beta` project, followed by a deployment.

| Runtime role | Reviewed nonprofit agent |
| --- | --- |
| Lilley and legacy career/business entry point | `agent_1101kqfjfm8retm8j6md467wzxdb` |
| Mock interview | `agent_4601kqfjaz5rf09bya66s9gg1wvc` |
| Employer concierge | `agent_6301kqfjfpexew9bnd64vs8nr7ak` |
| Readiness coach | `agent_9201kqfjfrkyex086d2cb706xsb0` |
| Resume coach | `agent_9101kqfjg2z8ew5r3ad4fz6323yr` |
| Partner concierge | `agent_3701kqfjfxxjfm88pgh40h2ca4bs` |
| WIOA guide | `agent_7801kqfjg0qwfy68btrqh6jg87kf` |

The legacy standalone business agent `agent_5701kqfjg48rf30a8a0gehze8war` also
received its checked-in patch, but the application business entry point remains
governed Lilley. Set both counselor and career/business environment overrides to
the reviewed Lilley ID. The staff counselor remains independently configured and
fails closed; it must never use the repurposed nonprofit Lilley ID. Provider 404
recovery may use only an ordinary role's reviewed runtime fallback, never a
historical ID or another staff/member role.

Lilley's existing voice, `l4Coq6695JDX9xtLqXDE` (Lauren - Empathetic and Encouraging),
was added from the shared voice catalog and verified in the nonprofit account.
The reviewed model is `claude-haiku-4-5`, its backup cascade is disabled, voice
recording is disabled, and Zero Retention Mode is enabled. Follow the remaining
checks in [the member-agent cutover runbook](elevenlabs-member-agent-cutover.md).

The three member tools POST a constant empty JSON object. Member identity comes
only from the short-lived secret gateway header. Redirects, extra input fields,
response filters, and authentication substitutions remain forbidden. The sync
runner handles current provider readback by comparing each expanded tool definition
with a separate read of its referenced tool ID before normalizing that legacy field.
It still rejects inline tools or mismatched definitions and never retries an
ambiguous mutation without reconciling the live result.

The patch verifier models the provider's replacement of the dynamic-placeholder
dictionary and its canonical empty analysis container. For ordinary reviewed
agents, the runner retains unspecified live placeholder keys before sending the
replacement dictionary. Lilley retains its exact secret-only contract. All other
mutable fields remain exact. Provider verification does not prove that Vercel is using the right
credential, nor does a provider simulation replace an authenticated voice smoke.

Use a runtime credential with ElevenAgents **Write** (`convai_write`) and Text to
Speech access. The September 5 live check proved that Read can fetch an agent,
but signed-session creation returns HTTP 401 with `missing_permissions` naming
`convai_write`. The provider requires that broader scope even though WorkforceAP
only mints sessions at runtime. Keep unrelated permissions disabled. A scope
change on the existing key takes effect at the provider; replacing a Vercel key
value requires a deployment. Keep temporary migration credentials separate from
production, and never
install the one-day recovery key as a durable runtime credential. Verify the
nonprofit agent IDs and the unqualified agent GET's `main_branch_id`, align the
Vercel Production and Preview scopes, and redeploy to activate their new values.

## Reviewed agent hardening

The checked-in patches now require signed sessions (`enable_auth: true`, empty
hostname allowlist), disable client configuration overrides, stop after ten
minutes or ninety seconds of silence, and disable audio recording for all eight
reviewed agents. Signed authentication and hostname allowlisting are alternative
provider authentication modes; do not combine them. The patch runner validates
the effective security settings before writing a reviewed agent, including
unknown enabled override fields.

Prompts treat resumes, memory, dynamic context, and tool output as untrusted
facts. They forbid invented approvals, saved actions, contact with staff, and
account access; unnecessary sensitive details; discriminatory career decisions;
and instructions that change role or authority. Distress handling supports human
help without repeating a mandatory safety question indefinitely. Existing
models, voices, tools, and Lilley's Zero Retention Mode remain unchanged.

These files are a deployment specification, not proof of live settings. In the
authenticated nonprofit workspace, compare current settings before applying
the patches with the existing runner, preserve its preimages, and verify the
readback. Exercise `scripts/elevenlabs/voice-agent-security-scenarios.json` with
synthetic conversations. Those scenarios are not recorded as passed until run
against the live provider. Then check authenticated session creation and denied
anonymous direct-agent access, without sending real transcripts to staff.

The [September 6 verification record](elevenlabs-hardening-verification-20260906.md)
records the completed publication and fresh readback of all eight agents, denied
anonymous direct connections, and one successful production WIOA synthetic
conversation. Signed-in Readiness and microphone acceptance remain separate.

WorkforceAP checks the active app account and tenant before issuing authenticated
voice sessions. Ten URL starts per user per hour remain shared; Resume now uses
that allowance and text-only interview follow-ups do not consume it. Signed URLs
are non-cacheable, but provider URLs remain reusable within their validity
window, so this is an issuance limit, not a strict reconnect/concurrency limit.

Memory summarization now filters sensitive and instruction-bearing material
before sending it to the summarizer and before returning stored memory to
coaches. Unsafe prior memory is withheld; fallback labels do not quote the
member's last message. This conservative filter can omit valid career details
and is not comprehensive PII detection. It does not delete previous transcripts,
change separate completion/history/email flows, or establish zero provider
transcript retention for agents other than Lilley. The inline AI Career Tools
voice session remains temporary and does not acquire new persistence or tools.

## Attended JSON import and preservation checks

The provider UI's **Import agent JSON config** replaces the complete configuration.
Start from **Copy agent JSON config** for the exact authenticated nonprofit agent
and reviewed branch; preserve that export as the preimage. Apply only the reviewed
hardening delta to a detached copy, then import, publish, and re-export. A partial
checked-in patch is not a complete UI import document. Reconcile any live prompt
edit before replacing its reviewed portion; appending the new safety policy to
Lilley's old crisis-loop instructions would leave conflicting rules in place.

The September 6 patch delta changes prompt safety text, adds safe prompt defaults,
requires signed authentication with an empty hostname allowlist, disables client
override permissions, sets the 600-second duration and 90-second silence limits,
and sets `record_voice: false` where it was not already specified. Check those
requested changes and compare the remaining fields with the same agent's live
preimage, including these contracts:

- Agent and branch identity, language, and dynamic-variable defaults. Preserve the
  first message except for the reviewed Interview greeting replacement below.
  Lilley retains only the declared `secret__agent_gateway_token` placeholder; the
  Resume Coach retains its complete resume/context placeholder dictionary. All
  ordinary-agent patches now declare safe defaults for their referenced variables.
  Overlay those reviewed defaults on the existing ordinary-agent dictionary while
  retaining unrelated keys; do not discard the rest of the dictionary during UI
  import. Readiness does not send `member_name`, some interview entry points do not
  send `experience_level`, and public WIOA sends only a subset of `wioa_*` keys.
  Personal/status defaults stay empty rather than inventing a name or eligibility.
  The runner rejects missing referenced defaults before writing or verifying a
  reviewed agent. It does not retain stale personal placeholders for Lilley.
- LLM, backup/cascade configuration, voice and TTS model, voice tuning, ASR settings,
  client events, tools and their authorization headers, knowledge sources, native
  guards, and workflows. None is changed by this hardening delta. Keep the existing
  transcript events needed by the application's feedback flows.
- Privacy fields beyond `record_voice`, including Lilley's existing Zero Retention
  Mode, retention and deletion values, and existing-conversation settings. The
  other seven agents do not acquire ZRM through this change.
- Widget terms, links, display/consent flags, sharing, and post-call settings.
  The import must not change their copy or audience.

During the September 6 attended imports, all eight agents were published and
re-exported. Each showed one UI normalization outside the requested delta:
`platform_settings.widget.terms_html` changed from `null` to HTML rendered from the
existing `terms_text`. The `terms_text` and `shareable_page_show_terms` values stayed
unchanged; no terms copy changed. Each rendered value matched Lilley's inspected
text and links. This configuration observation does not attest to an authenticated
voice conversation; connection and behavior evidence are recorded separately.

For any later occurrence, inspect the before/after terms text, rendered text and
links, and display flags. Record this exact null-to-rendered-HTML difference
separately only when those checks match. Do not ignore all `terms_html` drift, clear
the rendered HTML to force an old representation, or weaken the general patch
verifier. Keep provider-managed metadata/version changes separate from mutable
configuration changes; any other difference needs reconciliation before declaring
the import verified. Track readback and behavioral acceptance for each agent
individually.

The interview opening uses the supported `{{interview_greeting}}` placeholder.
Each interview session issuer supplies fixed English or Spanish greeting copy
alongside its response-language instruction; it never accepts an arbitrary
greeting from a request or member context. The provider default is the reviewed
English greeting. This replaces the earlier conditional first message: during
attended readback the UI pruned its conditional-only `response_language` default.
That unused provider default is removed, while application language forwarding
remains intact. Prompt and first-message checks must match this supported
placeholder contract rather than ignoring the provider's pruning.
