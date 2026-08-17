import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import { classifyTestOutput } from './app/utils/test-output-classifier';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '10mb' }));

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// SYSTEM INSTRUCTIONS BY DEBUGGING MODE
// -------------------------------------------------------------
function buildSystemInstruction(mode: string, env: Record<string, string | undefined>): string {
  const baseEnv = `
Target Environment: ${env?.['language'] || 'Unknown'} / ${env?.['framework'] || 'General'}
Runtime: ${env?.['runtime'] || 'N/A'}, Version: ${env?.['version'] || 'N/A'}, OS: ${env?.['os'] || 'N/A'}
Stage: ${env?.['targetEnv'] || 'local'}`;

  switch (mode) {
    case 'rubber-duck':
      return `You are a world-class Rubber Duck Debugger.
PHILOSOPHY: DO NOT immediately give the final answer or code dump.
Your job is to make the developer verbalize and think through their problem systematically.
1. Distinguish between facts provided by the developer and unverified assumptions.
2. Ask 1-3 targeted, insightful diagnostic questions about what changed, execution order, environment state, or lifecycle hooks.
3. If the user presents new logs or insights, guide them to deduce the culprit themselves.
${baseEnv}`;

    case 'debugger':
      return `You are an elite Staff Systems Debugger conducting a scientific investigation.
PHILOSOPHY:
- Scientific Method: Facts -> Hypotheses -> Isolated Tests -> Evidence Update -> Elimination -> Root Cause.
- Never guess blindly. Distinguish verified facts from unproven assumptions.
- Explicitly propose testable hypotheses with confidence scores (low, medium, high).
- Propose concrete diagnostic terminal commands or inspection steps (e.g. \`npm ls <pkg>\`, environment check, network inspection) to falsify or confirm hypotheses.
- When test output is received, update evidence and mark hypotheses as rejected or confirmed.
${baseEnv}`;

    case 'mentor':
      return `You are a distinguished Senior Principal Mentor Engineer.
PHILOSOPHY:
- Investigate the issue thoroughly while simultaneously educating the developer on underlying mechanics (e.g., Node module resolution, event loop phases, memory layout, bundling mechanics, SSR hydration vs CSR).
- Provide architectural clarity and best practices to prevent similar classes of bugs in the future.
${baseEnv}`;

    case 'incident':
      return `You are a High-Urgency Incident Commander handling an active production outage.
PHILOSOPHY:
1. RESTORE SERVICE & CONTAIN IMPACT FIRST (Rollback, traffic reroute, feature flag, cache flush, killswitch).
2. Triage rapidly without long theoretical lectures.
3. Propose zero-downtime hotfixes or mitigations.
4. Formulate post-mortem and root cause only after mitigation is confirmed.
${baseEnv}`;

    default:
      return `You are an expert collaborative debugging engineer. Guide scientific troubleshooting step by step. ${baseEnv}`;
  }
}

// -------------------------------------------------------------
// INTELLIGENT FALLBACK MOCK ENGINE
// -------------------------------------------------------------
interface FallbackBody {
  mode?: string;
  problem?: string;
  lastMessage?: string;
  environment?: Record<string, string>;
  hypotheses?: unknown[];
  tests?: unknown[];
}

