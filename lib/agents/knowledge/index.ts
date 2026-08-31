export {
  AgentKnowledgeValidationError,
  DEFAULT_AGENT_KNOWLEDGE_MANIFEST_PATH,
  agentKnowledgeContentSchema,
  agentKnowledgeEntrySchema,
  agentKnowledgeManifestSchema,
  computeKnowledgeContentHash,
  loadAgentKnowledgeManifest,
  sha256Hex,
  validateAgentKnowledgeManifest,
  type AgentKnowledgeContent,
  type AgentKnowledgeEntry,
  type AgentKnowledgeManifest,
  type AgentKnowledgeValidationOptions,
} from './manifest';

export {
  resolveTrustedProgramKnowledge,
  type TrustedAgentProgramKnowledge,
} from './programKnowledge';
