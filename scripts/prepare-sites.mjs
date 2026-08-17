import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist/client', { recursive: true, force: true });
await rm('dist/server', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await cp('dist/app/browser', 'dist/client', { recursive: true });
await cp('worker/index.js', 'dist/server/index.js');
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
