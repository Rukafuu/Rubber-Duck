const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const failureSignal = /(?:\b(?:error|failed|failure|exception|fatal|panic|timeout|timed out|unavailable|denied|refused|oomkilled|crash(?:ed)?|unhealthy|econnrefused|econnreset|enotfound|ehostunreach)\b)|(?:\bhttp\/\d(?:\.\d)?\s+[45]\d{2}\b)|(?:\bstatus(?:\s+code)?\s*[:=]?\s*[45]\d{2}\b)|(?:\b[45]\d{2}\s+(?:bad request|unauthorized|forbidden|not found|conflict|too many requests|internal server error|bad gateway|service unavailable|gateway timeout)\b)/i;
const successSignal = /(?:\b(?:success|succeeded|passed|healthy)\b)|(?:\bhttp\/\d(?:\.\d)?\s+2\d{2}\b)|(?:\bstatus(?:\s+code)?\s*[:=]?\s*2\d{2}\b)/i;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...jsonHeaders, ...(init.headers || {}) },
  });
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1_000_000) throw new Error('PAYLOAD_TOO_LARGE');
  return request.json();
}

function classifyOutput(actualOutput) {
  const output = typeof actualOutput === 'string' ? actualOutput.trim() : '';
  if (failureSignal.test(output)) {
    return { verdict: 'supports', updatedConfidence: 'high', hasFailureSignal: true };
  }
  if (successSignal.test(output)) {
    return { verdict: 'contradicts', updatedConfidence: 'low', hasFailureSignal: false };
  }
  return { verdict: 'inconclusive', updatedConfidence: 'medium', hasFailureSignal: false };
}

function investigate(body) {
  const mode = body.mode || 'debugger';
  const text = `${body.problem || ''} ${body.lastMessage || ''}`.toLowerCase();

  if (mode === 'rubber-duck') {
    return {
      message: 'Vamos analisar isso passo a passo como bons engenheiros:\n\n1. **O que mudou exatamente** entre a última versão funcional e o primeiro momento em que o erro surgiu?\n2. **Onde exatamente** ocorre a falha: build, inicialização ou execução de uma rota?\n3. Qual foi o primeiro arquivo do seu próprio código citado no stack trace?',
      investigationType: 'question',
      hypotheses: [],
      tests: [],
      quickReplies: ['Falhou após atualizar dependências', 'Acontece apenas no build/CI', 'Ocorre no runtime'],
      suggestedActions: ['Adicionar logs completos', 'Executar um teste isolado', 'Refinar a hipótese'],
    };
  }

  if (mode === 'incident') {
    return {
      message: '🚨 **Ação imediata:** contenha o impacto primeiro. Considere rollback da última release, preserve logs e verifique reinicializações, memória e respostas 5xx antes de investigar a causa raiz.',
      investigationType: 'incident_action',
      tests: [{ title: 'Verificar saúde do serviço', command: 'curl -i https://service.example/health', purpose: 'Confirmar disponibilidade', expectedOutput: 'HTTP 200' }],
      quickReplies: ['Rollback executado', 'Logs coletados', 'Serviço estabilizado'],
    };
  }

  const nodeIssue = /node|glob|esm|import/.test(text);
  return {
    message: nodeIssue
      ? 'Há sinais de incompatibilidade de runtime, sistema de módulos ou quebra de API em uma dependência. Vamos validar a árvore instalada antes de alterar o código.'
      : 'Iniciando uma investigação estruturada. Vamos separar fatos, hipóteses e testes para reduzir o espaço de busca.',
    investigationType: 'hypothesis',
    hypotheses: [{
      title: nodeIssue ? 'Incompatibilidade de versão ou contrato ESM/CommonJS' : 'Divergência de configuração ou dependência',
      rationale: 'A falha pode ser isolada comparando runtime, lockfile e ambiente alvo.',
      confidence: 'medium',
      suggestedTests: nodeIssue ? ['node -v', 'npm ls glob'] : ['env | sort', 'npm ls --depth=1'],
    }],
    tests: [{
      title: 'Verificar ambiente e dependências',
      command: nodeIssue ? 'node -v && npm ls glob' : 'npm ls --depth=1',
      purpose: 'Coletar evidências reproduzíveis',
      expectedOutput: 'Comando concluído sem incompatibilidades',
    }],
    quickReplies: ['Executei o teste', 'Adicionei os logs', 'A hipótese foi confirmada'],
  };
}

function analyzeTest(body) {
  const classification = classifyOutput(body.actualOutput);
  return {
    verdict: classification.verdict,
    analysis: `O resultado foi classificado pelo motor local: ${(body.actualOutput || '').slice(0, 160) || 'nenhuma saída informada'}.`,
    updatedConfidence: classification.updatedConfidence,
    nextStep: classification.hasFailureSignal
      ? 'Confirmar a causa raiz e elaborar o plano de correção'
      : classification.verdict === 'contradicts'
        ? 'Descartar a hipótese e testar a próxima causa provável'
        : 'Coletar uma saída mais conclusiva antes de atualizar a hipótese',
  };
}

function synthesizeSolution(body) {
  return {
    rootCause: body.confirmedHypothesis?.title || 'Incompatibilidade ou configuração divergente detectada durante os testes.',
    solutionSteps: [
      'Aplicar a menor correção que atende às evidências coletadas.',
      'Limpar somente os artefatos de build relacionados.',
      'Executar novamente o teste que confirmou a causa e a suíte de regressão.',
    ],
    preventativeAction: 'Adicionar a verificação reproduzível ao pipeline de CI.',
    affectedVersions: [body.environment?.version || 'Atual'],
    confirmedVersions: [body.environment?.version || 'Atual'],
    alternativeFixes: ['Usar uma mitigação temporária documentada até a correção definitiva.'],
  };
}

async function handleApi(request, url) {
  if (request.method === 'GET' && url.pathname === '/api/debug/health') {
    return json({ status: 'ok', aiProvider: 'edge-fallback', timestamp: new Date().toISOString() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'GET, POST' } });
  }

  const body = await readJson(request);
  if (url.pathname === '/api/debug/investigate') return json(investigate(body));
  if (url.pathname === '/api/debug/analyze-test') return json(analyzeTest(body));
  if (url.pathname === '/api/debug/synthesize-solution') return json(synthesizeSolution(body));
  return json({ error: 'API route not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/debug/')) {
        return await handleApi(request, url);
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500;
      console.error(JSON.stringify({ event: 'request_failed', status, message: error instanceof Error ? error.message : 'unknown' }));
      return json({ error: status === 413 ? 'Payload too large' : 'Internal server error' }, { status });
    }
  },
};
