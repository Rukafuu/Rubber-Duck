import { SecretFinding } from '../models/debug.model';

interface SecretPattern {
  name: string;
  regex: RegExp;
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'Gemini / Google API Key',
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    recommendation: 'Google API key detected. Never share API keys in public logs or chat.',
  },
  {
    name: 'OpenAI API Key',
    regex: /sk-[a-zA-Z0-9]{32,64}/g,
    recommendation: 'OpenAI API key detected. Mask or rotate this key immediately.',
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /gh[pousr]-[a-zA-Z0-9]{36,255}/g,
    recommendation: 'GitHub Token detected. Redact before posting.',
  },
  {
    name: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    recommendation: 'AWS Access Key detected. Revoke or redact this credential.',
  },
  {
    name: 'Generic Bearer / Auth Token',
    regex: /(?:bearer\s+[a-zA-Z0-9_\-.]{25,}|authorization:\s*Bearer\s+[^\s"']+)/gi,
    recommendation: 'Authorization Bearer header detected.',
  },
  {
    name: 'JWT Token',
    regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    recommendation: 'JSON Web Token (JWT) detected with potential session or user claims.',
  },
  {
    name: 'RSA / Private Key Block',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    recommendation: 'Private Cryptographic Key block detected! Never commit or debug with private keys.',
  },
  {
    name: 'Database URI with Password',
    regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/]+:([^@\s/]+)@/gi,
    recommendation: 'Database connection string containing plaintext password detected.',
  },
  {
    name: 'Environment Secret Variable',
    regex: /(?:DATABASE_URL|SECRET_KEY|API_KEY|PASSWORD|TOKEN|AUTH_SECRET)\s*=\s*["']?([^\s"']{8,})["']?/gi,
    recommendation: 'Sensitive environment variable assignment detected.',
  },
];

export function scanForSecrets(content: string): SecretFinding[] {
  if (!content || typeof content !== 'string') return [];
  const findings: SecretFinding[] = [];

  for (const pattern of SECRET_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const matchedText = match[0];
      const masked = maskSecret(matchedText);

      // Estimate line number
      const prefix = content.substring(0, match.index);
      const lineNumber = prefix.split('\n').length;

      findings.push({
        type: pattern.name,
        match: matchedText,
        maskedPreview: masked,
        line: lineNumber,
        recommendation: pattern.recommendation,
      });
    }
  }

  return findings;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '***REDACTED***';
  }
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-3);
  return `${prefix}...[REDACTED_SECRET]...${suffix}`;
}

export function redactAllSecrets(content: string): { redactedText: string; count: number } {
  if (!content) return { redactedText: '', count: 0 };
  let result = content;
  let count = 0;

  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    result = result.replace(regex, (match) => {
      count++;
      return maskSecret(match);
    });
  }

  return { redactedText: result, count };
}
