import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { LLMProvider, LLMConfig } from './provider';
import { LLMMessage, ToolDefinition, LLMResponse, ToolCall } from '../types/agent';

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;
  private defaultModel: string;

  constructor(apiKey?: string, model: string = 'gemini-3.6-flash') {
    const key = apiKey || process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    this.defaultModel = process.env.GEMINI_MODEL || model;
  }

  public getProviderName(): string {
    return 'Gemini (Google AI)';
  }

  public async generate(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    config?: LLMConfig
  ): Promise<LLMResponse> {
    const model = config?.model || this.defaultModel;

    // Convert System Instruction
    let systemInstruction = config?.systemInstruction;
    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg) {
      systemInstruction = systemMsg.content;
    }

    // Convert Tool Definitions to Gemini Function Declarations
    let geminiTools: { functionDeclarations: FunctionDeclaration[] }[] | undefined = undefined;
    if (tools && tools.length > 0) {
      const funcDecls: FunctionDeclaration[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: Type.OBJECT,
          properties: this.convertJsonSchemaProperties(t.parameters.properties || {}),
          required: t.parameters.required || [],
        },
      }));
      geminiTools = [{ functionDeclarations: funcDecls }];
    }

    // Convert Chat Messages into Gemini Contents Format
    const contents: any[] = [];
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    for (const msg of nonSystemMessages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.args,
              },
            });
          }
        }
        contents.push({
          role: 'model',
          parts: parts.length > 0 ? parts : [{ text: 'Processing...' }],
        });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.name || 'tool',
                response: { output: msg.content },
              },
            },
          ],
        });
      }
    }

    // Ensure we have at least one user message
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    }

    // Call Gemini API with timeout and retry logic
    let retries = 0;
    const maxRetries = 4;

    while (retries <= maxRetries) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: config?.temperature ?? 0.2,
            tools: geminiTools,
          },
        });

        const textOutput = response.text || '';
        const rawFuncCalls = response.functionCalls;
        let toolCalls: ToolCall[] | undefined = undefined;

        if (rawFuncCalls && rawFuncCalls.length > 0) {
          toolCalls = rawFuncCalls.map((fc, idx) => ({
            id: `call_${Date.now()}_${idx}`,
            name: fc.name,
            args: (fc.args as Record<string, any>) || {},
          }));
        }

        if (!textOutput && (!toolCalls || toolCalls.length === 0)) {
          const finishReason = (response as any).candidates?.[0]?.finishReason;
          console.error(`[GeminiProvider] Empty response with no tool calls. finishReason=${finishReason}`);
        }

        return {
          content: textOutput,
          toolCalls,
        };
      } catch (err: any) {
        const status = err.status || err.code;
        const isRetryable = status === 429 || status === 503 || status === 500;

        retries++;
        if (!isRetryable || retries > maxRetries) {
          console.error('[GeminiProvider Error]', err);
          throw new Error(`Gemini Provider API call failed: ${err.message || String(err)}`);
        }

        // Honor Google's suggested retryDelay (e.g. "19s") when present, else exponential backoff
        const delayMatch = /"retryDelay":"(\d+(?:\.\d+)?)s"/.exec(err.message || '');
        const suggestedMs = delayMatch ? Math.ceil(parseFloat(delayMatch[1]) * 1000) : null;
        const backoffMs = suggestedMs ?? Math.min(2000 * 2 ** (retries - 1), 30000);

        console.error(`[GeminiProvider] Retryable error (status ${status}), waiting ${backoffMs}ms before retry ${retries}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs + 500));
      }
    }

    throw new Error('Gemini Provider exceeded maximum retries');
  }

  private convertJsonSchemaProperties(properties: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, prop] of Object.entries(properties)) {
      let type = Type.STRING;
      if (prop.type === 'number') type = Type.NUMBER;
      if (prop.type === 'integer') type = Type.INTEGER;
      if (prop.type === 'boolean') type = Type.BOOLEAN;
      if (prop.type === 'array') type = Type.ARRAY;
      if (prop.type === 'object') type = Type.OBJECT;

      result[key] = {
        type,
        description: prop.description || '',
        ...(prop.items
          ? {
              items: {
                type: prop.items.type === 'number' ? Type.NUMBER : Type.STRING,
              },
            }
          : {}),
      };
    }
    return result;
  }
}
