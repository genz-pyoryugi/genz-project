/* Learning tracker: anonymous visits, content order and quiz attempts -> Supabase.
 * One implementation shared by the static intro/office page and the Next.js /quiz page.
 *
 * Every event gets a client UUID and is parked in a durable outbox (localStorage, memory fallback)
 * before it is sent, so retries are idempotent (server dedupes on event id) and nothing is lost on
 * a failed request or reload. Only the validated RPC public.lt_ingest writes to the database.
 */
(function (root) {
  'use strict';
  var VISIT_KEY = 'genz.lt.visit.v1';
  var OUTBOX = 'genz.lt.outbox.v1.';
  var REJECTED = 'genz.lt.rejected.v1.';
  var IDLE_MS = 30 * 60 * 1000;
  var MSG_UNCONFIGURED = '테스트 미리보기 · Supabase 미연결, 기기에만 보관';

  function uuid() {
    var c = root.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    var b = new Uint8Array(16); c.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // Errors the server raises on purpose (validation / constraint) will never succeed on retry.
  function isPermanent(error) {
    var code = String((error && error.code) || '');
    return code === 'P0001' || /^22/.test(code) || /^23/.test(code);
  }

  /* ---------- durable outbox ---------- */
  function DurableQueue(storage) {
    this.storage = storage; this.memory = {}; this.running = null;
  }
  DurableQueue.prototype.items = function () {
    var all = {}, k, s = this.storage;
    for (k in this.memory) all[k] = this.memory[k];
    try {
      for (var i = 0; i < s.length; i++) {
        var key = s.key(i);
        if (key && key.indexOf(OUTBOX) === 0) {
          var raw = s.getItem(key);
          if (raw) { var e = JSON.parse(raw); all[e.event.id] = e; }
        }
      }
    } catch (err) { /* storage unreadable: memory copy is still used */ }
    return Object.keys(all).map(function (id) { return all[id]; }).sort(function (a, b) {
      return a.event.at < b.event.at ? -1 : a.event.at > b.event.at ? 1 : a.event.sequence - b.event.sequence;
    });
  };
  DurableQueue.prototype.persist = function (item) {
    this.memory[item.event.id] = item;
    try { this.storage.setItem(OUTBOX + item.event.id, JSON.stringify(item)); return true; } catch (e) { return false; }
  };
  DurableQueue.prototype.remove = function (id, rejectedReason) {
    var item = this.memory[id];
    delete this.memory[id];
    try {
      if (rejectedReason) {
        var raw = this.storage.getItem(OUTBOX + id);
        this.storage.setItem(REJECTED + id, JSON.stringify({ item: raw ? JSON.parse(raw) : item, reason: rejectedReason }));
      }
      this.storage.removeItem(OUTBOX + id);
    } catch (e) { /* ignore */ }
  };
  DurableQueue.prototype.enqueue = function (event) { return this.persist({ owner: null, event: event }); };
  // Sends in order; stops at the first transient failure. Permanent rejections are set aside, never retried.
  DurableQueue.prototype.flush = function (owner, send) {
    var self = this;
    if (this.running) return this.running;
    this.running = (async function () {
      for (;;) {
        var item = self.items()[0];
        if (!item) return { sent: true, pending: 0 };
        if (item.owner && item.owner !== owner) { self.remove(item.event.id, 'owner-changed'); continue; }
        item.owner = owner; self.persist(item);
        try { await send(item.event); self.remove(item.event.id); }
        catch (error) {
          if (isPermanent(error)) { self.remove(item.event.id, String(error.code) + ' ' + String(error.message || '')); continue; }
          return { sent: false, pending: self.items().length, error: error };
        }
      }
    })().then(function (r) { self.running = null; return r; }, function (e) { self.running = null; throw e; });
    return this.running;
  };

  /* ---------- tracker ---------- */
  // opts: { storage, session, getClient(): Promise<client|null>, timers }
  function Tracker(opts) {
    opts = opts || {};
    this.queue = new DurableQueue(opts.storage || root.localStorage);
    this.session = opts.session || root.sessionStorage;
    this.getClient = opts.getClient || defaultClient;
    this.listeners = [];
    this.status = { state: 'pending', pending: 0, message: '저장 준비 중' };
    this.visit = null;
    try { this.visit = JSON.parse(this.session.getItem(VISIT_KEY) || 'null'); } catch (e) { this.visit = null; }
    this.record('visit_started');
    if (opts.timers !== false && root.addEventListener) {
      var self = this;
      root.addEventListener('online', function () { self.retry(); });
      root.addEventListener('pagehide', function () { self.retry(); });
      setInterval(function () { self.retry(); }, 15000);
    }
  }
  Tracker.prototype.setStatus = function (state, message) {
    this.status = { state: state, pending: this.queue.items().length, message: message };
    this.listeners.forEach(function (fn) { fn(this.status); }, this);
  };
  Tracker.prototype.subscribe = function (fn) {
    var self = this; this.listeners.push(fn); fn(this.status);
    return function () { self.listeners = self.listeners.filter(function (x) { return x !== fn; }); };
  };
  Tracker.prototype.saveVisit = function () {
    try { this.session.setItem(VISIT_KEY, JSON.stringify(this.visit)); } catch (e) { /* visit stays in memory */ }
  };
  Tracker.prototype.enqueue = function (type, fields) {
    var event = Object.assign({}, fields || {}, { id: uuid(), visitId: this.visit.id, type: type,
      at: new Date().toISOString(), sequence: ++this.visit.sequence });
    if (!this.queue.enqueue(event)) this.setStatus('error', '기기 저장 공간을 쓸 수 없어요. 이 화면을 닫기 전에 연결 상태를 확인해 주세요.');
  };
  Tracker.prototype.record = function (type, fields) {
    var now = Date.now();
    var fresh = !this.visit || !this.visit.last || now - this.visit.last > IDLE_MS;
    if (fresh) {
      this.visit = { id: uuid(), last: now, sequence: 0, firstChoice: false };
      this.enqueue('visit_started');
    } else if (type === 'visit_started') return;
    this.visit.last = now;
    if (type !== 'visit_started') this.enqueue(type, fields);
    this.saveVisit();
    this.retry();
  };
  // First pressed button of the first screen; later presses only count as ordinary navigation.
  Tracker.prototype.choose = function (choice) {
    this.record('visit_started');
    if (this.visit.firstChoice) return;
    this.visit.firstChoice = true;
    this.record('first_choice', { choice: choice });
  };
  Tracker.prototype.newId = uuid;
  Tracker.prototype.client = function () {
    if (!this.clientPromise) this.clientPromise = this.getClient();
    return this.clientPromise;
  };
  Tracker.prototype.catalog = async function () {
    var client = await this.client();
    if (!client) throw new Error('unconfigured');
    var res = await client.rpc('lt_catalog');
    if (res.error) throw res.error;
    return res.data || [];
  };
  Tracker.prototype.retry = function () {
    var self = this;
    if (this.retrying) return this.retrying;
    this.retrying = (async function () {
      var client = await self.client();
      if (!client) { self.setStatus('unconfigured', MSG_UNCONFIGURED); return; }
      if (!self.queue.items().length) { self.setStatus('saved', 'Supabase 저장 완료'); return; }
      var owner;
      try {
        var authenticate = async function () {
          var s = await client.auth.getSession();
          if (s.error) throw s.error;
          if (s.data.session) return s.data.session.user.id;
          var r = await client.auth.signInAnonymously();
          if (r.error || !r.data.user) throw r.error || new Error('anonymous sign-in failed');
          return r.data.user.id;
        };
        owner = root.navigator && root.navigator.locks
          ? await root.navigator.locks.request('genz.lt.anonymous-auth', authenticate) : await authenticate();
      } catch (e) {
        self.setStatus('error', '익명 로그인에 실패했어요 · 기록은 기기에 보관 중이며 자동으로 다시 시도해요.'); return;
      }
      var result = await self.queue.flush(owner, async function (event) {
        var res = await client.rpc('lt_ingest', { p: event });
        if (res.error) throw res.error;
      });
      if (result.sent) self.setStatus('saved', 'Supabase 저장 완료');
      else self.setStatus('error', '저장이 지연되고 있어요 · 기록을 보관하며 자동으로 다시 시도해요.');
    })().then(function () { self.retrying = null; }, function () {
      self.retrying = null; self.setStatus('error', '저장이 지연되고 있어요 · 자동으로 다시 시도해요.');
    });
    return this.retrying;
  };

  async function defaultClient() {
    try {
      var res = await fetch('/api/tracking-config', { cache: 'no-store' });
      if (!res.ok) return null;
      var cfg = await res.json();
      if (!cfg.url || !cfg.key || !root.supabase) return null;
      return root.supabase.createClient(cfg.url, cfg.key);
    } catch (e) { return null; }
  }

  function shared() {
    try { if (root.parent && root.parent !== root && root.parent.genzTracker) return root.parent.genzTracker; }
    catch (e) { /* cross-origin parent: never share */ }
    return null;
  }
  var api = { DurableQueue: DurableQueue, Tracker: Tracker, isPermanent: isPermanent, uuid: uuid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    root.GenzLearning = api;
    root.genzTracker = root.genzTracker || shared() || new Tracker();
  }
})(typeof window !== 'undefined' ? window : globalThis);
