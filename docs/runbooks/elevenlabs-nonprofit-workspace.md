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
dictionary and its canonical empty analysis container. All other mutable fields
remain exact. Provider verification does not prove that Vercel is using the right
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
