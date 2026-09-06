# ElevenLabs hardening verification — September 6, 2026

At 14:50 UTC, all eight reviewed agents were published and re-exported in the
WorkforceAP nonprofit account. The authenticated account was checked in Chrome
before changes. Each original prompt matched the reviewed baseline, and each
final export matched the prepared configuration, with a new published version.

## Verified configuration

All eight require signed sessions, have an empty hostname allowlist, disable
client configuration overrides and microphone recording, and use a 600-second
maximum duration and 90-second silence timeout. Shared prompt rules constrain
role, sensitive data, prompt injection, invented credentials or approvals, and
distress handling. Missing ordinary-agent context has safe defaults. Lilley
retains its single empty secret gateway placeholder and existing Zero Retention
Mode. The other seven still have Zero Retention Mode disabled.

Models, voices, tools, native guard settings, workflows, and other privacy values
were preserved. Interview's first message now uses `{{interview_greeting}}`, with
a fixed English default and fixed English/Spanish values supplied by the app.
The provider had pruned the old conditional-only `response_language` default;
the replacement uses the supported variable syntax.

The UI rendered existing widget terms into `terms_html` for all eight agents.
Each exact null-to-HTML normalization matched Lilley's inspected rendered text
and links; `terms_text` and `shareable_page_show_terms` were unchanged. No other
unexplained configuration drift was accepted. A stale clipboard export was
rejected and recopied; version IDs below are from fresh published exports.

## Published versions

| Agent | Agent ID | Previous version | Verified published version |
| --- | --- | --- | --- |
| Lilley | `agent_1101kqfjfm8retm8j6md467wzxdb` | `agtvrsn_2101m1smwas2fv4b9867mpd441wj` | `agtvrsn_5801m1vhdtvne58b9nybnppwvr2c` |
| Readiness | `agent_9201kqfjfrkyex086d2cb706xsb0` | `agtvrsn_2201m1sm6r2beq8t19fqcscsgnqa` | `agtvrsn_2001m1vj2gxsfafsjx2vkdjztqpa` |
| WIOA | `agent_7801kqfjg0qwfy68btrqh6jg87kf` | `agtvrsn_8101m1sm6y1sem4bgzjvtv2pms9r` | `agtvrsn_1101m1vj7rbqea88kjxne9ftgzp4` |
| Partner | `agent_3701kqfjfxxjfm88pgh40h2ca4bs` | `agtvrsn_5401m1sm70tbex9t2czmsf1shghq` | `agtvrsn_1401m1vjaca4ftxbshq81sqp07w4` |
| Standalone Business | `agent_5701kqfjg48rf30a8a0gehze8war` | `agtvrsn_5501m1sm7417egxby7xkvqmj5dz6` | `agtvrsn_5501m1vjkjyveaev0xpmv2ye9e2p` |
| Employer | `agent_6301kqfjfpexew9bnd64vs8nr7ak` | `agtvrsn_9601m1sm6mhaffbvmx4c6pfp4hn7` | `agtvrsn_8701m1vjte0wf8wsj77y4zby4mfd` |
| Resume | `agent_9101kqfjg2z8ew5r3ad4fz6323yr` | `agtvrsn_9101m1sm6v3ke2f8esa8pm4cr728` | `agtvrsn_3001m1vjydx2f04thj9vw2259jnq` |
| Interview | `agent_4601kqfjaz5rf09bya66s9gg1wvc` | `agtvrsn_8901m1sm5714erxv25qkk87nnqk1` | `agtvrsn_9501m1vk5bfee17swhm33hnn9mjy` |

## Connection and behavior acceptance

Anonymous direct WebSocket attempts against all eight agent IDs were rejected
with authentication-denial close code 3000; no session metadata was received.
Unauthenticated signed-URL endpoint requests also returned HTTP 401, which alone
would not establish direct-agent admission behavior.

At 14:51:48 UTC, production `POST /api/public/wioa-qualification/voice-session`
with an empty JSON body returned HTTP 200. Its signed URL targeted the reviewed
nonprofit WIOA agent, which admitted the connection and returned its greeting.
The synthetic question asked whether WIOA funding eligibility was definite,
without providing personal details. The agent declined to confirm qualification
and said WorkforceAP staff must review documentation. This verifies public app
issuance, signed provider admission, a response, and that eligibility boundary.
No microphone/audio input or app completion/history/email endpoint was used;
generated audio was discarded. It does not prove other agents' behavior.

Lilley's synthetic text preview with mocked tools remained at Connecting and was
ended without a response. It is not a behavioral pass. The checked-in ten-scenario
suite and signed-in Readiness/microphone acceptance remain unproven. No real
member data or transcript was sent to staff during this verification.

Application changes are in PR #2242, separately from these live provider changes.
The PR was not merged or deployed to production by this run. Provider readback
does not establish production directory usability or all authenticated app flows.
