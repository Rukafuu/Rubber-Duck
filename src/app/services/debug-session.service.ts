import { Injectable, inject, signal, computed } from '@angular/core';
import {
  ConfidenceScore,
  DebugMessage,
  DebugMode,
  DebugSession,
  DebugTest,
  EnvironmentInfo,
  Hypothesis,
  HypothesisStatus,
  SessionStatus,
  TestVerdict,
  ValidatedSolution,
} from '../models/debug.model';
import { AiDebugService } from './ai-debug.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { redactAllSecrets, scanForSecrets } from '../utils/secret-scanner';

const STORAGE_KEY = 'ducktrace_debug_sessions_v1';

const PRESET_SESSIONS: DebugSession[] = [
  {
    id: 'session-expo-sdk-51',
    title: 'Build do Expo começou a falhar após atualizar o SDK',
    description: 'Após rodar a atualização do Expo SDK 50 para SDK 51, o build Android local trava com erro de resolução de módulos nativos de animação e câmera.',
    mode: 'debugger',
    status: 'investigating',
    environment: {
      language: 'TypeScript',
      framework: 'Expo',
      runtime: 'React Native 0.74',
      version: 'SDK 51',
      os: 'macOS Sonoma (M2)',
      targetEnv: 'build',
      relevantDeps: ['expo@51.0.0', 'react-native-reanimated@3.6.0', 'expo-camera@14.0.0'],
    },
    rawLogs: `[stderr] FAILURE: Build failed with an exception.
* What went wrong:
Could not determine the dependencies of task ':react-native-reanimated:compileDebugJavaWithJavac'.
> Incompatible native module version for SDK 51. Expected ~3.10.1 but found ^3.6.0.
* Exception is:
org.gradle.api.tasks.TaskExecutionException: Execution failed for task ':react-native-reanimated:compileDebugJavaWithJavac'.`,
    stackTrace: `Task :react-native-reanimated:compileDebugJavaWithJavac FAILED
at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.executeIfValid(ExecuteActionsTaskExecuter.java:142)
at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.execute(ExecuteActionsTaskExecuter.java:134)`,
    relevantFiles: [
      {
        name: 'package.json',
        path: '/package.json',
        snippet: '{\n  "dependencies": {\n    "expo": "~51.0.0",\n    "react-native-reanimated": "^3.6.0"\n  }\n}',
      },
    ],
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Meu build do Expo começou a falhar depois de atualizar o SDK para a v51. O erro menciona compilação do Reanimated no Android.',
        timestamp: '2026-08-17T07:10:00Z',
        mode: 'debugger',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Investigando com método científico. Como você acabou de atualizar o SDK do Expo, formulamos hipóteses sobre incompatibilidade de pacotes nativos vinculados ao React Native 0.74. Não vamos alterar código sem evidências.',
        timestamp: '2026-08-17T07:10:05Z',
        mode: 'debugger',
        investigationType: 'hypothesis',
        suggestedActions: ['Executar o diagnóstico oficial npx expo-doctor', 'Inspecionar lockfile'],
        quickReplies: ['Executei npx expo-doctor', 'O erro acontece apenas no Android', 'Limpei o cache com -c'],
      },
    ],
    hypotheses: [
      {
        id: 'hyp-1',
        title: 'Versão do react-native-reanimated incompatível com o Expo SDK 51',
        rationale: 'O log explícito aponta que o SDK 51 exige Reanimated ~3.10.1, mas o package.json fixou 3.6.0.',
        supportingEvidence: ['Log do Gradle apontando Expected ~3.10.1 but found ^3.6.0', 'Upgrade recente do SDK'],
        counterEvidence: [],
        confidence: 'high',
        status: 'testing',
        suggestedTests: ['npx expo-doctor', 'npx expo install --check'],
        createdAt: '2026-08-17T07:10:05Z',
      },
      {
        id: 'hyp-2',
        title: 'Cache corrompido do Gradle / Metro Bundler',
        rationale: 'Artefatos compilados da versão 50 podem estar em conflito na pasta android/.gradle.',
        supportingEvidence: [],
        counterEvidence: ['Erro persistiu mesmo após restart do terminal'],
        confidence: 'medium',
        status: 'proposed',
        suggestedTests: ['cd android && ./gradlew clean'],
        createdAt: '2026-08-17T07:10:05Z',
      },
    ],
    tests: [
      {
        id: 'test-1',
        hypothesisId: 'hyp-1',
        title: 'Verificar alinhamento de dependências com expo-doctor',
        command: 'npx expo-doctor',
        purpose: 'Validar se há pacotes nativos fora do catálogo gerenciado do SDK 51',
        expectedOutput: 'Check dependencies for compatible versions: 1 warning found',
        status: 'pending',
      },
    ],
    secretsDetected: [],
    tags: ['expo', 'react-native', 'sdk51', 'gradle', 'android'],
    createdAt: '2026-08-17T07:10:00Z',
    updatedAt: '2026-08-17T07:10:05Z',
  },
  {
    id: 'session-node20-glob',
    title: 'Incompatibilidade entre Node 20 e dependência Glob',
    description: 'Após upgrade do Node.js de v18 para v20, a task de geração de bundle quebra com "TypeError: glob.sync is not a function".',
    mode: 'rubber-duck',
    status: 'investigating',
    environment: {
      language: 'JavaScript / Node',
      framework: 'Custom Build Script',
      runtime: 'Node.js',
      version: 'v20.12.0',
      os: 'Ubuntu 24.04 LTS',
      targetEnv: 'build',
      relevantDeps: ['glob@10.3.10'],
    },
    rawLogs: `TypeError: glob.sync is not a function
    at findSourceFiles (/workspace/scripts/bundle.js:14:22)
    at runBuild (/workspace/scripts/bundle.js:45:9)
    at Object.<anonymous> (/workspace/scripts/bundle.js:89:1)`,
    stackTrace: `TypeError: glob.sync is not a function
    at findSourceFiles (/workspace/scripts/bundle.js:14:22)
    at runBuild (/workspace/scripts/bundle.js:45:9)`,
    relevantFiles: [],
    messages: [
      {
        id: 'msg-nd-1',
        role: 'user',
        content: 'Minha pipeline começou a falhar com TypeError: glob.sync is not a function.',
        timestamp: '2026-08-17T06:40:00Z',
        mode: 'rubber-duck',
      },
      {
        id: 'msg-nd-2',
        role: 'assistant',
        content: '🦆 Olá! Vamos raciocinar juntos sobre essa falha:\n1. Como o `glob` está sendo importado no seu arquivo `/workspace/scripts/bundle.js`?\n2. Você notou se o `package-lock.json` atualizou a versão do `glob` da versão 7/8 para a versão 10 recentemente?\n3. O que acontece se você der um `console.log(glob)` antes da linha 14?',
        timestamp: '2026-08-17T06:40:10Z',
        mode: 'rubber-duck',
        investigationType: 'question',
        quickReplies: ['Importado como const glob = require("glob")', 'O lockfile atualizou para glob 10', 'O console.log mostra um objeto com globSync'],
      },
    ],
    hypotheses: [
      {
        id: 'hyp-nd-1',
        title: 'Glob v10 abandonou o default export síncrono em favor de named export globSync',
        rationale: 'Glob v10 reescreveu a API pública, trocando glob.sync() por globSync().',
        supportingEvidence: ['TypeError na chamada da função síncrona', 'Glob 10 no package.json'],
        counterEvidence: [],
        confidence: 'high',
        status: 'testing',
        suggestedTests: ['node -e "const g = require(\'glob\'); console.log(Object.keys(g))"'],
        createdAt: '2026-08-17T06:40:10Z',
      },
    ],
    tests: [],
    secretsDetected: [],
    tags: ['node.js', 'glob', 'esm', 'breaking-change'],
    createdAt: '2026-08-17T06:40:00Z',
    updatedAt: '2026-08-17T06:40:10Z',
  },
  {
    id: 'session-prod-incident',
    title: 'Incidente P0: Erro 503 / Heap Out of Memory na API de Checkout',
    description: 'A API de pagamentos começou a reiniciar em loop com exit code 137 (OOMKilled) após o pico das 08h.',
    mode: 'incident',
    status: 'investigating',
    environment: {
      language: 'TypeScript',
      framework: 'Express / Node.js',
      runtime: 'Node 20 Alpine',
      version: 'v3.4.1',
      os: 'Kubernetes Pods (Linux)',
      targetEnv: 'production',
    },
    rawLogs: `<--- Last few GCs --->
[34:0x5608d0]    45210 ms: Mark-sweep 2041.2 (2055.8) -> 2038.9 (2055.8) MB, 482.1 / 0.0 ms  (average mu = 0.124, current mu = 0.012) allocation failure; scavenge might not succeed
<--- JS stacktrace --->
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`,
    stackTrace: `1: 0xb83eb1 node::OOMErrorHandler(char const*, bool) [node]
2: 0xe58f5b v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [node]
3: 0xe592d7 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [node]`,
    relevantFiles: [],
    messages: [
      {
        id: 'msg-inc-1',
        role: 'user',
        content: 'Nossos pods de checkout estão sofrendo OOMKilled no Kubernetes!',
        timestamp: '2026-08-17T06:00:00Z',
        mode: 'incident',
      },
      {
        id: 'msg-inc-2',
        role: 'assistant',
        content: '🚨 **INCIDENTE ATIVO**: Prioridade 1 é contenção.\n1. Aumente temporariamente o limite de memória ou escale horizontalmente os pods para aliviar a carga.\n2. Inspecione se há vazamento em listeners não removidos ou buffers de logging em memória.',
        timestamp: '2026-08-17T06:00:08Z',
        mode: 'incident',
        investigationType: 'incident_action',
        quickReplies: ['Pods escalados para 10 réplicas', 'Rollback da última versão acionado', 'Heap dump gerado'],
      },
    ],
    hypotheses: [
      {
        id: 'hyp-inc-1',
        title: 'Buffer de telemetria retendo objetos de payload na memória sem flush',
        rationale: 'O heap cresce linearmente com o número de requisições de checkout até 2GB.',
        supportingEvidence: ['GC mark-sweep constante sem liberação de memória'],
        counterEvidence: [],
        confidence: 'high',
        status: 'testing',
        suggestedTests: ['node --max-old-space-size=4096'],
        createdAt: '2026-08-17T06:00:08Z',
      },
    ],
    tests: [],
    secretsDetected: [],
    tags: ['incident', 'p0', 'memory-leak', 'oom', 'kubernetes'],
    createdAt: '2026-08-17T06:00:00Z',
    updatedAt: '2026-08-17T06:00:08Z',
  },
];

