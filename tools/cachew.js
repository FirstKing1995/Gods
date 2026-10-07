// Pré-carga dos testes longos: guarda o resultado de cada trabalho (um mundo de 20 anos) num arquivo, para que uma
// fila interrompida recomece do mundo em que parou, e não da suíte inteira. Só mexe no processo principal.
// A chave leva o resumo do código do jogo (CACHEW_TAG), o conteúdo do arquivo de teste e os dados do trabalho.
const wt = require('worker_threads');
if (wt.isMainThread && process.env.CACHEW_DIR) {
  const fs = require('fs'), path = require('path'), crypto = require('crypto'), v8 = require('v8');
  const { EventEmitter } = require('events');
  const DIR = process.env.CACHEW_DIR, TAG = process.env.CACHEW_TAG || '';
  const Real = wt.Worker;
  const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
  const fileHash = {};
  // CACHEW_ALIAS="deus-test.js=<md5>": o arquivo de teste mudou só num portão (o longRun é o mesmo); vale o cache antigo
  for (const kv of (process.env.CACHEW_ALIAS || '').split(',')) { const i = kv.indexOf('='); if (i > 0) fileHash[kv.slice(0, i)] = kv.slice(i + 1); }
  class Cached extends EventEmitter {
    constructor(file, opts) {
      super();
      const name = path.basename(String(file));
      if (!fileHash[name]) { try { fileHash[name] = md5(fs.readFileSync(String(file))); } catch (e) { fileHash[name] = 'x'; } }
      const key = md5(TAG + '|' + fileHash[name] + '|' + JSON.stringify(opts && opts.workerData)).slice(0, 16);
      const f = path.join(DIR, name + '.' + key + '.bin');
      let hit = null;
      if (fs.existsSync(f)) { try { hit = v8.deserialize(fs.readFileSync(f)); } catch (e) { hit = null; } }
      if (hit) {
        process.stderr.write('[cache] ' + name + ' ' + JSON.stringify(opts && opts.workerData).slice(0, 80) + '\n');
        setImmediate(() => { this.emit('message', hit.r); this.emit('exit', 0); });
      } else {
        const w = new Real(file, opts);
        w.on('message', (r) => { try { fs.writeFileSync(f + '.tmp', v8.serialize({ r })); fs.renameSync(f + '.tmp', f); } catch (e) { /* sem cache, segue */ } this.emit('message', r); });
        w.on('error', (e) => this.emit('error', e));
        w.on('exit', (c) => this.emit('exit', c));
        this._w = w;
      }
    }
    terminate() { return this._w ? this._w.terminate() : Promise.resolve(0); }
    postMessage(m) { if (this._w) this._w.postMessage(m); }
    ref() { if (this._w) this._w.ref(); }
    unref() { if (this._w) this._w.unref(); }
  }
  wt.Worker = Cached;
}
