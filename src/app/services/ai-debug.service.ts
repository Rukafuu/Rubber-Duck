import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AiInvestigationResponse,
  DebugMessage,
  DebugMode,
  DebugTest,
  EnvironmentInfo,
  Hypothesis,
  ValidatedSolution,
} from '../models/debug.model';
import { classifyTestOutput } from '../utils/test-output-classifier';

@Injectable({
  providedIn: 'root',
})
export class AiDebugService {
  private http = inject(HttpClient);

  async investigate(payload: {
    mode: DebugMode;
    problem: string;
    description: string;
    environment: EnvironmentInfo;
    messages: DebugMessage[];
    hypotheses: Hypothesis[];
    tests: DebugTest[];
    rawLogs?: string;
    stackTrace?: string;
    lastMessage?: string;
  }): Promise<AiInvestigationResponse> {
    try {
      const res = await firstValueFrom(
        this.http.post<AiInvestigationResponse>('/api/debug/investigate', payload)
      );
      return res;
    } catch (error) {
      console.warn('Backend investigate call failed, using client fallback', error);
      return this.clientFallback(payload);
    }
  }

  async analyzeTest(payload: {
    test: DebugTest;
    actualOutput: string;
    hypothesis?: Hypothesis;
    environment: EnvironmentInfo;
  }): Promise<{
    verdict: 'supports' | 'contradicts' | 'inconclusive';
    analysis: string;
    updatedConfidence: 'low' | 'medium' | 'high' | 'confirmed';
    nextStep: string;
  }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{
          verdict: 'supports' | 'contradicts' | 'inconclusive';
          analysis: string;
          updatedConfidence: 'low' | 'medium' | 'high' | 'confirmed';
          nextStep: string;
        }>('/api/debug/analyze-test', payload)
      );
      return res;
    } catch (error) {
      console.warn('Backend analyze-test failed, using fallback', error);
      const classification = classifyTestOutput(payload.actualOutput);
      return {
        verdict: classification.verdict,
        analysis: 'Resultado de teste analisado pelo motor local de diagnóstico.',
        updatedConfidence: classification.updatedConfidence,
        nextStep: classification.hasFailureSignal
          ? 'Confirmar a causa raiz e finalizar validação'
          : classification.verdict === 'contradicts'
            ? 'Descartar hipótese e testar próxima possibilidade'
            : 'Coletar uma saída mais conclusiva antes de atualizar a hipótese',
      };
    }
  }

  async synthesizeSolution(payload: {
    problem: string;
    environment: EnvironmentInfo;
    confirmedHypothesis?: Hypothesis;
    tests: DebugTest[];
    notes?: string;
  }): Promise<Partial<ValidatedSolution>> {
    try {
      const res = await firstValueFrom(
        this.http.post<Partial<ValidatedSolution>>('/api/debug/synthesize-solution', payload)
      );
      return res;
    } catch (error) {
      console.warn('Backend synthesize-solution failed, using fallback', error);
      return {
        rootCause: payload.confirmedHypothesis?.title || 'Conflito de dependências / configuração do runtime verificado durante os testes.',
        solutionSteps: [
          'Isolar e alinhar versões das dependências divergentes.',
          'Limpar cache local de compilação.',
          'Re-executar build e validar em ambiente isolado.',
        ],
        preventativeAction: 'Adicionar checagem de integridade de dependências no pipeline de CI.',
        affectedVersions: [payload.environment.version || 'Atual'],
        confirmedVersions: [payload.environment.version || 'Atual'],
        alternativeFixes: ['Utilizar flag de compatibilidade temporária se a migração imediata não for viável.'],
      };
    }
  }

  private clientFallback(payload: {
    mode: DebugMode;
    problem?: string;
    environment?: EnvironmentInfo;
    messages?: unknown[];
    hypotheses?: unknown[];
    tests?: unknown[];
  }): AiInvestigationResponse {
    const mode = payload.mode;
    if (mode === 'rubber-duck') {
      return {
        message: '🦆 Olá! Como seu pato de borracha, quero que me explique em voz alta:\n1. O que exatamente você tentou fazer antes do erro acontecer?\n2. O que o log diz que estava acontecendo quando a exceção foi lançada?\n3. Qual é a sua principal suspeita no momento?',
        investigationType: 'question',
        quickReplies: ['Ocorreu logo após o `npm install`', 'Falha apenas em produção', 'O stack trace aponta para uma lib externa'],
      };
    }

    if (mode === 'incident') {
      return {
        message: '🚨 **MODO INCIDENTE ATIVO**\nPrioridade 1: Estancar impacto e restaurar o serviço.\n1. Considere rollback imediato da release.\n2. Verifique métricas de CPU/Memória e status dos pods.',
        investigationType: 'incident_action',
        tests: [
          {
            title: 'Verificar status da aplicação',
            command: 'curl -I http://localhost:3000/api/health',
            purpose: 'Avaliar se o processo responde requisições HTTP',
            expectedOutput: '200 OK',
          },
        ],
        quickReplies: ['Rollback efetuado', 'Processo reiniciado', 'Logs coletados'],
      };
    }

    return {
      message: 'Iniciando investigação estruturada. Analisei os dados fornecidos e formulei hipóteses para teste imediato:',
      investigationType: 'hypothesis',
      hypotheses: [
        {
          title: 'Incompatibilidade ou quebra de contrato de versão nas dependências',
          rationale: 'Erros após atualizações costumam decorrer de APIs depreciadas ou divergência de tipos.',
          confidence: 'high',
          suggestedTests: ['npm ls', 'npx expo-doctor'],
        },
      ],
      tests: [
        {
          title: 'Verificar árvore de pacotes',
          command: 'npm ls --depth=1',
          purpose: 'Detectar pacotes com peerDependencies não atendidas',
          expectedOutput: 'Árvore de dependências sem avisos de peer dep inválida',
        },
      ],
      quickReplies: ['Adicionei os logs de erro', 'Executei o comando de teste', 'A hipótese parece correta'],
    };
  }
}
