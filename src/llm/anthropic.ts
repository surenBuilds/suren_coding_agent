import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMConfig } from './provider';
import { LLMMessage, ToolDefinition, LLMResponse, ToolCall } from '../types/agent';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private defaultModel: string;

  constructor(apiKey?: string, model: string = 'claude-3-7-sonnet-20250219') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new Anthropic({ apiKey: key });
    }
    this.defaultModel = process.env.ANTHROPIC_MODEL || model;
  }

  public getProviderName(): string {
    return 'Anthropic (Claude)';
  }

  public async generate(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    config?: LLMConfig
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY is not configured. Please add ANTHROPIC_API_KEY in Settings or environment.');
    }

    const model = config?.model || this.defaultModel;

    // System prompt
    let systemPrompt = config?.systemInstruction;
    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg) {
      systemPrompt = systemMsg.content;
    }

    // Convert tools
    const anthropicTools: Anthropic.Tool[] | undefined = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object',
        properties: t.parameters.properties || {},
        required: t.parameters.required || [],
      },
    }));

    // Convert messages
    const anthropicMessages: Anthropic.MessageParam[] = [];
    const nonSystem = messages.filter((m) => m.role !== 'system');

    for (const msg of nonSystem) {
      if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        const contentBlocks: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          contentBlocks.push({ type: 'text', text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            contentBlocks.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.args,
            });
          }
        }
        anthropicMessages.push({
          role: 'assistant',
          content: contentBlocks.length > 0 ? contentBlocks : msg.content || 'Processing',
        });
      } else if (msg.role === 'tool') {
        anthropicMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId || 'call_0',
              content: msg.content,
            },
          ],
        });
      }
    }

    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: 'user', content: 'Hello' });
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: config?.maxTokens || 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
    });

    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: (block.input as Record<string, any>) || {},
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
