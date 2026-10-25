// Regressões do ciclo de atualização: node scripts/check-service-pwa.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('app/service/PwaBootstrap.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function app({ version = 'new', blocked = false, editing = false, offline = false } = {}) {
  const state = { version, blocked, editing, offline, reloads: 0, requests: 0 };
  const events = new Map();
  const docEvents = new Map();
  const document = {
    visibilityState: 'visible',
    querySelector: () => state.blocked,
    activeElement: { matches: () => state.editing },
    addEventListener: (n, f) => docEvents.set(n, f),
    removeEventListener: n => docEvents.delete(n),
  };
  let effect, cleanup, tick;
  const window = {
    location: { reload: () => state.reloads++ },
    addEventListener: (n, f) => events.set(n, f),
    removeEventListener: n => events.delete(n),
    setInterval: f => { tick = f; return 1; },
    clearInterval: () => { tick = null; },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, process: { env: { NEXT_PUBLIC_SERVICE_VERSION: 'old' } },
    require: n => n === 'react' ? { useEffect: f => { effect = f; } } : { guardarPedidoInstalacao() {} },
    navigator: {}, window, document, Date, AbortSignal,
    fetch: async () => {
      state.requests++;
      if (state.offline) throw new Error('offline');
      return { ok: true, json: async () => ({ versao: state.version }) };
    },
  });
  exports.default();
  cleanup = effect();
  return { state, document, events, docEvents, tick: () => tick?.(), cleanup };
}

let a = app(); await flush();
assert.equal(a.state.reloads, 1, 'bundle antigo deve atualizar já na primeira consulta');
a.tick(); await flush(); assert.equal(a.state.reloads, 1, 'sem recargas simultâneas'); a.cleanup();

a = app({ version: 'old' }); await flush(); assert.equal(a.state.reloads, 0);
a.state.version = 'new'; a.events.get('focus')(); await flush();
assert.equal(a.state.reloads, 1, 'retomar antes de 30 segundos também verifica'); a.cleanup();

a = app({ blocked: true }); await flush(); assert.equal(a.state.reloads, 0);
a.state.blocked = false; a.tick(); await flush(); assert.equal(a.state.reloads, 1, 'tenta novamente após edição'); a.cleanup();

a = app({ editing: true }); await flush(); assert.equal(a.state.reloads, 0);
a.state.editing = false; a.tick(); await flush(); assert.equal(a.state.reloads, 1); a.cleanup();

a = app({ offline: true }); await flush(); assert.equal(a.state.reloads, 0);
a.state.offline = false; a.events.get('online')(); await flush(); assert.equal(a.state.reloads, 1); a.cleanup();

a = app({ version: 'old' }); await flush(); a.state.version = 'new';
a.document.visibilityState = 'hidden'; a.tick(); await flush(); assert.equal(a.state.requests, 1);
a.document.visibilityState = 'visible'; a.docEvents.get('visibilitychange')(); await flush(); assert.equal(a.state.reloads, 1); a.cleanup();

a = app({ version: 'local' }); await flush(); assert.equal(a.state.reloads, 0); a.cleanup();
a = app(); a.cleanup(); await flush(); assert.equal(a.state.reloads, 0, 'sem recarga depois de desmontar');
assert.equal(a.events.size, 0); assert.equal(a.docEvents.size, 0);
console.log('PWA: 8 cenários de atualização passaram.');
