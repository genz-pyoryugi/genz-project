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
  var RESOLVED = 'genz.lt.resolved.v1.';
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
    } catch { /* storage unreadable: memory copy is still used */ }
    return Object.keys(all).map(function (id) { return all[id]; }).sort(function (a, b) {
      return a.event.at < b.event.at ? -1 : a.event.at > b.event.at ? 1 : a.event.sequence - b.event.sequence;
    });
  };
  DurableQueue.prototype.persist = function (item) {
    this.memory[item.event.id] = item;
    try { this.storage.setItem(OUTBOX + item.event.id, JSON.stringify(item)); return true; } catch { return false; }
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
    } catch { /* ignore */ }
  };
  DurableQueue.prototype.enqueue = function (event, owner) { return this.persist({ owner: owner || null, event: event }); };
  DurableQueue.prototype.hasRejected = function (owner) {
    try {
      for (var i = 0; i < this.storage.length; i++) {
        var key = this.storage.key(i);
        if (key && key.indexOf(REJECTED) === 0) {
          var rejected = JSON.parse(this.storage.getItem(key));
          if (rejected.reason !== 'owner-changed' && rejected.item && rejected.item.owner === owner) return true;
        }
      }
    } catch { /* storage unavailable */ }
    return this.lastRejection === owner;
  };
  DurableQueue.prototype.rejections = function (owner) {
    var rows = [];
    try {
      for (var i = 0; i < this.storage.length; i++) {
        var key = this.storage.key(i);
        if (!key || key.indexOf(REJECTED) !== 0) continue;
        var row = JSON.parse(this.storage.getItem(key));
        if (row.reason !== 'owner-changed' && row.item && row.item.owner === owner) rows.push({ key: key, row: row });
      }
    } catch { /* Keep the conservative hasRejected fallback if storage cannot be read. */ }
    return rows;
  };
  DurableQueue.prototype.resolveAcknowledged = function (owner, event) {
    var resolved = 0;
    this.rejections(owner).forEach((entry) => {
      var old = entry.row.item.event, same = false;
      if (!old || !event.attemptId || old.attemptId !== event.attemptId || old.visitId !== event.visitId || old.type !== event.type) return;
      if (event.type === 'quiz_started') same = old.quizVersionId === event.quizVersionId &&
        (old.mode || 'full') === (event.mode || 'full') && (old.sourceAttemptId || null) === (event.sourceAttemptId || null);
      if (event.type === 'answer_submitted') same = old.questionVersionId === event.questionVersionId &&
        String(old.selectedOption).split(',').sort().join(',') === String(event.selectedOption).split(',').sort().join(',');
      if (event.type === 'quiz_completed') same = true;
      if (event.type === 'quiz_progress') same = event.sequence >= old.sequence;
      if (!same) return;
      try {
        // Keep the original failure for diagnosis; only a matching server acknowledgement resolves it.
        this.storage.setItem(RESOLVED + old.id, JSON.stringify({ ...entry.row, resolvedAt: new Date().toISOString(), acknowledgedBy: event.id }));
        this.storage.removeItem(entry.key);
        resolved++;
      } catch { /* Never hide a failure if its resolution cannot be retained. */ }
    });
    if (resolved && !this.rejections(owner).length) this.lastRejection = null;
  };
  // The history migration makes repeated starts/answers/completions idempotent. Retry the
  // original rejected payload once after that upgrade, without changing its identity or owner.
  DurableQueue.prototype.recoverAfterUpgrade = function (owner) {
    var recovered = 0, keys = [];
    try {
      for (var i = 0; i < this.storage.length; i++) keys.push(this.storage.key(i));
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (!key || key.indexOf(REJECTED) !== 0) continue;
        var rejected = JSON.parse(this.storage.getItem(key)), item = rejected.item;
        if (!item || item.owner !== owner || item.recoveryVersion === 3 ||
          !/^(P0001|23505) /.test(rejected.reason) ||
          ['quiz_started', 'answer_submitted', 'quiz_completed'].indexOf(item.event.type) < 0) continue;
        item.recoveryVersion = 3;
        if (this.persist(item)) { this.storage.removeItem(key); recovered++; }
      }
    } catch { /* Leave unreadable rejected records intact. */ }
    if (recovered) this.lastRejection = null;
    return recovered;
  };
  // Sends in order; stops at the first transient failure. Permanent rejections are set aside, never retried.
  DurableQueue.prototype.flush = function (owner, send) {
    if (this.running) return this.running;
    this.running = (async () => {
      var deferred = {}, deferredError = null;
      for (;;) {
        var remaining = this.items();
        var item = remaining.find(function (entry) { return !deferred[entry.event.id]; });
        if (!item) return { sent: remaining.length === 0, pending: remaining.length, error: deferredError };
        if (item.owner && item.owner !== owner) { this.remove(item.event.id, 'owner-changed'); continue; }
        item.owner = owner; this.persist(item);
        try { await send(item.event); this.resolveAcknowledged(owner, item.event); this.remove(item.event.id); }
        catch (error) {
          if (error.code === 'LT_PROGRESS_SETUP') { deferred[item.event.id] = true; deferredError = error; continue; }
          if (isPermanent(error)) { this.lastRejection = owner; this.remove(item.event.id, String(error.code) + ' ' + String(error.message || '')); continue; }
          return { sent: false, pending: this.items().length, error: error };
        }
      }
    })().then((r) => { this.running = null; return r; }, (e) => { this.running = null; throw e; });
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
    this.sequences = {};
    this.acknowledgedAttempts = {};
    try { this.visit = JSON.parse(this.session.getItem(VISIT_KEY) || 'null'); } catch { this.visit = null; }
    this.record('visit_started');
    if (opts.timers !== false && root.addEventListener) {
      root.addEventListener('online', () => { this.retry(); });
      root.addEventListener('focus', () => { this.retry(); });
      root.addEventListener('pagehide', () => { this.retry(); });
      setInterval(() => { this.retry(); }, 15000);
    }
  }
  Tracker.prototype.setStatus = function (state, message, delivered) {
    var owner = this.visit && this.visit.owner;
    var issues = this.queue.rejections(owner).map(function (entry) {
      var e = entry.row.item.event;
      return { attemptId: e.attemptId || null, type: e.type, at: e.at, reason: entry.row.reason };
    });
    this.status = { state: state, pending: this.queue.items().length, message: message, issues: issues, delivered: delivered === true };
    this.listeners.forEach(function (fn) { fn(this.status); }, this);
  };
  Tracker.prototype.statusFor = function (attemptId) {
    if (!attemptId || !this.status.issues) return this.status;
    var current = this.status.issues.filter(function (issue) { return issue.attemptId === attemptId; });
    var previous = this.status.issues.filter(function (issue) { return issue.attemptId !== attemptId; });
    var result = Object.assign({}, this.status, { issues: current, historicalIssues: previous });
    if (this.status.delivered && this.acknowledgedAttempts[attemptId] && this.status.issues.length && !current.length) {
      result.state = 'saved'; result.message = '현재 응시는 저장됐어요. 이전 기록의 실패 내역을 확인해 주세요.';
    }
    if (result.state === 'saved' && !this.acknowledgedAttempts[attemptId]) {
      result.state = 'pending'; result.message = '이 응시의 진행 상태 저장을 확인하고 있어요.';
    }
    return result;
  };
  Tracker.prototype.subscribe = function (fn) {
    this.listeners.push(fn); fn(this.status);
    return () => { this.listeners = this.listeners.filter(function (x) { return x !== fn; }); };
  };
  Tracker.prototype.saveVisit = function () {
    try { this.session.setItem(VISIT_KEY, JSON.stringify(this.visit)); } catch { /* visit stays in memory */ }
  };
  Tracker.prototype.enqueue = function (type, fields) {
    var visitId = (fields && fields.attemptVisitId) || this.visit.id;
    var sequence = Math.max(this.sequences[visitId] || 0, visitId === this.visit.id ? this.visit.sequence : 0);
    try { sequence = Math.max(sequence, Number(this.session.getItem('genz.lt.seq.v1.' + visitId)) || 0); } catch { /* memory counter */ }
    try { sequence = Math.max(sequence, Number(this.queue.storage.getItem('genz.lt.seq.v1.' + visitId)) || 0); } catch { /* storage unavailable */ }
    // A resumed attempt keeps its old visit even after sessionStorage is gone. The epoch
    // floor also upgrades legacy visits whose durable sequence was not stored yet.
    sequence = Math.max(sequence, Date.now());
    this.sequences[visitId] = ++sequence;
    if (visitId === this.visit.id) this.visit.sequence = sequence;
    try { this.session.setItem('genz.lt.seq.v1.' + visitId, String(sequence)); } catch { /* memory counter */ }
    try { this.queue.storage.setItem('genz.lt.seq.v1.' + visitId, String(sequence)); } catch { /* memory/session fallback */ }
    var event = Object.assign({}, fields || {}, { id: uuid(), visitId: visitId, type: type,
      at: new Date().toISOString(), sequence: sequence });
    if (!this.queue.enqueue(event, (fields && fields.progressOwner) || this.visit.owner)) this.setStatus('error', '기기 저장 공간을 쓸 수 없어요. 이 화면을 닫기 전에 연결 상태를 확인해 주세요.');
    else this.setStatus('pending', '기록을 저장하고 있어요.');
    return event;
  };
  Tracker.prototype.record = function (type, fields) {
    var now = Date.now();
    var fresh = !this.visit || !this.visit.last || now - this.visit.last > IDLE_MS;
    if (fresh) {
      this.visit = { id: uuid(), last: now, sequence: 0, firstChoice: false };
      this.enqueue('visit_started');
    } else if (type === 'visit_started') return;
    this.visit.last = now;
    var event = type !== 'visit_started' ? this.enqueue(type, fields) : null;
    this.saveVisit();
    this.retry();
    return event;
  };
  // First pressed button of the first screen; later presses only count as ordinary navigation.
  Tracker.prototype.choose = function (choice) {
    this.record('visit_started');
    if (this.visit.firstChoice) return;
    this.visit.firstChoice = true;
    this.record('first_choice', { choice: choice });
  };
  Tracker.prototype.newId = uuid;
  Tracker.prototype.currentVisitId = function () { this.record('visit_started'); return this.visit.id; };
  Tracker.prototype.client = function () {
    if (!this.clientPromise) this.clientPromise = Promise.resolve().then(() => this.getClient()).then((client) => {
      if (!client) this.clientPromise = null; // A temporary config outage must not disable autosave until reload.
      return client;
    }, (error) => { this.clientPromise = null; throw error; });
    return this.clientPromise;
  };
  Tracker.prototype.catalog = async function () {
    var client = await this.client();
    if (!client) {
      try { var offline = JSON.parse(this.queue.storage.getItem('genz.lt.catalog.v1')); if (Array.isArray(offline) && offline.length) return offline; } catch { /* no cache */ }
      throw new Error('unconfigured');
    }
    try {
      var res = await client.rpc('lt_catalog');
      if (res.error) throw res.error;
      try { this.queue.storage.setItem('genz.lt.catalog.v1', JSON.stringify(res.data || [])); } catch { /* optional cache */ }
      return res.data || [];
    } catch (error) {
      try { var cached = JSON.parse(this.queue.storage.getItem('genz.lt.catalog.v1')); if (Array.isArray(cached) && cached.length) return cached; } catch { /* no cache */ }
      throw error;
    }
  };
  Tracker.prototype.identity = async function () {
    var client = await this.client();
    if (!client) throw new Error('unconfigured');
    var authenticate = async () => {
      var s = await client.auth.getSession();
      if (s.error) throw s.error;
      if (!s.data.session) {
        var r = await client.auth.signInAnonymously();
        if (r.error || !r.data.user) throw r.error || new Error('anonymous sign-in failed');
        // Some test adapters return only the user; production Supabase returns session as well.
        s = { data: { session: r.data.session || { user: r.data.user } } };
      }
      var session = s.data.session;
      if (this.visit.owner && this.visit.owner !== session.user.id) {
        this.acknowledgedAttempts = {};
        this.visit = null; this.record('visit_started');
      }
      this.visit.owner = session.user.id; this.saveVisit();
      try { this.queue.storage.setItem('genz.lt.owner.v1', session.user.id); } catch { /* optional offline cache */ }
      return { id: session.user.id, token: session.access_token };
    };
    return root.navigator && root.navigator.locks
      ? root.navigator.locks.request('genz.lt.anonymous-auth', authenticate) : authenticate();
  };
  Tracker.prototype.supportsHistory = async function () {
    var client = await this.client();
    if (!client) return false;
    var res = await client.rpc('lt_learning_version');
    if (res.error) {
      if (res.error.code === 'PGRST202' || res.error.code === '42883') return false;
      throw res.error; // A temporary outage must not silently turn a saved review into practice.
    }
    this.historyReady = res.data === 3;
    return this.historyReady;
  };
  Tracker.prototype.cachedOwner = function () {
    try { return this.queue.storage.getItem('genz.lt.owner.v1'); } catch { return null; }
  };
  Tracker.prototype.pendingAttempt = function (id) {
    return this.queue.items().some(function (item) { return item.event.attemptId === id; });
  };
  Tracker.prototype.progress = async function () {
    var client = await this.client();
    if (!client) throw new Error('unconfigured');
    await this.identity();
    var res = await client.rpc('lt_resume_progress');
    if (res.error) throw res.error;
    return res.data || [];
  };
  Tracker.prototype.retry = function () {
    if (this.retrying) return this.retrying;
    this.retrying = (async () => {
      var client = await this.client();
      if (!client) { this.setStatus('unconfigured', MSG_UNCONFIGURED); return; }
      var owner;
      try {
        owner = (await this.identity()).id;
      } catch {
        this.setStatus('error', '익명 로그인에 실패했어요 · 기록은 기기에 보관 중이며 자동으로 다시 시도해요.'); return;
      }
      if (this.queue.hasRejected(owner)) {
        if (!this.historyReady && (!this.lastHistoryCheck || Date.now() - this.lastHistoryCheck > 15000)) {
          this.lastHistoryCheck = Date.now();
          try { await this.supportsHistory(); } catch { /* Original outbox still retries below. */ }
        }
        if (this.historyReady) this.queue.recoverAfterUpgrade(owner);
      }
      var result = await this.queue.flush(owner, async (event) => {
        var progressRpc = event.type === 'quiz_progress' ? 'lt_save_progress' : event.type === 'quiz_abandoned' ? 'lt_abandon_progress' : null;
        var res = await client.rpc(progressRpc || 'lt_ingest', { p: event });
        if (progressRpc && res.error && (res.error.code === 'PGRST202' || res.error.code === '42883'))
          throw { code: 'LT_PROGRESS_SETUP', message: 'Progress SQL required' };
        if (res.error) throw res.error;
        if (event.type === 'quiz_progress') this.acknowledgedAttempts[event.attemptId] = true;
      });
      if (this.queue.hasRejected(owner)) this.setStatus('error', '저장 요청 중 거절된 기록이 있어요. 저장 실패 내역에서 원인을 확인해 주세요.', result.sent);
      else if (result.sent) this.setStatus('saved', 'Supabase 저장 완료', true);
      else if (result.error && result.error.code === 'LT_PROGRESS_SETUP') this.setStatus('error', '진행 상태는 기기에 보관했어요. Supabase 동기화에는 202610200002_quiz_progress.sql 적용이 필요해요.');
      else this.setStatus('error', '저장이 지연되고 있어요 · 기록을 보관하며 자동으로 다시 시도해요.');
    })().then(() => { this.retrying = null; }, () => {
      this.retrying = null; this.setStatus('error', '저장이 지연되고 있어요 · 자동으로 다시 시도해요.');
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
    } catch { return null; }
  }

  function shared() {
    try { if (root.parent && root.parent !== root && root.parent.genzTracker) return root.parent.genzTracker; }
    catch { /* cross-origin parent: never share */ }
    return null;
  }
  var api = { DurableQueue: DurableQueue, Tracker: Tracker, isPermanent: isPermanent, uuid: uuid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) {
    root.GenzLearning = api;
    root.genzTracker = root.genzTracker || shared() || new Tracker();
  }
})(typeof window !== 'undefined' ? window : globalThis);
