// ===== SHARED DATA — loaded from Firestore =====

let CHARACTERS = [];
let SUPPORT_CHARACTERS = [];
let CHAR_DATA_LOADED = false;
let BANNERS = [];
let PATCH_NOTES = [];
let PVP_PATCHES = { buff: [], nerf: [], fix: [] };
let PVP_PATCH_HISTORY = new Map();
let SKILLS = {};
let SUPPORT_SKILLS = {};
let CHAR_RECENT_PATCHES = {};
let CHAR_TIPS = {};

/* ─────────────────────────────────────────────
   캐시 (localStorage, TTL 5분)
   Firestore Timestamp → ISO 문자열로 직렬화
   ───────────────────────────────────────────── */
const _CACHE_KEY = 'opfp_data_v3';
const _CACHE_TTL = 5 * 60 * 1000;

function _ser(v) {
  if (v === null || v === undefined) return v;
  if (v && typeof v.toDate === 'function') return { _t: v.toDate().toISOString() };
  if (v instanceof Date) return { _t: v.toISOString() };
  if (v instanceof Map) return { _m: [...v.entries()].map(([k, val]) => [k, _ser(val)]) };
  if (Array.isArray(v)) return v.map(_ser);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = _ser(v[k]);
    return o;
  }
  return v;
}

function _des(v) {
  if (v === null || v === undefined) return v;
  if (v && v._t !== undefined) return v._t;           // ISO string; rendering code handles new Date(str)
  if (v && v._m) return new Map(v._m.map(([k, val]) => [k, _des(val)]));
  if (Array.isArray(v)) return v.map(_des);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = _des(v[k]);
    return o;
  }
  return v;
}

function _saveCache(d) {
  try {
    localStorage.setItem(_CACHE_KEY, JSON.stringify({ ts: Date.now(), v: _ser(d) }));
  } catch (e) { /* quota exceeded 등 무시 */ }
}

function _loadCache() {
  try {
    const raw = localStorage.getItem(_CACHE_KEY);
    if (!raw) return null;
    const { ts, v } = JSON.parse(raw);
    if (Date.now() - ts > _CACHE_TTL) return null;
    return _des(v);
  } catch { return null; }
}

/* ─────────────────────────────────────────────
   전역 변수 일괄 적용
   ───────────────────────────────────────────── */
function _applyData(d) {
  CHARACTERS          = d.CHARACTERS          || [];
  SUPPORT_CHARACTERS  = d.SUPPORT_CHARACTERS  || [];
  BANNERS             = d.BANNERS             || [];
  PATCH_NOTES         = d.PATCH_NOTES         || [];
  PVP_PATCHES         = d.PVP_PATCHES         || { buff: [], nerf: [], fix: [] };
  PVP_PATCH_HISTORY   = (d.PVP_PATCH_HISTORY instanceof Map)
                          ? d.PVP_PATCH_HISTORY
                          : new Map();
  SKILLS              = d.SKILLS              || {};
  SUPPORT_SKILLS      = d.SUPPORT_SKILLS      || {};
  CHAR_RECENT_PATCHES = d.CHAR_RECENT_PATCHES || {};
  CHAR_TIPS           = d.CHAR_TIPS           || {};
  CHAR_DATA_LOADED    = true;
}

/* ─────────────────────────────────────────────
   Firestore 실제 패치
   ───────────────────────────────────────────── */
