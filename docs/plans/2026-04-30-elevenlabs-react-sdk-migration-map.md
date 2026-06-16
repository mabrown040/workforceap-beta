---
title: ElevenLabs React SDK migration map
type: note
date: "2026-04-30"
---

# ElevenLabs React SDK migration map

## Goal
Keep WorkforceAP's current control surface while reducing hand-rolled session plumbing.

## Recommendation
Migrate from `@elevenlabs/client` to `@elevenlabs/react` **inside** `PortalVoiceSession`.
Do **not** swap the portal flows to the hosted widget for core product behavior.

## Why
- keep server-minted `signedUrl` auth flow
- keep dynamic variables and runtime overrides
- keep transcript capture and post-session persistence
- reduce direct session lifecycle wiring in UI code

## Current -> React SDK mapping

### Session container
- **Current:** `Conversation.startSession(...)` inside `PortalVoiceSession`
- **React SDK:** wrap voice UI subtree in `ConversationProvider`

### Start / end controls
- **Current:** manual `startSession()` / `endSession()` methods
- **React SDK:** `useConversationControls()` with `startSession(...)` / `endSession()`

### Connection status
- **Current:** local `phase` state plus `onConnect` / `onDisconnect`
- **React SDK:** `useConversationStatus()` for connection state, keep local UX phase if needed

### Events and transcript capture
- **Current:** `onMessage`, `onError`, and related callbacks wired directly on session start
- **React SDK:** pass callbacks through `ConversationProvider` or `useConversation(...)`
- **Keep:** app-owned transcript accumulator and `completionEndpoint` POST logic

### Runtime customization
- **Current:** `dynamicVariables`, `conversationOverrides`, signed URL from app routes
- **React SDK:** still pass `signedUrl` plus `overrides`; keep dynamic variables from session route

### Client tools
- **Current:** not heavily used in portal voice flows
- **React SDK:** add later through provider/hook `clientTools` if we want guided in-app actions

## Migration shape
1. Add `@elevenlabs/react`
2. Wrap `PortalVoiceSession` internals in `ConversationProvider`
3. Replace direct `Conversation.startSession(...)` calls with hook-based `startSession(...)`
4. Preserve current transcript normalization and completion POST behavior
5. Preserve `completionEndpoint`, `suggestionsEndpoint`, video recording hooks, and dynamic variable retry behavior

## Do not change in phase 1
- server routes that mint signed URLs
- WorkforceAP agent IDs / env vars
- transcript persistence endpoints
- WIOA public vs member separation

## Risk notes
- transcript event shape must be verified in React SDK callbacks before full swap
- keep fallback path until live smoke test passes on public WIOA plus one member tool

## Suggested rollout
1. public WIOA voice flow
2. counselor / career-business coach
3. resume coach last (most custom behavior)
