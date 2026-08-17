import { Injectable, signal, computed } from '@angular/core';
import { KnowledgeEntry, ConfidenceTier, EnvironmentInfo } from '../models/debug.model';

const SEED_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'kb-expo-sdk51-native',
    title: 'Falha de build no Expo SDK 51 após upgrade de versão',
    problemSummary: 'Build do Expo/React Native falha com erro "Invariant Violation: Native module cannot be null" ou erro de compilação gradle no Android após atualização do SDK 50 para SDK 51.',
    symptoms: [
      'Build local ou EAS Build falha durante a fase de resolução de dependências',
      'Crash imediato no bootstrap do app mobile',
      'Aviso de incompatibilidade de versão de react-native-reanimated ou expo-camera',
    ],
    environment: {
      language: 'TypeScript',
      framework: 'Expo / React Native',
      runtime: 'Node 20 / Hermes',
      version: 'SDK 51.0.0',
      os: 'macOS / Linux / EAS',
      targetEnv: 'build',
      relevantDeps: ['expo@51.0.0', 'react-native@0.74.x', 'react-native-reanimated@~3.10.1'],
    },
    rootCause: 'O SDK 51 do Expo introduziu uma nova versão do React Native e exigiu alinhamento estrito dos módulos nativos. Pacotes com pinning de versões anteriores do SDK 50 causavam linking com símbolos descontinuados.',
    solutionSteps: [
      'Executar o utilitário oficial: `npx expo-doctor` para listar discrepâncias exatas.',
      'Executar `npx expo install --fix` para alinhar todas as bibliotecas nativas compatíveis com SDK 51.',
      'Limpar os caches de bundler e gradle: `npx expo start -c` e `cd android && ./gradlew clean`.',
      'Se utilizar EAS Build, atualizar a imagem de build em `eas.json` para suportar Node 20+.',
    ],
    codeFix: `// package.json (Antes vs Depois)
// "react-native-reanimated": "^3.6.0" ❌
// "react-native-reanimated": "~3.10.1" ✅ (Versão oficial gerenciada pelo Expo)`,
    failedAttempts: [
      'Apenas rodar npm install sem atualizar as versões gerenciadas',
      'Adicionar flags de ignore (--force / --legacy-peer-deps)',
    ],
    affectedVersions: ['Expo SDK 50.x -> 51.0.0'],
    confirmedVersions: ['Expo SDK 51.0.0+'],
    confidenceTier: 'high',
    reproductionsCount: 42,
    publishedAt: '2026-06-12T14:30:00Z',
    tags: ['expo', 'react-native', 'sdk51', 'build-failure', 'gradle', 'eas'],
    contributor: 'Staff Mobile Engineer @ DevOpsHub',
  },
  {
    id: 'kb-node20-glob-esm',
    title: 'Incompatibilidade entre Node.js 20 e Glob v10 (TypeError: glob.sync is not a function)',
    problemSummary: 'Após atualizar o Node.js para a v20 ou atualizar pacotes, scripts de build CLI que utilizam glob quebram com erro de resolução de export maps ou chamada de função síncrona inexistente.',
    symptoms: [
      'TypeError: glob.sync is not a function',
      'ERR_PACKAGE_PATH_NOT_EXPORTED ao importar sub-caminhos de glob',
    ],
    environment: {
      language: 'TypeScript / JavaScript',
      framework: 'Node.js CLI',
      runtime: 'Node.js',
      version: 'v20.12.0',
      os: 'Linux / macOS / Windows',
      targetEnv: 'runtime',
      relevantDeps: ['glob@^10.0.0'],
    },
    rootCause: 'A biblioteca `glob` a partir da v10 foi reescrita como ESM nativo com exportação primária `glob` (assíncrono) e `globSync` nomeado, descontinuando o antigo `glob.sync` default export da v7/v8.',
    solutionSteps: [
      'Atualizar o import para nomeado: `import { globSync } from "glob"` ou `const { globSync } = require("glob")`.',
      'Ou substituir chamadas `glob(pattern, cb)` por `await glob(pattern)` usando a nova API baseada em Promises.',
      'Se o projeto ainda for CommonJS legado e não puder migrar a sintaxe, fixar temporariamente `glob@^8.1.0`.',
    ],
    codeFix: `// ANTES (Glob v7)
import glob from 'glob';
const files = glob.sync('src/**/*.ts');

// DEPOIS (Glob v10+)
import { globSync } from 'glob';
const files = globSync('src/**/*.ts');`,
    failedAttempts: [
      'Tentar desabilitar o strict ESM no tsconfig sem alterar os imports da biblioteca',
    ],
    affectedVersions: ['Node.js 18.x, 20.x', 'Glob 9.x, 10.x'],
    confirmedVersions: ['Glob 10.3.10+', 'Glob 11.0.0'],
    confidenceTier: 'high',
    reproductionsCount: 88,
    publishedAt: '2026-05-18T10:15:00Z',
    tags: ['node.js', 'glob', 'esm', 'commonjs', 'breaking-change'],
    contributor: 'Senior Backend Lead',
  },
  {
    id: 'kb-next-hydration-mismatch',
    title: 'Hydration Mismatch em SSR devido a timezone / renderização condicional de datas',
    problemSummary: 'Páginas SSR exibem erro "Hydration failed because the initial UI does not match what was rendered on the server" no console do navegador após o primeiro load.',
    symptoms: [
      'Alerta vermelho de mismatch no console do React/Next.js',
      'Elementos piscam ou texto renderizado no servidor difere do cliente',
    ],
    environment: {
      language: 'TypeScript',
      framework: 'Next.js / React 19',
      runtime: 'Node.js SSR',
      version: '15.1.0',
      os: 'All',
      targetEnv: 'runtime',
    },
    rootCause: 'O servidor renderizou a data utilizando o timezone UTC da máquina do servidor, enquanto o navegador do cliente renderizou utilizando o timezone local (ex: GMT-3), gerando DOM discrepante.',
    solutionSteps: [
      'Adicionar estado `mounted` com `useEffect` para componentes sensíveis ao relógio do cliente.',
      'Ou utilizar a propriedade `suppressHydrationWarning` no elemento HTML de data.',
      'Ou formatar datas sempre em UTC padronizado em ambos os lados.',
    ],
    codeFix: `// Correção recomendada com Hook de Montagem
export function FormattedTime({ date }: { date: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <span className="opacity-0">--:--</span>;
  return <span>{new Date(date).toLocaleTimeString()}</span>;
}`,
    failedAttempts: [
      'Desativar SSR para toda a página com no-ssr desnecessariamente',
    ],
    affectedVersions: ['React 18.x, 19.x', 'Next.js 13 - 15.x'],
    confirmedVersions: ['React 19.0.0'],
    confidenceTier: 'reproduced',
    reproductionsCount: 31,
    publishedAt: '2026-07-01T09:00:00Z',
    tags: ['next.js', 'react', 'ssr', 'hydration', 'timezone'],
    contributor: 'Frontend Staff Engineer',
  },
  {
    id: 'kb-cors-preflight-fastify',
    title: 'CORS Preflight (OPTIONS) retornando 403 ao enviar Header Authorization customizado',
    problemSummary: 'Chamadas de API via fetch/axios falham silenciosamente no browser com erro "Response to preflight request doesn\'t pass access control check: It does not have HTTP ok status".',
    symptoms: [
      'Network tab mostra requisição OPTIONS com status 403 Forbidden',
      'Requisições GET simples funcionam no Postman mas falham na Web',
    ],
    environment: {
      language: 'TypeScript',
      framework: 'Fastify / Express',
      runtime: 'Node.js',
      version: 'Fastify 4.26+',
      os: 'Linux (Docker)',
      targetEnv: 'production',
    },
    rootCause: 'O middleware de autenticação (JWT) foi registrado globalmente antes do plugin `@fastify/cors`, interceptando e rejeitando requisições `OPTIONS` (preflight) que não possuem token anexado por especificação de segurança do browser.',
    solutionSteps: [
      'Registrar o plugin de CORS ANTES de qualquer hook de autenticação ou middleware.',
      'Configurar `allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"]`.',
      'Configurar `preflight: true` e retornar status `204 No Content` para preflight.',
    ],
    codeFix: `// Ordem Correta
await app.register(fastifyCors, {
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
});

// Registrar Auth SOMENTE DEPOIS do CORS
app.addHook('onRequest', async (req, reply) => {
  if (req.method === 'OPTIONS') return; // Bypass preflight
  await verifyJwt(req, reply);
});`,
    failedAttempts: [
      'Tentar adicionar cabeçalhos CORS manualmente dentro da rota POST individual',
    ],
    affectedVersions: ['Fastify 4.x', 'Express 4.x - 5.x'],
    confirmedVersions: ['Fastify 4.28+'],
    confidenceTier: 'high',
    reproductionsCount: 57,
    publishedAt: '2026-04-10T11:20:00Z',
    tags: ['cors', 'preflight', 'fastify', 'express', 'jwt', 'security'],
    contributor: 'Security & API Architect',
  },
];