@Injectable({
  providedIn: 'root',
})
export class DebugSessionService {
  private aiService = inject(AiDebugService);
  private kbService = inject(KnowledgeBaseService);

  private sessionsSignal = signal<DebugSession[]>(this.loadInitial());
  private activeIdSignal = signal<string>(this.sessionsSignal()[0]?.id || '');
  readonly isAiLoadingSignal = signal<boolean>(false);

  readonly sessions = computed(() => this.sessionsSignal());
  readonly activeSessionId = computed(() => this.activeIdSignal());

  readonly activeSession = computed<DebugSession | null>(() => {
    const id = this.activeIdSignal();
    return this.sessionsSignal().find((s) => s.id === id) || null;
  });

  private loadInitial(): DebugSession[] {
    if (typeof window === 'undefined') return PRESET_SESSIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load debug sessions from localStorage', e);
    }
    return PRESET_SESSIONS;
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionsSignal()));
    } catch (e) {
      console.error('Failed to save debug sessions to localStorage', e);
    }
  }

  selectSession(id: string) {
    this.activeIdSignal.set(id);
  }

  async createSession(data: {
    title: string;
    description: string;
    mode: DebugMode;
    environment: EnvironmentInfo;
    rawLogs?: string;
    stackTrace?: string;
    initialMessage?: string;
  }): Promise<DebugSession> {
    const rawContentToScan = `${data.description} ${data.rawLogs || ''} ${data.stackTrace || ''} ${data.initialMessage || ''}`;
    const secrets = scanForSecrets(rawContentToScan);

    const newSession: DebugSession = {
      id: 'session-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      title: data.title.trim(),
      description: data.description.trim(),
      mode: data.mode,
      status: 'investigating',
      environment: data.environment,
      rawLogs: data.rawLogs || '',
      stackTrace: data.stackTrace || '',
      relevantFiles: [],
      messages: [],
      hypotheses: [],
      tests: [],
      secretsDetected: secrets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [data.environment.language, data.environment.framework].filter(Boolean),
    };

    if (data.initialMessage) {
      newSession.messages.push({
        id: 'msg-' + Date.now(),
        role: 'user',
        content: data.initialMessage,
        timestamp: new Date().toISOString(),
        mode: data.mode,
      });
    }

    this.sessionsSignal.update((list) => [newSession, ...list]);
    this.activeIdSignal.set(newSession.id);
    this.save();

    // Trigger initial AI investigation
    this.triggerAiTurn(newSession.id, data.initialMessage || data.description);

    return newSession;
  }

  async sendUserMessage(content: string) {
    const session = this.activeSession();
    if (!session || !content.trim()) return;

    // Check for secrets
    const newSecrets = scanForSecrets(content);
    if (newSecrets.length > 0) {
      this.sessionsSignal.update((list) =>
        list.map((s) => {
          if (s.id === session.id) {
            return {
              ...s,
              secretsDetected: [...s.secretsDetected, ...newSecrets],
            };
          }
          return s;
        })
      );
    }

    const userMsg: DebugMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      mode: session.mode,
    };

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();

    await this.triggerAiTurn(session.id, content);
  }

  private async triggerAiTurn(sessionId: string, lastUserContent: string) {
    const current = this.sessionsSignal().find((s) => s.id === sessionId);
    if (!current) return;

    this.isAiLoadingSignal.set(true);

    try {
      const response = await this.aiService.investigate({
        mode: current.mode,
        problem: current.title,
        description: current.description,
        environment: current.environment,
        messages: current.messages,
        hypotheses: current.hypotheses,
        tests: current.tests,
        rawLogs: current.rawLogs,
        stackTrace: current.stackTrace,
        lastMessage: lastUserContent,
      });

      // Prepare AI message
      const aiMsg: DebugMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        mode: current.mode,
        investigationType: response.investigationType,
        quickReplies: response.quickReplies,
        suggestedActions: response.suggestedActions,
      };

      // Map hypotheses from AI if proposed
      const newHypotheses: Hypothesis[] = (response.hypotheses || []).map((h) => ({
        id: 'hyp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
        title: h.title,
        rationale: h.rationale,
        supportingEvidence: [],
        counterEvidence: [],
        confidence: (h.confidence as ConfidenceScore) || 'medium',
        status: 'proposed',
        suggestedTests: h.suggestedTests || [],
        createdAt: new Date().toISOString(),
      }));

      // Map tests from AI if proposed
      const newTests: DebugTest[] = (response.tests || []).map((t) => ({
        id: 'test-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
        title: t.title,
        command: t.command,
        purpose: t.purpose,
        expectedOutput: t.expectedOutput,
        status: 'pending',
      }));

      this.sessionsSignal.update((list) =>
        list.map((s) => {
          if (s.id === sessionId) {
            // Deduplicate hypotheses by title
            const existingTitles = new Set(s.hypotheses.map((item) => item.title.toLowerCase()));
            const uniqueHypotheses = newHypotheses.filter((item) => !existingTitles.has(item.title.toLowerCase()));

            const existingCommands = new Set(s.tests.map((item) => item.command.toLowerCase()));
            const uniqueTests = newTests.filter((item) => !existingCommands.has(item.command.toLowerCase()));

            return {
              ...s,
              messages: [...s.messages, aiMsg],
              hypotheses: [...s.hypotheses, ...uniqueHypotheses],
              tests: [...s.tests, ...uniqueTests],
              status: s.status === 'investigating' && (s.tests.length > 0 || uniqueTests.length > 0) ? 'testing' : s.status,
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      this.save();
    } catch (e) {
      console.error('Error during triggerAiTurn:', e);
    } finally {
      this.isAiLoadingSignal.set(false);
    }
  }

  addHypothesis(title: string, rationale: string, confidence: ConfidenceScore = 'medium', suggestedTests: string[] = []) {
    const session = this.activeSession();
    if (!session || !title.trim()) return;

    const hyp: Hypothesis = {
      id: 'hyp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
      title: title.trim(),
      rationale: rationale.trim(),
      supportingEvidence: [],
      counterEvidence: [],
      confidence,
      status: 'proposed',
      suggestedTests,
      createdAt: new Date().toISOString(),
    };

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            hypotheses: [...s.hypotheses, hyp],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  updateHypothesisStatus(id: string, status: HypothesisStatus, eliminationReason?: string, confidence?: ConfidenceScore) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            hypotheses: s.hypotheses.map((h) => {
              if (h.id === id) {
                return {
                  ...h,
                  status,
                  eliminationReason: eliminationReason !== undefined ? eliminationReason : h.eliminationReason,
                  confidence: confidence || (status === 'confirmed' ? 'confirmed' : status === 'rejected' ? 'low' : h.confidence),
                };
              }
              return h;
            }),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  addEvidenceToHypothesis(id: string, evidence: string, isSupporting: boolean) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            hypotheses: s.hypotheses.map((h) => {
              if (h.id === id) {
                return {
                  ...h,
                  supportingEvidence: isSupporting ? [...h.supportingEvidence, evidence] : h.supportingEvidence,
                  counterEvidence: !isSupporting ? [...h.counterEvidence, evidence] : h.counterEvidence,
                };
              }
              return h;
            }),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  addTest(
    testOrTitle: Partial<DebugTest> | string,
    command?: string,
    purpose?: string,
    expectedOutput?: string,
    hypothesisId?: string
  ) {
    const session = this.activeSession();
    if (!session) return;

    let test: DebugTest;
    if (typeof testOrTitle === 'object') {
      if (!testOrTitle.command?.trim()) return;
      test = {
        id: testOrTitle.id || 'test-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
        hypothesisId: testOrTitle.hypothesisId,
        title: testOrTitle.title?.trim() || `Executar ${testOrTitle.command.trim()}`,
        command: testOrTitle.command.trim(),
        purpose: testOrTitle.purpose?.trim() || 'Verificar diagnóstico',
        expectedOutput: testOrTitle.expectedOutput?.trim() || 'Sem erros',
        actualOutput: testOrTitle.actualOutput,
        status: testOrTitle.status || 'pending',
        verdict: testOrTitle.verdict,
        notes: testOrTitle.notes,
        aiAnalysis: testOrTitle.aiAnalysis,
      };
    } else {
      if (!command?.trim()) return;
      test = {
        id: 'test-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
        hypothesisId,
        title: testOrTitle.trim() || `Executar ${command.trim()}`,
        command: command.trim(),
        purpose: (purpose || '').trim() || 'Verificar diagnóstico',
        expectedOutput: (expectedOutput || '').trim() || 'Sem erros',
        status: 'pending',
      };
    }

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            tests: [...s.tests, test],
            status: s.status === 'investigating' ? 'testing' : s.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  deleteTest(testId: string) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            tests: s.tests.filter((t) => t.id !== testId),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  async recordTestResult(testId: string, actualOutput: string, verdict?: TestVerdict, notes?: string) {
    const session = this.activeSession();
    if (!session) return;

    const targetTest = session.tests.find((t) => t.id === testId);
    if (!targetTest) return;

    const targetHypothesis = session.hypotheses.find((h) => h.id === targetTest.hypothesisId);

    // Update test immediately
    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            tests: s.tests.map((t) => {
              if (t.id === testId) {
                return {
                  ...t,
                  actualOutput,
                  verdict: verdict || 'supports',
                  notes,
                  status: 'completed',
                  executedAt: new Date().toISOString(),
                };
              }
              return t;
            }),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();

    // Call AI to evaluate impact on hypotheses
    try {
      const analysis = await this.aiService.analyzeTest({
        test: targetTest,
        actualOutput,
        hypothesis: targetHypothesis,
        environment: session.environment,
      });

      if (targetHypothesis) {
        const isSupporting = analysis.verdict === 'supports';
        this.addEvidenceToHypothesis(
          targetHypothesis.id,
          `Resultado do comando \`${targetTest.command}\`: ${analysis.analysis}`,
          isSupporting
        );

        if (analysis.verdict === 'contradicts') {
          this.updateHypothesisStatus(targetHypothesis.id, 'rejected', analysis.analysis, 'low');
        } else if (analysis.verdict === 'supports' && analysis.updatedConfidence === 'confirmed') {
          this.updateHypothesisStatus(targetHypothesis.id, 'confirmed', undefined, 'confirmed');
        }
      }

      // Add AI observation message in chat
      const aiMsg: DebugMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: `**Resultado do Teste Analisado** (\`${targetTest.command}\`):\n${analysis.analysis}\n\n👉 **Próximo passo recomendado**: ${analysis.nextStep}`,
        timestamp: new Date().toISOString(),
        mode: session.mode,
        investigationType: 'fact_check',
        quickReplies: ['Avançar para a solução', 'Executar novo teste', 'Registrar hipótese alternativa'],
      };

      this.sessionsSignal.update((list) =>
        list.map((s) => {
          if (s.id === session.id) {
            return {
              ...s,
              messages: [...s.messages, aiMsg],
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      this.save();
    } catch (e) {
      console.error('Error analyzing test result with AI:', e);
    }
  }

  async generateSolutionPlaybook(notes?: string) {
    const session = this.activeSession();
    if (!session) return;

    const confirmedHyp = session.hypotheses.find((h) => h.status === 'confirmed') || session.hypotheses[0];

    try {
      this.isAiLoadingSignal.set(true);
      const partialSol = await this.aiService.synthesizeSolution({
        problem: session.title,
        environment: session.environment,
        confirmedHypothesis: confirmedHyp,
        tests: session.tests,
        notes,
      });

      const fullSolution: ValidatedSolution = {
        rootCause: partialSol.rootCause || 'Causa identificada e comprovada nos testes.',
        solutionSteps: partialSol.solutionSteps || ['Alinhar versões das dependências afetadas.'],
        codeFix: partialSol.codeFix,
        preventativeAction: partialSol.preventativeAction || 'Implementar testes de regressão no CI.',
        affectedVersions: partialSol.affectedVersions || [session.environment.version],
        confirmedVersions: partialSol.confirmedVersions || [session.environment.version],
        alternativeFixes: partialSol.alternativeFixes || [],
        userConfirmed: false,
        confidenceTier: 'experimental',
      };

      this.sessionsSignal.update((list) =>
        list.map((s) => {
          if (s.id === session.id) {
            return {
              ...s,
              solution: fullSolution,
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      this.save();
    } finally {
      this.isAiLoadingSignal.set(false);
    }
  }

  confirmSolution(contributorNote?: string) {
    const session = this.activeSession();
    if (!session || !session.solution) return;

    const updatedSolution: ValidatedSolution = {
      ...session.solution,
      userConfirmed: true,
      confirmedAt: new Date().toISOString(),
      confidenceTier: 'tested',
      contributorNote,
    };

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            status: 'solved',
            solution: updatedSolution,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();

    // Auto publish to Knowledge Base
    this.kbService.addEntry({
      sessionId: session.id,
      title: session.title,
      problemSummary: session.description,
      symptoms: [session.description, ...(session.rawLogs ? [session.rawLogs.slice(0, 200)] : [])],
      environment: session.environment,
      rootCause: updatedSolution.rootCause,
      solutionSteps: updatedSolution.solutionSteps,
      codeFix: updatedSolution.codeFix,
      failedAttempts: session.hypotheses.filter((h) => h.status === 'rejected').map((h) => h.title),
      affectedVersions: updatedSolution.affectedVersions,
      confirmedVersions: updatedSolution.confirmedVersions,
      confidenceTier: 'tested',
      tags: session.tags,
      contributor: 'Engenheiro de Software (Validado)',
    });
  }

  setSessionStatus(status: SessionStatus) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return { ...s, status, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    this.save();
  }

  switchMode(mode: DebugMode) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return { ...s, mode, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
    this.save();
  }

  redactSecretsInActiveSession() {
    const session = this.activeSession();
    if (!session) return;

    const { redactedText: cleanDesc } = redactAllSecrets(session.description);
    const { redactedText: cleanLogs } = redactAllSecrets(session.rawLogs);
    const { redactedText: cleanStack } = redactAllSecrets(session.stackTrace);

    const cleanMessages = session.messages.map((m) => {
      const { redactedText } = redactAllSecrets(m.content);
      return { ...m, content: redactedText };
    });

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            description: cleanDesc,
            rawLogs: cleanLogs,
            stackTrace: cleanStack,
            messages: cleanMessages,
            secretsDetected: [],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }

  deleteSession(id: string) {
    this.sessionsSignal.update((list) => list.filter((s) => s.id !== id));
    if (this.activeIdSignal() === id) {
      this.activeIdSignal.set(this.sessionsSignal()[0]?.id || '');
    }
    this.save();
  }

  updateSessionEnvironment(environment: Partial<EnvironmentInfo>) {
    const session = this.activeSession();
    if (!session) return;

    this.sessionsSignal.update((list) =>
      list.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            environment: { ...s.environment, ...environment },
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    this.save();
  }
}
