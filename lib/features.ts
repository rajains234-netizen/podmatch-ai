export function isAiPipelineEnabled() {
  return process.env.USE_AI_PIPELINE === "true";
}