function generateFallbackInvestigation(body: FallbackBody) {
  const { mode, problem, lastMessage } = body;
  const text = ((problem || '') + ' ' + (lastMessage || '')).toLowerCase();

  let responseText = '';
  let suggestedHypotheses: {
    title: string;
    rationale: string;
    confidence: string;
    suggestedTests: string[];
  }[] = [];
  let suggestedTests: {
    title: string;
    command: string;
    purpose: string;
    expectedOutput: string;
  }[] = [];
  let quickReplies: string[] = ['Adicionei os logs completos', 'Executei o teste sugerido', 'O erro persiste'];
  let investigationType: 'question' | 'fact_check' | 'hypothesis' | 'test_proposal' | 'solution' | 'incident_action' = 'hypothesis';

  if (mode === 'rubber-duck') {
    investigationType = 'question';
    responseText = `Vamos analisar isso passo a passo como bons engenheiros:

1. **O que mudou exatamente** entre a última versão funcional e o primeiro momento em que o erro surgiu (ex: atualização de lockfile, versão do runtime, variáveis de ambiente)?
2. **Onde exatamente** ocorre a falha: no processo de compilação/build estático, no bootstrap da aplicação ou durante a execução de uma rota específica?
3. Se você inspecionar o stack trace, qual foi o primeiro arquivo do seu próprio código que chamou a biblioteca antes de estourar?`;
    quickReplies = [
      'Falhou logo após atualizar dependências',
      'Acontece apenas em ambiente de build/CI',
      'No runtime quando o usuário acessa a rota',
    ];
  } else if (mode === 'incident') {
    investigationType = 'incident_action';
    responseText = `🚨 **Ação Imediata de Mitigação (Incidente Ativo)**:
1. **Contenção**: Se a versão anterior era estável, realize o rollback imediato da release para estancar o impacto aos usuários.
2. **Isolamento**: Verifique se a falha decorre de uma dependência externa indisponível ou de esgotamento de conexões/memória.
3. **Telemetria**: Isole as instâncias com crash para coleta de heap dump e preserve os logs antes do restart.`;
    suggestedTests = [
      {
        title: 'Verificar status de pods / processos e uso de memória',
        command: 'ps aux | grep node || kubectl get pods -l app=service',
        purpose: 'Identificar se o processo sofreu OOMKilled ou crash loop',
        expectedOutput: 'Processos saudáveis sem reinicializações anômalas',
      },
      {
        title: 'Inspecionar tráfego de erro HTTP 5xx',
        command: 'curl -I -X GET https://localhost:3000/api/health',
        purpose: 'Verificar se o health check responde status 200',
        expectedOutput: 'HTTP/1.1 200 OK',
      },
    ];
    quickReplies = ['Rollback executado com sucesso', 'Serviço reiniciado temporariamente', 'Logs coletados'];
  } else if (text.includes('expo') || text.includes('sdk') || text.includes('react-native')) {
    responseText = `Análise diagnóstica para ecossistema Expo / React Native:
Identificamos indícios clássicos de descasamento entre a versão do SDK do Expo e as dependências nativas no lockfile após o upgrade.`;
    suggestedHypotheses = [
      {
        title: 'Conflito de versões nativas ou dependências não compatíveis com o novo Expo SDK',
        rationale: 'Ao atualizar o Expo SDK, pacotes nativos precisam estar estritamente alinhados com o SDK target.',
        confidence: 'high',
        suggestedTests: ['npx expo-doctor', 'npx expo install --check'],
      },
      {
        title: 'Cache residual de Metro bundler ou pods desatualizados',
        rationale: 'Bundlers frequentemente mantêm artefatos compilados da versão anterior.',
        confidence: 'medium',
        suggestedTests: ['npx expo start -c', 'npx pod-install'],
      },
    ];
    suggestedTests = [
      {
        title: 'Executar diagnóstico automático do Expo',
        command: 'npx expo-doctor',
        purpose: 'Verificar integridade de dependências e compatibilidade com o SDK',
        expectedOutput: 'Todos os pacotes compatíveis sem avisos de versão discrepante',
      },
      {
        title: 'Verificar pacotes que necessitam de alinhamento com o SDK',
        command: 'npx expo install --check',
        purpose: 'Identificar módulos de terceiros instalados com versão incompatível',
        expectedOutput: 'Dependencies are up to date with SDK version',
      },
    ];
  } else if (text.includes('node') || text.includes('glob') || text.includes('esm') || text.includes('import')) {
    responseText = `Diagnóstico de resolução de módulos e compatibilidade de Runtime:
Identificamos provável divergência entre o sistema de módulos (ESM vs CommonJS) ou quebra de contrato de API em versão major de dependência de utilitários de arquivos.`;
    suggestedHypotheses = [
      {
        title: 'Incompatibilidade entre versão do Node.js e specifiers ESM da dependência',
        rationale: 'Versões recentes exigem export maps explícitos ou mudaram APIs síncronas para assíncronas.',
        confidence: 'high',
        suggestedTests: ['node -v', 'npm ls glob', 'npm ls rimraf'],
      },
      {
        title: 'Múltiplas versões duplicadas do mesmo pacote na árvore node_modules',
        rationale: 'Diferentes dependências transitivas exigindo versões conflitantes.',
        confidence: 'medium',
        suggestedTests: ['npm explain <package-name>'],
      },
    ];
    suggestedTests = [
      {
        title: 'Inspecionar versões transitivas instaladas na árvore',
        command: 'npm ls glob',
        purpose: 'Identificar se existem versões major concorrentes (ex: v7 e v10)',
        expectedOutput: 'Árvore de dependências deduplicada',
      },
      {
        title: 'Verificar versão atual do runtime ativo',
        command: 'node -v && npm -v',
        purpose: 'Confirmar paridade de versão com o target do projeto',
        expectedOutput: 'Node v20.x ou runtime suportado',
      },
    ];
  } else {
    responseText = `Iniciando investigação estruturada do problema técnico:
Para isolar a causa raiz com precisão científica, formulamos hipóteses preliminares e propomos comandos de teste diagnósticos.`;
    suggestedHypotheses = [
      {
        title: 'Divergência de configuração de ambiente ou variável ausente',
        rationale: 'Falhas repentinas frequentemente decorrem de variáveis de ambiente não propagadas ou alteradas.',
        confidence: 'medium',
        suggestedTests: ['env | grep -E "NODE|API|URL|PORT"', 'ls -la .env*'],
      },
      {
        title: 'Conflito de estado ou cache corrompido de compilação',
        rationale: 'Build tools mantêm caches incrementais que podem ficar inconsistentes após mudanças.',
        confidence: 'medium',
        suggestedTests: ['rm -rf node_modules .cache dist && npm install'],
      },
    ];
    suggestedTests = [
      {
        title: 'Verificar integridade do build e dependências',
        command: 'npm run build -- --verbose',
        purpose: 'Obter stack trace detalhado e linhas exatas do erro',
        expectedOutput: 'Build concluído com código de saída 0',
      },
    ];
  }

  return {
    message: responseText,
    investigationType,
    hypotheses: suggestedHypotheses,
    tests: suggestedTests,
    quickReplies,
    suggestedActions: [
      'Executar comando sugerido',
      'Adicionar trecho de código relevante',
      'Refinar hipóteses com novo log',
    ],
  };
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Core Investigation Endpoint
app.post('/api/debug/investigate', async (req: Request, res: Response) => {
  try {
    const {
      mode = 'debugger',
      problem,
      description,
      environment,
      messages = [],
      hypotheses = [],
      tests = [],
      rawLogs = '',
      stackTrace = '',
    } = req.body;

    const ai = getAI();
    if (!ai) {
      const fallback = generateFallbackInvestigation(req.body);
      return res.json(fallback);
    }

    const systemInstruction = buildSystemInstruction(mode, environment);

    // Build structured prompt with compact context
    const recentMessages = (messages as { role: string; content: string }[])
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    const existingHypotheses = (hypotheses as { status: string; title: string; confidence: string }[])
      .map((h) => `- [${h.status}] ${h.title} (Confidence: ${h.confidence})`)
      .join('\n');
    const existingTests = (tests as { status: string; command: string; verdict?: string; actualOutput?: string }[])
      .map((t) => `- [${t.status}] ${t.command} -> ${t.verdict || 'pending'} (Result: ${t.actualOutput || 'N/A'})`)
      .join('\n');

    const prompt = `
PROBLEM TITLE: ${problem || 'Investigation'}
DESCRIPTION: ${description || 'No description'}
ENVIRONMENT: ${JSON.stringify(environment || {})}
${rawLogs ? `LOGS:\n\`\`\`\n${rawLogs.slice(0, 1500)}\n\`\`\`` : ''}
${stackTrace ? `STACK TRACE:\n\`\`\`\n${stackTrace.slice(0, 1500)}\n\`\`\`` : ''}

CURRENT HYPOTHESES:
${existingHypotheses || 'None yet'}

RECORDED TESTS & RESULTS:
${existingTests || 'None yet'}

RECENT CONVERSATION HISTORY:
${recentMessages || 'Initial step'}

TASK:
Analyze the situation strictly according to the mode "${mode}".
Return a valid JSON object matching the schema:
{
  "message": "Your response to the developer in Portuguese (PT-BR). Be concise, technical, precise, and respectful of the chosen mode philosophy.",
  "investigationType": "question" | "fact_check" | "hypothesis" | "test_proposal" | "solution" | "incident_action",
  "hypotheses": [
    {
      "title": "Clear, falsifiable hypothesis title",
      "rationale": "Why this is likely based on evidence",
      "confidence": "low" | "medium" | "high",
      "suggestedTests": ["command to test"]
    }
  ],
  "tests": [
    {
      "title": "Title of diagnostic test",
      "command": "Exact command or action (e.g. npm ls x)",
      "purpose": "What this proves or disproves",
      "expectedOutput": "Expected result if hypothesis is true"
    }
  ],
  "quickReplies": ["3 short convenient developer replies"],
  "suggestedActions": ["1-3 action items"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            investigationType: {
              type: Type.STRING,
              enum: ['question', 'fact_check', 'hypothesis', 'test_proposal', 'solution', 'incident_action'],
            },
            hypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                  suggestedTests: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'rationale', 'confidence'],
              },
            },
            tests: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  command: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                },
                required: ['title', 'command', 'purpose', 'expectedOutput'],
              },
            },
            quickReplies: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['message', 'investigationType'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/debug/investigate:', error);
    const fallback = generateFallbackInvestigation(req.body);
    return res.json(fallback);
  }
});

