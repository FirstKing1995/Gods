// Serviços do Google Apps Script simulados em memória, para testar apps-script/Code.gs no Node.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeGas(opts) {
  opts = opts || {};
  const sheets = new Map();
  function Sheet(name) {
    this.name = name; this.rows = [];
    this.getLastRow = () => this.rows.length;
    this.appendRow = (r) => { this.rows.push(r.slice()); };
    this.deleteRow = (i) => { this.rows.splice(i - 1, 1); };
    this.setFrozenRows = () => {};
    this.getRange = (r, c, nr, nc) => {
      nr = nr || 1; nc = nc || 1;
      const self = this;
      return {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = self.rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
        setValues(v) { for (let i = 0; i < nr; i++) { const row = self.rows[r - 1 + i] || (self.rows[r - 1 + i] = []); for (let j = 0; j < nc; j++) row[c - 1 + j] = v[i][j]; } },
        setValue(v) { const row = self.rows[r - 1] || (self.rows[r - 1] = []); row[c - 1] = v; },
        clearContent() {
          for (let i = 0; i < nr; i++) { const row = self.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (self.rows.length > 1 && self.rows[self.rows.length - 1].every((v) => v === '' || v === undefined)) self.rows.pop();   // a última linha com conteúdo
        },
      };
    };
  }
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; },
  };
  const files = new Map(); let fid = 0;
  function File(name, content) { this.id = 'f' + (++fid); this.name = name; this.content = content; this.trashed = false;
    this.getId = () => this.id; this.setContent = (c) => { this.content = c; }; this.setTrashed = (t) => { this.trashed = t; };
    this.getBlob = () => ({ getDataAsString: () => this.content }); }
  const folder = { getId: () => 'pasta1', createFile: (n, c) => { const f = new File(n, c); files.set(f.id, f); return f; } };
  const props = new Map(), cache = new Map(), fetches = [];
  const gas = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    DriveApp: {
      createFolder: () => folder, getFolderById: () => folder,
      getFileById: (id) => { const f = files.get(id); if (!f || f.trashed) throw new Error('Arquivo não encontrado'); return f; },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, v) }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    UrlFetchApp: { fetch: (url, o) => { fetches.push({ url, o }); const f = opts.fetch || (() => ({ code: 200, body: { choices: [{ message: { content: '*olha para o céu* "Estou aqui, Deus."' } }] } })); const r = f(url, o, fetches.length); return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body || {}) }; } },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeDigest: (alg, text) => Array.from(crypto.createHash('sha256').update(text, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (bytes) => Buffer.from(bytes.map((b) => (b < 0 ? b + 256 : b))).toString('base64'),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    },
    ContentService: { createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return this.t; } }), MimeType: { JSON: 'json' } },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    _files: files, _sheets: sheets, _cache: cache, _fetches: fetches, _props: props,
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  const FakeDate = opts.now ? { now: opts.now } : Date;
  const ctx = vm.createContext(Object.assign({ console, JSON, Date: FakeDate, Math, String, Number, Object, isFinite }, gas));
  vm.runInContext(code, ctx);
  return { ctx, gas, post: (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).getContent()), get: (action) => JSON.parse(ctx.doGet({ parameter: { action } }).getContent()) };
}
module.exports = { makeGas };
