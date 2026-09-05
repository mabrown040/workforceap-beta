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

Use a runtime credential with ElevenAgents read and Text to Speech access. Keep
temporary agent-write migration credentials separate from production, and never
install the one-day recovery key as a durable runtime credential. Verify the
nonprofit agent IDs and the unqualified agent GET's `main_branch_id`, align the
Vercel Production and Preview scopes, and redeploy to activate their new values.
