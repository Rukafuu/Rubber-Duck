import { describe, expect, it } from 'vitest';
import { classifyTestOutput } from './test-output-classifier';

describe('classifyTestOutput', () => {
  it.each([
    'HTTP/1.1 503 Service Unavailable',
    'status code: 404',
    'Process exited after OOMKilled',
    'connect ECONNREFUSED 127.0.0.1:5432',
    'request timed out after 30s',
  ])('classifies failure signal %s as supporting evidence', (output) => {
    expect(classifyTestOutput(output)).toEqual({
      verdict: 'supports',
      updatedConfidence: 'high',
      hasFailureSignal: true,
    });
  });

  it('classifies a healthy response as contradicting evidence', () => {
    expect(classifyTestOutput('HTTP/1.1 200 OK - health check passed').verdict).toBe('contradicts');
  });

  it('keeps ambiguous output inconclusive', () => {
    expect(classifyTestOutput('process finished with code 0').verdict).toBe('inconclusive');
  });
});
