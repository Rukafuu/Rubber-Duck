export type LocalTestVerdict = 'supports' | 'contradicts' | 'inconclusive';

export interface LocalTestClassification {
  verdict: LocalTestVerdict;
  updatedConfidence: 'low' | 'medium' | 'high';
  hasFailureSignal: boolean;
}

const FAILURE_SIGNAL = /(?:\b(?:error|failed|failure|exception|fatal|panic|timeout|timed out|unavailable|denied|refused|oomkilled|crash(?:ed)?|unhealthy|econnrefused|econnreset|enotfound|ehostunreach)\b)|(?:\bhttp\/\d(?:\.\d)?\s+[45]\d{2}\b)|(?:\bstatus(?:\s+code)?\s*[:=]?\s*[45]\d{2}\b)|(?:\b[45]\d{2}\s+(?:bad request|unauthorized|forbidden|not found|conflict|too many requests|internal server error|bad gateway|service unavailable|gateway timeout)\b)/i;
const SUCCESS_SIGNAL = /(?:\b(?:success|succeeded|passed|healthy)\b)|(?:\bhttp\/\d(?:\.\d)?\s+2\d{2}\b)|(?:\bstatus(?:\s+code)?\s*[:=]?\s*2\d{2}\b)/i;

export function classifyTestOutput(actualOutput: string | null | undefined): LocalTestClassification {
  const output = actualOutput?.trim() || '';

  if (FAILURE_SIGNAL.test(output)) {
    return { verdict: 'supports', updatedConfidence: 'high', hasFailureSignal: true };
  }

  if (SUCCESS_SIGNAL.test(output)) {
    return { verdict: 'contradicts', updatedConfidence: 'low', hasFailureSignal: false };
  }

  return { verdict: 'inconclusive', updatedConfidence: 'medium', hasFailureSignal: false };
}