async function _fetchFromFirestore() {
  const [charsSnap, eventsSnap, patchNotesSnap, pvpSnap, supportCharsSnap, bannersSnap] = await Promise.all([
    db.collection('characters').get(),
    db.collection('events').get(),
    db.collection('patchNotes').get(),
    db.collection('pvpPatch').get(),
    db.collection('supportCharacters').get(),
    db.collection('banners').get(),
  ]);

  const _CHARS        = charsSnap.docs.map(doc => doc.data()).filter(c => c.visible !== false).sort((a, b) => (a.id || 0) - (b.id || 0));
  const _SUPPORT      = supportCharsSnap.docs.map(doc => doc.data()).filter(c => c.visible !== false).sort((a, b) => (a.id || 0) - (b.id || 0));
  const _BANNERS      = bannersSnap.docs.map(doc => ({ docId: doc.id, ...doc.data() }))
    .filter(b => b.imageUrl && b.isActive !== false && b.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(b => ({ ...b, bannerUrl: b.imageUrl }));
  const _PATCHES      = patchNotesSnap.docs.map(doc => doc.data()).filter(p => p.visible !== false).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const _SKILLS   = {};
  const _SSKILLS  = {};
  const _CPATCHES = {};
  const _TIPS     = {};

  [..._CHARS, ..._SUPPORT].forEach(data => {
    if (data.skills)        _SKILLS[data.id]   = data.skills;
    if (data.supportSkills) _SSKILLS[data.id]  = data.supportSkills;
    if (data.recentPatches) _CPATCHES[data.id] = data.recentPatches;
    if (data.tips)          _TIPS[data.id]     = data.tips;
  });

  const _PVP     = { buff: [], nerf: [], fix: [] };
  const _PVPHIST = new Map();
  const nowKST   = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16);
  const _started = [];

  function normItems(data) {
    return (data.patches || []).map(p =>
      typeof p === 'string' ? { type: data.type || '', text: p } : (p || {})
    ).filter(p => p.text);
  }
  function dateKey(data) {
    if (data.patchDate)    return data.patchDate.slice(0, 10);
    if (data.displayStart) return data.displayStart.slice(0, 10);
    const ts = data.updatedAt;
    return ts
      ? (ts.toDate ? ts.toDate().toISOString().split('T')[0] : new Date(ts).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
  }

  pvpSnap.docs.forEach(doc => {
    const data  = doc.data();
    if (data.visible === false) return;
    const items = normItems(data);
    const dk    = dateKey(data);

    if (!data.displayStart || nowKST >= data.displayStart) {
      if (!_PVPHIST.has(dk)) _PVPHIST.set(dk, { buff: [], nerf: [], fix: [] });
      const hist = _PVPHIST.get(dk);
      items.forEach(item => {
        if (!item.type || !hist[item.type]) return;
        // Fix: charId가 null인 서폿 전용 항목은 doc.id(_pvpDocId)로 구분
        let e = hist[item.type].find(e =>
          data.charId != null ? e.charId === data.charId : e._pvpDocId === doc.id
        );
        if (!e) { e = { ...data, _pvpDocId: doc.id, patches: [] }; hist[item.type].push(e); }
        e.patches.push(item.text);
      });
      _started.push({ docId: doc.id, data, items, dk });
    }

    if (data.charId && items.length) {
      if (!_CPATCHES[data.charId]) _CPATCHES[data.charId] = [];
      items.forEach(item => {
        if (item.text) _CPATCHES[data.charId].push({ date: dk, type: item.type, text: item.text });
      });
    }
  });

  // 누락된 목요일 패치 자동 주입
  (function injectMissingThursdayPatches() {
    const nowUTC     = Date.now();
    const nowKSTDate = new Date(nowUTC + 9 * 3600 * 1000);
    const dayOfWeek  = nowKSTDate.getUTCDay();
    const daysBack   = (dayOfWeek - 4 + 7) % 7;
    const latestThur = new Date(nowUTC + 9 * 3600 * 1000);
    latestThur.setUTCDate(latestThur.getUTCDate() - daysBack);
    const latestThurKey = latestThur.toISOString().slice(0, 10);
    const latestThurStartUTC = Date.UTC(latestThur.getUTCFullYear(), latestThur.getUTCMonth(), latestThur.getUTCDate()) - 9 * 3600 * 1000;
    if (nowUTC < latestThurStartUTC) return;
    const existingKeys = [..._PVPHIST.keys()].sort();
    let startKey;
    if (existingKeys.length) {
      const d   = new Date(existingKeys[0] + 'T00:00:00Z');
      const dow = d.getUTCDay();
      d.setUTCDate(d.getUTCDate() + (4 - dow + 7) % 7);
      startKey = d.toISOString().slice(0, 10);
    } else {
      startKey = latestThurKey;
    }
    const cursor  = new Date(startKey + 'T00:00:00Z');
    const endDate = new Date(latestThurKey + 'T00:00:00Z');
    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      if (!_PVPHIST.has(key)) _PVPHIST.set(key, { buff: [], nerf: [], fix: [] });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  })();

  if (_started.length) {
    const latestDk = [..._PVPHIST.keys()].sort((a, b) => b.localeCompare(a))[0];
    _started.filter(s => s.dk === latestDk).forEach(({ docId, data, items }) => {
      items.forEach(item => {
        if (!item.type || !_PVP[item.type]) return;
        // Fix: charId가 null인 서폿 전용 항목은 docId(_pvpDocId)로 구분
        let entry = _PVP[item.type].find(e =>
          data.charId != null ? e.charId === data.charId : e._pvpDocId === docId
        );
        if (!entry) { entry = { ...data, _pvpDocId: docId, patches: [] }; _PVP[item.type].push(entry); }
        entry.patches.push(item.text);
      });
    });
  }

  Object.keys(_CPATCHES).forEach(cid => {
    _CPATCHES[cid].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  });

  return {
    CHARACTERS: _CHARS, SUPPORT_CHARACTERS: _SUPPORT, BANNERS: _BANNERS,
    PATCH_NOTES: _PATCHES, PVP_PATCHES: _PVP, PVP_PATCH_HISTORY: _PVPHIST,
    SKILLS: _SKILLS, SUPPORT_SKILLS: _SSKILLS, CHAR_RECENT_PATCHES: _CPATCHES, CHAR_TIPS: _TIPS,
  };
}

/* ─────────────────────────────────────────────
   공개 API — 캐시 우선, 백그라운드 갱신
   ───────────────────────────────────────────── */
let _inflightPromise = null;   // 동시 호출 중복 방지

async function initData() {
  // ① 캐시 히트 → 즉시 적용 후 백그라운드 갱신
  const cached = _loadCache();
  if (cached) {
    _applyData(cached);
    // 백그라운드 갱신 (await 없음 → 호출자는 즉시 진행)
    if (!_inflightPromise) {
      _inflightPromise = _fetchFromFirestore()
        .then(fresh => { _applyData(fresh); _saveCache(fresh); })
        .catch(() => {})
        .finally(() => { _inflightPromise = null; });
    }
    return;
  }

  // ② 캐시 없음 → 기존처럼 await fetch (중복 방지)
  if (_inflightPromise) return _inflightPromise;

  _inflightPromise = _fetchFromFirestore()
    .then(fresh => { _applyData(fresh); _saveCache(fresh); })
    .catch(err => { console.error('Firestore load error:', err); CHAR_DATA_LOADED = true; })
    .finally(() => { _inflightPromise = null; });

  return _inflightPromise;
}

// ===== HELPERS =====

function getCharById(id) {
  return CHARACTERS.find(c => c.id === id) || SUPPORT_CHARACTERS.find(c => c.id === id);
}

function getTypeName(type) {
  return { force: '力', ki: '技', sim: '心' }[type] || type;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-');
  if (!y || !m || !d) return dateStr;
  return `${y}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
}