@Injectable({
  providedIn: 'root',
})
export class KnowledgeBaseService {
  private readonly STORAGE_KEY = 'ducktrace_knowledge_entries_v1';

  private entriesSignal = signal<KnowledgeEntry[]>(this.loadInitial());

  readonly entries = computed(() => this.entriesSignal());

  private loadInitial(): KnowledgeEntry[] {
    if (typeof window === 'undefined') return SEED_KNOWLEDGE_ENTRIES;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load knowledge entries from localStorage', e);
    }
    return SEED_KNOWLEDGE_ENTRIES;
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entriesSignal()));
    } catch (e) {
      console.error('Failed to save knowledge base', e);
    }
  }

  addEntry(entry: Omit<KnowledgeEntry, 'id' | 'publishedAt' | 'reproductionsCount'>): KnowledgeEntry {
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: 'kb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      publishedAt: new Date().toISOString(),
      reproductionsCount: 1,
    };

    this.entriesSignal.update((list) => [newEntry, ...list]);
    this.save();
    return newEntry;
  }

  upvoteReproduction(id: string) {
    this.entriesSignal.update((list) =>
      list.map((item) => {
        if (item.id === id) {
          const nextCount = item.reproductionsCount + 1;
          let tier: ConfidenceTier = item.confidenceTier;
          if (nextCount >= 5) tier = 'high';
          else if (nextCount >= 2) tier = 'reproduced';
          return {
            ...item,
            reproductionsCount: nextCount,
            confidenceTier: tier,
          };
        }
        return item;
      })
    );
    this.save();
  }

  search(query: string, options?: { language?: string; framework?: string; tier?: string }): KnowledgeEntry[] {
    const q = query.trim().toLowerCase();
    return this.entriesSignal().filter((entry) => {
      if (options?.language && options.language !== 'all') {
        if (!entry.environment.language.toLowerCase().includes(options.language.toLowerCase())) {
          return false;
        }
      }
      if (options?.framework && options.framework !== 'all') {
        if (!entry.environment.framework.toLowerCase().includes(options.framework.toLowerCase())) {
          return false;
        }
      }
      if (options?.tier && options.tier !== 'all') {
        if (entry.confidenceTier !== options.tier) {
          return false;
        }
      }

      if (!q) return true;

      const fullText = (
        entry.title +
        ' ' +
        entry.problemSummary +
        ' ' +
        entry.rootCause +
        ' ' +
        entry.environment.language +
        ' ' +
        entry.environment.framework +
        ' ' +
        entry.tags.join(' ')
      ).toLowerCase();

      return fullText.includes(q);
    });
  }

  findSimilar(problem: string, environment?: Partial<EnvironmentInfo>): { entry: KnowledgeEntry; score: number }[] {
    const p = (problem || '').toLowerCase();
    const lang = (environment?.language || '').toLowerCase();
    const fw = (environment?.framework || '').toLowerCase();

    const matches: { entry: KnowledgeEntry; score: number }[] = [];

    for (const entry of this.entriesSignal()) {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const summaryLower = entry.problemSummary.toLowerCase();
      const tags = entry.tags;

      if (lang && entry.environment.language.toLowerCase().includes(lang)) score += 25;
      if (fw && entry.environment.framework.toLowerCase().includes(fw)) score += 30;

      // Check keywords
      const words = p.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (titleLower.includes(w)) score += 15;
        if (summaryLower.includes(w)) score += 10;
        if (tags.some((t) => t.toLowerCase().includes(w))) score += 10;
      }

      if (score > 15) {
        matches.push({ entry, score: Math.min(score, 98) });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }
}
