import { LLMMessage, ToolDefinition, LLMResponse } from '../types/agent';

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

export interface LLMProvider {
  getProviderName(): string;
  generate(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    config?: LLMConfig
  ): Promise<LLMResponse>;
}