// 2. Test Result Analyzer Endpoint
app.post('/api/debug/analyze-test', async (req: Request, res: Response) => {
  try {
    const { test, actualOutput, hypothesis } = req.body;
    const ai = getAI();

    if (!ai) {
      const classification = classifyTestOutput(actualOutput);
      return res.json({
        verdict: classification.verdict,
        analysis: `O resultado da execução do teste foi registrado. Com base na saída obtida (${actualOutput?.slice(0, 100)}...), a hipótese "${hypothesis?.title || 'atual'}" ganha novos indícios para avaliação.`,
        updatedConfidence: classification.updatedConfidence,
        nextStep: classification.hasFailureSignal
          ? 'Confirmar a causa raiz e elaborar plano de correção'
          : classification.verdict === 'contradicts'
            ? 'Descartar esta hipótese e testar a próxima causa provável'
            : 'Coletar uma saída mais conclusiva antes de atualizar a hipótese',
      });
    }

    const prompt = `
TEST EXECUTED:
Command: ${test?.command}
Purpose: ${test?.purpose}
Expected Output: ${test?.expectedOutput}
ACTUAL OUTPUT RECORDED:
\`\`\`
${actualOutput}
\`\`\`
TARGET HYPOTHESIS:
${hypothesis ? `${hypothesis.title} (Current status: ${hypothesis.status}, Confidence: ${hypothesis.confidence})` : 'General diagnostic'}

Analyze this output. Does it support, contradict, or remain inconclusive regarding the hypothesis?
Return JSON:
{
  "verdict": "supports" | "contradicts" | "inconclusive",
  "analysis": "Precise explanation in Portuguese (PT-BR)",
  "updatedConfidence": "low" | "medium" | "high" | "confirmed",
  "nextStep": "Recommended next action for developer"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, enum: ['supports', 'contradicts', 'inconclusive'] },
            analysis: { type: Type.STRING },
            updatedConfidence: { type: Type.STRING, enum: ['low', 'medium', 'high', 'confirmed'] },
            nextStep: { type: Type.STRING },
          },
          required: ['verdict', 'analysis', 'updatedConfidence', 'nextStep'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/debug/analyze-test:', error);
    return res.json({
      verdict: 'supports',
      analysis: 'Resultado processado com evidências adicionadas à investigação.',
      updatedConfidence: 'medium',
      nextStep: 'Prosseguir com a validação das alterações',
    });
  }
});

// 3. Solution Playbook Synthesis Endpoint
app.post('/api/debug/synthesize-solution', async (req: Request, res: Response) => {
  try {
    const { problem, environment, confirmedHypothesis, tests, notes } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json({
        rootCause: confirmedHypothesis?.title || 'Incompatibilidade ou configuração divergente detectada durante os testes.',
        solutionSteps: [
          'Atualizar as dependências afetadas para versões explicitamente suportadas.',
          'Limpar os caches de compilação e artefatos de build temporários.',
          'Executar a suíte de validação para assegurar que a regressão foi sanada.',
        ],
        codeFix: `// Exemplo de correção aplicada\n// Verifique o arquivo de configuração ou lockfile correspondente`,
        preventativeAction: 'Adicionar verificação de compatibilidade de versões no pipeline de CI.',
        affectedVersions: [environment?.version || 'Atual'],
        confirmedVersions: [environment?.version || 'Atual'],
        alternativeFixes: ['Utilizar flag de compatibilidade temporária se a migração imediata não for viável.'],
      });
    }

    const prompt = `
PROBLEM: ${problem}
ENVIRONMENT: ${JSON.stringify(environment)}
CONFIRMED HYPOTHESIS: ${JSON.stringify(confirmedHypothesis)}
TESTS CONDUCTED: ${JSON.stringify(tests)}
DEVELOPER NOTES: ${notes || ''}

Synthesize a comprehensive, production-ready validated solution playbook in Portuguese (PT-BR).
Return JSON:
{
  "rootCause": "Clear explanation of the exact root cause",
  "solutionSteps": ["Step 1", "Step 2", "Step 3"],
  "codeFix": "Code snippet or command fix if applicable",
  "preventativeAction": "How to prevent this in CI/testing/architecture",
  "affectedVersions": ["e.g. 18.x, 20.0 - 20.3"],
  "confirmedVersions": ["e.g. 20.4+"],
  "alternativeFixes": ["Optional fallback or workaround if permanent fix takes time"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING },
            solutionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            codeFix: { type: Type.STRING },
            preventativeAction: { type: Type.STRING },
            affectedVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
            confirmedVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
            alternativeFixes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['rootCause', 'solutionSteps', 'preventativeAction'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/debug/synthesize-solution:', error);
    return res.status(500).json({ error: 'Failed to synthesize solution' });
  }
});

// 4. Health Check
app.get('/api/debug/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiProvider: process.env['GEMINI_API_KEY'] ? 'gemini-3.7-flash' : 'mock-fallback',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
