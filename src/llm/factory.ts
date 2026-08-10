import { LLMProvider } from './provider';
import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';

export class LLMFactory {
  public static getProvider(preference?: 'gemini' | 'anthropic'): LLMProvider {
    if (preference === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      return new AnthropicProvider();
    }

    if (process.env.GEMINI_API_KEY) {
      return new GeminiProvider();
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return new AnthropicProvider();
    }

    // Default fallback to GeminiProvider (will attempt using process.env.GEMINI_API_KEY)
    return new GeminiProvider();
  }
}
