export class TerminalSecurity {
  private static DANGEROUS_PATTERNS = [
    /\brm\s+-rf\b/i,
    /\bDROP\s+(DATABASE|TABLE|SCHEMA|INDEX)\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+push\s+.*--force\b/i,
    /\bgit\s+push\s+-f\b/i,
    /\bDELETE\s+FROM\s+\w+\s*(;|$)/i, // Unbounded DELETE without WHERE
    /\bmkfs\b/i,
    /\bdd\s+if=/i,
    />\s*\/dev\/sd/i,
  ];

  private static SECRET_PATTERNS = [
    /(AIzaSy[A-Za-z0-9_-]{25,45})/g,                    // Gemini/Google API key
    /(sk-ant-[A-Za-z0-9_-]{25,})/g,                    // Anthropic API key
    /(ghp_[A-Za-z0-9]{25,})/g,                         // GitHub Personal Access Token
    /(github_pat_[A-Za-z0-9_]{40,})/g,                 // GitHub fine-grained token
    /(sbp_[A-Za-z0-9]{30,})/g,                         // Supabase access token
    /(vercel_[A-Za-z0-9]{20,})/g,                      // Vercel token
    /(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g, // JWTs
    /([a-zA-Z0-9_]{32,64}=(?:"|')?[a-zA-Z0-9_\-\.\/]{20,}(?:"|')?)/g, // Generic env secrets
  ];

  public static isDangerousCommand(command: string): { isDangerous: boolean; reason?: string } {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          isDangerous: true,
          reason: `Command matched restricted pattern: ${pattern.source}`,
        };
      }
    }
    return { isDangerous: false };
  }

  public static sanitizeOutput(output: string): string {
    if (!output) return '';
    let sanitized = output;

    // Redact explicit env vars if present in process.env
    const secretsToRedact = [
      process.env.GEMINI_API_KEY,
      process.env.ANTHROPIC_API_KEY,
      process.env.GITHUB_TOKEN,
      process.env.VERCEL_TOKEN,
      process.env.SUPABASE_ACCESS_TOKEN,
    ].filter((s): s is string => Boolean(s && s.length > 5));

    for (const secret of secretsToRedact) {
      sanitized = sanitized.replaceAll(secret, '[REDACTED_SECRET]');
    }

    // Redact regex patterns
    for (const pattern of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED_TOKEN]');
    }

    return sanitized;
  }

  public static truncateOutput(output: string, maxLength: number = 8000): string {
    if (output.length <= maxLength) return output;
    const half = Math.floor(maxLength / 2);
    return `${output.slice(0, half)}\n\n... [OUTPUT TRUNCATED - ${output.length - maxLength} CHARACTERS OMITTED] ...\n\n${output.slice(-half)}`;
  }
}
