(function () {
    'use strict';

    /*  Episodes Ratings Grid  SETTINGS  */
    const CONFIG = {
        TITLE: 'IMDb Episodes Grid',                         // Label of the collapsible block (also the IMDb ratings link text when no grid can be built)
        EMPTY_TEXT: 'No ratings available for this series.', // Text shown when the series has no episode data and no IMDb id
        TOOLTIP: true,                                       // Episode tooltip: mouse hover, or touch and hold a cell on touch screens
        TOOLTIP_DELAY_MS: 800,                               // Mouse hover time (ms) before the episode tooltip appears (touch uses the device long-press)
        TOOLTIP_WIDTH_PX: 400,                               // Episode tooltip width (px), capped to the screen width
        CACHE_MINUTES: 120,                                  // Lifetime of the episodes and IMDb data kept in the browser tab (minutes)
        MAX_SEASONS: 500,                                    // Highest season number shown
        MAX_EPISODE_SPAN: 200,                               // Max episodes covered by a single multi-episode file
        DATASET_URL: 'https://cdn.jsdelivr.net/gh/ya0903/imdb-episode-dataset@main/data/shows' // IMDb ratings dataset folder, one <imdbId>.json file per series
    };

    if (window.__jfEpisodesGrid) return;
    window.__jfEpisodesGrid = true;

    const ROOT = '[data-jf-ieg-root="1"]';
    const STYLE_ID = 'jf-imdb-episodes-grid-style-v8';
    const INV_KEY = 'jf-imdb-episodes-grid-inverted-v1';
    const TIP_ID = 'jf-hover-tooltip';
    const TIP_STYLE_ID = 'jf-hover-tooltip-style';
    const IMDB = 'https://www.imdb.com/title/';
    const BOXES = ['#listChildrenCollapsible', '#childrenCollapsible'];
    const SEASON = BOXES.map(b => b + ' [data-type="Season"]').join(',');
    const TYPED = BOXES.map(b => b + ' [data-type]').join(',');
    const CELL = '.jf-ieg-rating,.jf-ieg-empty';
    const TTL = Math.max(1, +CONFIG.CACHE_MINUTES || 120) * 60000;
    const TIP_WIDTH = 'min(' + Math.max(200, +CONFIG.TOOLTIP_WIDTH_PX || 400) + 'px, calc(100vw - 20px))';
    const CAP = { capture: true, passive: true };

    const client = () => {
        const c = window.ApiClient;
        return c && typeof c.getJSON === 'function' && typeof c.getUrl === 'function' && typeof c.accessToken === 'function' && c.accessToken() ? c : null;
    };
    const api = path => {
        const c = client();
        return c ? c.getJSON(c.getUrl(path)) : Promise.reject(new Error('ApiClient not ready'));
    };
    const getItem = (id, fields) => {
        const c = client(), uid = c && typeof c.getCurrentUserId === 'function' ? c.getCurrentUserId() : '';
        if (!uid) return Promise.resolve(null);
        const q = new URLSearchParams({ ids: id, userId: uid, fields, enableImages: false, enableUserData: false, enableTotalRecordCount: false });
        return c.getJSON(c.getUrl('Items?' + q)).then(r => (r && r.Items && r.Items[0]) || null, () => null);
    };
    const hashParams = () => {
        const h = String(location.hash || ''), i = h.indexOf('?'), p = {};
        if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach((v, k) => { p[k] = v; });
        return p;
    };
    const cacheGet = k => {
        try {
            const o = JSON.parse(sessionStorage.getItem(k) || 'null');
            return o && Date.now() <= o.e ? o.v : null;
        } catch { return null; }
    };
    const cacheSet = (k, v) => {
        try { sessionStorage.setItem(k, JSON.stringify({ v, e: Date.now() + TTL })); } catch { }
    };
    const toRating = v => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 && n <= 10 ? n : null;
    };
    const getInv = () => { try { return localStorage.getItem(INV_KEY) === 'true'; } catch { return false; } };
    const setInv = v => { try { localStorage.setItem(INV_KEY, v ? 'true' : 'false'); } catch { } };
    const detailsHash = (id, sid) => '/details?id=' + encodeURIComponent(id) + '&serverId=' + encodeURIComponent(sid);
    const webRoot = () => {
        const m = String(location.pathname || '').match(/^(.*\/web\/)(?:index\.html)?$/i);
        return m ? m[1] : '/web/';
    };
    const detailsUrl = (id, sid) => location.origin + webRoot() + '#' + detailsHash(id, sid);
    const external = (a, url) => {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('is', 'emby-linkbutton');
    };

    async function fetchJf(seriesId) {
        const k = 'ieg_jf_' + seriesId, c = cacheGet(k);
        if (c) return c;
        let epsFailed = false, ssFailed = false;
        const [epsRes, ssRes] = await Promise.all([
            api('Shows/' + encodeURIComponent(seriesId) + '/Episodes?Fields=CommunityRating,IndexNumberEnd,ParentIndexNumber,IndexNumber,Name,PremiereDate&EnableImages=false&EnableUserData=false&Limit=20000').catch(() => { epsFailed = true; return { Items: [] }; }),
            api('Shows/' + encodeURIComponent(seriesId) + '/Seasons?Fields=IndexNumber&EnableImages=false&EnableUserData=false').catch(() => { ssFailed = true; return { Items: [] }; })
        ]);
        if (epsFailed) throw new Error('episodes request failed');
        const seasonsByNum = {}, seasonIds = {};
        let name = '';
        for (const s of (ssRes.Items || [])) {
            const n = Number(s && s.IndexNumber);
            if (Number.isFinite(n) && n > 0) seasonIds[n] = s.Id || '';
            if (!name && s && s.SeriesName) name = s.SeriesName;
        }
        for (const ep of (epsRes.Items || [])) {
            if (!ep) continue;
            if (!name && ep.SeriesName) name = ep.SeriesName;
            const sn = Number(ep.ParentIndexNumber), en = Number(ep.IndexNumber);
            if (!Number.isFinite(sn) || !Number.isFinite(en) || sn < 1 || en < 1) continue;
            const end = Number.isFinite(ep.IndexNumberEnd) && ep.IndexNumberEnd >= en ? Math.min(ep.IndexNumberEnd, en + CONFIG.MAX_EPISODE_SPAN) : en;
            (seasonsByNum[sn] = seasonsByNum[sn] || []).push({ ep: en, epEnd: end, jfId: ep.Id || '', rating: toRating(ep.CommunityRating) });
        }
        const val = { seasonsByNum, seasonIds, name };
        if (!ssFailed) cacheSet(k, val);
        return val;
    }

    async function fetchImdbId(seriesId) {
        const k = 'ieg_tt_' + seriesId, c = cacheGet(k);
        if (c !== null) return c;
        const item = await getItem(seriesId, 'ProviderIds');
        if (!item) return '';
        const ids = item.ProviderIds || {}, key = Object.keys(ids).find(x => x.toLowerCase() === 'imdb');
        const m = key ? String(ids[key]).trim().match(/^(?:tt)?(\d+)$/i) : null;
        const val = m ? 'tt' + m[1] : '';
        cacheSet(k, val);
        return val;
    }

    async function fetchDataset(imdbId) {
        const k = 'ieg_imdb_' + imdbId, c = cacheGet(k);
        if (c !== null) return c || null;
        const r = await fetch(String(CONFIG.DATASET_URL).replace(/\/+$/, '') + '/' + encodeURIComponent(imdbId) + '.json', { credentials: 'omit' });
        if (!r.ok && r.status !== 404) throw new Error('dataset ' + r.status);
        const show = r.ok ? await r.json() : null, seasons = show && show.seasons, out = {};
        let any = false;
        if (seasons && typeof seasons === 'object') {
            for (const sk of Object.keys(seasons)) {
                const s = parseInt(sk, 10) || 0, eps = seasons[sk];
                if (s < 1 || s > CONFIG.MAX_SEASONS || !eps || typeof eps !== 'object') continue;
                for (const ek of Object.keys(eps)) {
                    const e = parseInt(ek, 10) || 0;
                    if (e < 1) continue;
                    (out[s] = out[s] || {})[e] = toRating(eps[ek] && eps[ek].r);
                    any = true;
                }
            }
        }
        cacheSet(k, any ? out : 0);
        return any ? out : null;
    }

    function mergeData(ds, jf) {
        const nums = [...Object.keys(jf.seasonsByNum || {}), ...Object.keys(ds || {})].map(Number).filter(Number.isFinite);
        const max = Math.min(Math.max(0, ...nums), CONFIG.MAX_SEASONS), out = [];
        for (let s = 1; s <= max; s++) {
            const byEp = {}, d = (ds && ds[s]) || {};
            for (const n of Object.keys(d)) byEp[n] = { ep: Number(n), rating: toRating(d[n]), jfId: '' };
            for (const j of (jf.seasonsByNum[s] || [])) {
                const end = j.epEnd >= j.ep ? j.epEnd : j.ep;
                for (let n = j.ep; n <= end; n++) {
                    const x = byEp[n] || (byEp[n] = { ep: n, rating: null, jfId: '' });
                    if (x.rating == null && j.rating != null) x.rating = j.rating;
                    if (!x.jfId && j.jfId) x.jfId = j.jfId;
                }
            }
            const episodes = Object.values(byEp).sort((a, b) => a.ep - b.ep);
            if (episodes.length) out.push({ num: s, seasonJfId: jf.seasonIds[s] || '', episodes });
        }
        return out;
    }

    function ratingStyle(r) {
        const v = toRating(r);
        if (v == null) return '';
        let h = 0, s = 78, l = 16;
        if (v >= 9.5) { h = 92; s = 100; l = 51.5; }
        else if (v >= 9.0) { h = 120; s = 100; l = 45; }
        else if (v >= 8.0) { h = 84; s = 98; l = 30.6; }
        else if (v >= 7.0) { h = 32; s = 88; l = 20; }
        else if (v >= 6.0) { h = 18; s = 90; l = 19; }
        else if (v >= 5.0) { h = 10; s = 84; l = 17; }
        else if (v >= 4.0) { h = 6; s = 82; l = 15; }
        else if (v >= 3.0) { h = 3; s = 80; l = 14; }
        else if (v >= 2.0) { h = 1; s = 78; l = 13; }
        else { h = 0; s = 76; l = 12; }
        const frac = v % 1, lb = frac * (v >= 7 ? 7 : 3.8), light = Math.min(l + lb, v >= 7 ? 72 : 26), a = v >= 7 ? (0.82 + frac * 0.12) : (0.92 + frac * 0.04);
        let glow = 'inset 0 1px 0 rgba(255,255,255,.06)';
        if (v >= 9.8) glow = '0 0 8px rgba(255,240,28,.24),0 0 16px rgba(255,240,28,.12),inset 0 1px 0 rgba(255,255,255,.12)';
        else if (v >= 9.7) glow = '0 0 8px rgba(146,255,74,.28),0 0 16px rgba(146,255,74,.13),inset 0 1px 0 rgba(255,255,255,.11)';
        else if (v >= 9.6) glow = '0 0 6px rgba(86,255,72,.22),0 0 12px rgba(86,255,72,.10),inset 0 1px 0 rgba(255,255,255,.10)';
        else if (v >= 9.0) glow = '0 0 5px hsla(' + h + ',' + s + '%,' + (light + 8) + '%,.28),inset 0 1px 0 rgba(255,255,255,.08)';
        return 'background:hsla(' + h + ',' + s + '%,' + light + '%,' + a + ');border-color:hsla(' + h + ',' + s + '%,' + Math.min(light + (v >= 7 ? 18 : 10), v >= 7 ? 85 : 34) + '%,.30);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.70),0 0 1px rgba(0,0,0,.55);box-shadow:' + glow + ';';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
${ROOT}{--c1:2.72rem;--rh:2.36rem;--axis:rgba(34,34,40,.84);--axis2:rgba(48,48,56,.90);margin:.85em 0 1.1em;position:relative;z-index:3;clear:both;width:100%;max-width:calc(100% - 3.15rem)}
.jf-ieg-box{border-radius:12px;overflow:hidden;background:rgba(18,18,18,.26);border:1px solid rgba(255,255,255,.08)}
.jf-ieg-toggle{width:100%;display:flex;align-items:center;gap:.42rem;border:0;margin:0;padding:.72rem .95rem;cursor:pointer;color:inherit;background:rgba(255,255,255,.03);text-align:left;font:inherit;outline:none !important;box-shadow:none !important;-webkit-tap-highlight-color:transparent}.jf-ieg-toggle:hover{background:rgba(255,255,255,.05)}.jf-ieg-toggle-label{font-size:1.05rem;font-weight:700;line-height:1.2}.jf-ieg-toggle-icon{transition:transform .16s ease;opacity:.92;flex:0 0 auto}.jf-ieg-toggle[aria-expanded="true"] .jf-ieg-toggle-icon{transform:rotate(180deg)}
.jf-ieg-panel{border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.09);overflow:hidden}.jf-ieg-panel[hidden]{display:none !important}.jf-ieg-body{padding:.72rem .82rem .82rem;background:rgba(0,0,0,.06);overflow:hidden}.jf-ieg-status{font-size:.92rem;opacity:.9;padding:.15rem .05rem}.jf-ieg-link{color:inherit !important;text-decoration:none !important;font-weight:700}
.jf-ieg-scroll{overflow-x:auto;overflow-y:hidden;padding-bottom:.08rem;padding-right:.55rem;max-width:100%}
.jf-ieg-grid{display:grid;column-gap:.26rem;row-gap:.26rem;align-items:stretch;min-width:max-content;grid-auto-rows:var(--rh)}
.jf-ieg-cell{height:var(--rh);min-height:var(--rh);max-height:var(--rh);display:flex;align-items:center;justify-content:center;text-align:center;border-radius:8px;box-sizing:border-box;padding:.18rem .24rem;line-height:1;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:.86rem;position:relative;flex:0 0 auto}
.jf-ieg-corner,.jf-ieg-season,.jf-ieg-episode,.jf-ieg-rating,.jf-ieg-empty,.jf-ieg-ghost{width:var(--c1);min-width:var(--c1);max-width:var(--c1)}
.jf-ieg-corner{position:sticky;left:0;z-index:6;background:var(--axis) !important;border-color:rgba(255,255,255,.14) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.jf-ieg-corner-btn{cursor:pointer;outline:none !important;-webkit-tap-highlight-color:transparent;color:inherit}.jf-ieg-corner-btn:hover{background:var(--axis2) !important;border-color:rgba(255,255,255,.24) !important}.jf-ieg-corner-icon{width:1rem;height:1rem;display:block;opacity:.92;transition:transform .16s ease,opacity .16s ease;pointer-events:none;color:inherit}
.jf-ieg-season,.jf-ieg-episode{font-weight:700;background:var(--axis) !important;font-size:.89rem;color:inherit !important;text-decoration:none !important;outline:none !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05) !important;border-color:rgba(255,255,255,.14) !important}
.jf-ieg-season:hover,.jf-ieg-episode:hover{background:var(--axis2) !important;border-color:rgba(255,255,255,.24) !important}
.jf-ieg-sticky-left{position:sticky;left:0;z-index:5;background:var(--axis) !important;border-color:rgba(255,255,255,.14) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-axis-match{background:var(--axis2) !important;border-color:rgba(255,255,255,.30) !important;box-shadow:0 0 0 1px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-rating{cursor:pointer;font-family:inherit !important;font-weight:700 !important;font-size:1.28rem;letter-spacing:-.01em;font-variant-numeric:tabular-nums;transition:filter .16s ease,border-color .16s ease,box-shadow .16s ease;text-decoration:none !important;outline:none !important;color:#fff !important;z-index:1}.jf-ieg-rating:hover{filter:brightness(1.36) saturate(1.42) contrast(1.12);border-color:rgba(255,255,255,.22)}
.jf-ieg-rating-96{filter:brightness(1.26) saturate(1.34) contrast(1.10);text-shadow:0 1px 0 rgba(0,0,0,.88),0 0 1px rgba(0,0,0,.58),0 0 5px rgba(86,255,72,.26),0 0 10px rgba(86,255,72,.11) !important}
.jf-ieg-rating-97{filter:brightness(1.32) saturate(1.40) contrast(1.12);text-shadow:0 1px 0 rgba(0,0,0,.90),0 0 1px rgba(0,0,0,.60),0 0 6px rgba(146,255,74,.32),0 0 12px rgba(146,255,74,.15) !important}
.jf-ieg-rating-98plus{filter:brightness(1.36) saturate(1.42) contrast(1.12);text-shadow:0 1px 0 rgba(0,0,0,.90),0 0 1px rgba(0,0,0,.60),0 0 6px rgba(255,240,28,.34),0 0 12px rgba(255,240,28,.18) !important}
.jf-ieg-rating-96:hover{filter:brightness(1.34) saturate(1.40) contrast(1.12) !important;box-shadow:0 0 8px rgba(86,255,72,.30),0 0 16px rgba(86,255,72,.15),0 0 22px rgba(86,255,72,.08),inset 0 0 0 1px rgba(255,255,255,.05),inset 0 1px 0 rgba(255,255,255,.04) !important}
.jf-ieg-rating-97:hover{filter:brightness(1.40) saturate(1.46) contrast(1.13) !important;box-shadow:0 0 10px rgba(146,255,74,.36),0 0 19px rgba(146,255,74,.20),0 0 26px rgba(146,255,74,.11),inset 0 0 0 1px rgba(255,255,255,.06),inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-rating-98plus:hover{filter:brightness(1.40) saturate(1.46) contrast(1.13) !important;box-shadow:0 0 10px rgba(255,240,28,.38),0 0 19px rgba(255,240,28,.22),0 0 28px rgba(255,240,28,.12),inset 0 0 0 1px rgba(255,255,255,.06),inset 0 1px 0 rgba(255,255,255,.05) !important}
.jf-ieg-empty{cursor:pointer;font-weight:800;font-size:1.02rem;color:rgba(255,255,255,.76) !important;text-decoration:none !important;outline:none !important;background:rgba(112,112,124,.18) !important;border-color:rgba(220,220,230,.12) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04) !important}.jf-ieg-empty:hover{filter:brightness(1.10);border-color:rgba(255,255,255,.18) !important}
.jf-ieg-ghost{opacity:0;pointer-events:none;background:transparent !important;border-color:transparent !important;box-shadow:none !important}
.jf-ieg-rating,.jf-ieg-empty{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
@media (max-width:900px){${ROOT}{max-width:calc(100% - .4rem)}.jf-ieg-body{padding:.72rem .42rem .82rem .42rem !important}.jf-ieg-scroll{padding-right:.12rem !important}}
`;
        document.head.appendChild(s);
    }

    function ensureTipStyle() {
        if (document.getElementById(TIP_STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = TIP_STYLE_ID;
        s.textContent = '#' + TIP_ID + '{position:fixed;z-index:99999;background:rgba(15,15,15,.95);color:#fff;padding:16px;border-radius:10px;box-sizing:border-box;width:min(320px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(12px);pointer-events:none;opacity:0;transition:opacity .2s ease-in-out;display:none;font-family:sans-serif}' +
            '#' + TIP_ID + '.visible{opacity:1;display:block}' +
            '.jf-tooltip-title{font-size:1.15em;font-weight:800;margin:0 0 6px;color:#fff;line-height:1.2}' +
            '.jf-tooltip-meta{font-size:.8em;color:#10b981;margin-bottom:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}' +
            ':where(#' + TIP_ID + ') .jf-tooltip-meta>span{color:#666}' +
            '.jf-tooltip-overview{font-size:.85em;line-height:1.5;color:#d1d5db;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}';
        (document.head || document.documentElement).appendChild(s);
    }

    let tipRoot = null, hov = null, timer = 0, raf = 0, armed = false, mx = 0, my = 0, tw = 0, th = 0, axisOn = [], lastType = '';
    const tipCache = new Map();

    const tipEl = () => {
        let t = document.getElementById(TIP_ID);
        if (!t) {
            t = document.createElement('div');
            t.id = TIP_ID;
            document.body.appendChild(t);
        }
        return t;
    };

    function fetchTip(id) {
        let p = tipCache.get(id);
        if (p) return p;
        p = getItem(id, 'Overview,Genres').then(v => { if (!v) tipCache.delete(id); return v; });
        tipCache.set(id, p);
        if (tipCache.size > 200) tipCache.delete(tipCache.keys().next().value);
        return p;
    }

    function place() {
        raf = 0;
        const t = tipRoot && tipRoot.parentNode;
        if (!t) return;
        const m = 10, vw = window.innerWidth, vh = window.innerHeight;
        let x = mx + 15, y = my + 15;
        if (hov && hov.touch) {
            x = mx - tw / 2;
            y = my - 30 - th;
            if (y < m) y = my + 30;
        } else {
            if (x + tw + m > vw) x = mx - 15 - tw;
            if (y + th + m > vh) y = my - 15 - th;
        }
        t.style.left = Math.max(m, Math.min(x, vw - tw - m)) + 'px';
        t.style.top = Math.max(m, Math.min(y, vh - th - m)) + 'px';
    }

    function showTip(item) {
        ensureTipStyle();
        const t = tipEl(), box = document.createElement('div'), meta = document.createElement('div');
        const mk = (cls, text) => {
            const d = document.createElement('div');
            d.className = cls;
            d.textContent = text;
            return d;
        };
        const parts = [
            item.ProductionYear || '',
            item.CommunityRating ? '⭐ ' + Number(item.CommunityRating).toFixed(1) : '',
            item.Genres && item.Genres.length ? item.Genres.slice(0, 3).join(',') : ''
        ].filter(Boolean);
        meta.className = 'jf-tooltip-meta';
        parts.forEach((p, i) => {
            if (i) {
                const sep = document.createElement('span');
                sep.textContent = '|';
                meta.appendChild(sep);
            }
            meta.appendChild(document.createTextNode(String(p)));
        });
        box.className = 'jf-ieg-tip';
        box.append(mk('jf-tooltip-title', item.Name || ''), meta, mk('jf-tooltip-overview', item.Overview || 'No synopsis available.'));
        t.textContent = '';
        t.appendChild(box);
        t.style.width = TIP_WIDTH;
        t.classList.add('visible');
        tipRoot = box;
        tw = t.offsetWidth;
        th = t.offsetHeight;
        place();
    }

    function onMove(e) {
        if (e.pointerType !== 'mouse') return;
        mx = e.clientX;
        my = e.clientY;
        if (tipRoot && !raf) raf = requestAnimationFrame(place);
    }

    function arm() {
        if (armed) return;
        armed = true;
        document.addEventListener('pointermove', onMove, CAP);
        document.addEventListener('pointerdown', hideTip, CAP);
        document.addEventListener('scroll', hideTip, CAP);
        document.addEventListener('viewbeforehide', hideTip, true);
    }

    function disarm() {
        if (!armed) return;
        armed = false;
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerdown', hideTip, true);
        document.removeEventListener('scroll', hideTip, true);
        document.removeEventListener('viewbeforehide', hideTip, true);
    }

    function hideTip() {
        if (timer) { clearTimeout(timer); timer = 0; }
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        disarm();
        hov = null;
        const t = tipRoot && tipRoot.parentNode;
        if (t) {
            t.classList.remove('visible');
            t.style.width = '';
        }
        tipRoot = null;
    }

    function startTip(el, e, touch) {
        const h = { el, id: el.getAttribute('data-jf-internal-id'), touch };
        hov = h;
        mx = e.clientX;
        my = e.clientY;
        arm();
        const load = () => fetchTip(h.id).then(item => {
            if (item && hov === h && el.isConnected) showTip(item);
        });
        if (touch) load();
        else timer = setTimeout(() => { timer = 0; load(); }, Math.max(0, +CONFIG.TOOLTIP_DELAY_MS || 0));
    }

    function axis(grid, cell) {
        axisOn.forEach(el => el.classList.remove('jf-ieg-axis-match'));
        axisOn = [];
        if (!cell) return;
        const s = grid.querySelector('[data-jf-axis-season="' + cell.dataset.jfIegS + '"]');
        const e = grid.querySelector('[data-jf-axis-episode="' + cell.dataset.jfIegE + '"]');
        if (s) axisOn.push(s);
        if (e) axisOn.push(e);
        axisOn.forEach(el => el.classList.add('jf-ieg-axis-match'));
    }

    const cellOf = t => t && t.closest ? t.closest(CELL) : null;

    function bindGrid(scroll, grid, onInvert, sid) {
        scroll.addEventListener('click', e => {
            const t = e.target;
            if (!t || !t.closest) return;
            if (hov && hov.touch) { e.preventDefault(); e.stopPropagation(); return; }
            if (t.closest('.jf-ieg-corner')) {
                e.preventDefault();
                e.stopPropagation();
                onInvert();
                return;
            }
            if (t.closest('a[aria-disabled="true"]')) { e.preventDefault(); e.stopPropagation(); return; }
            const a = t.closest('a[data-jf-internal-id]');
            if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            location.hash = detailsHash(a.dataset.jfInternalId, sid);
        }, true);
        scroll.addEventListener('pointerover', e => {
            lastType = e.pointerType;
            const cell = cellOf(e.target);
            if (cell) axis(grid, cell);
            if (!CONFIG.TOOLTIP || e.pointerType !== 'mouse') return;
            const el = cell && cell.dataset.jfIegTip ? cell : null;
            if (hov && hov.el === el) return;
            if (hov) hideTip();
            if (el) startTip(el, e, false);
        }, { passive: true });
        scroll.addEventListener('pointerout', e => {
            const cell = cellOf(e.target);
            if (!cell || (e.relatedTarget && cell.contains(e.relatedTarget))) return;
            axis(grid, null);
            if (hov && hov.el === cell && !hov.touch) hideTip();
        }, { passive: true });
        scroll.addEventListener('contextmenu', e => {
            if (!CONFIG.TOOLTIP || (e.pointerType || lastType) === 'mouse') return;
            const cell = cellOf(e.target);
            if (!cell || !cell.dataset.jfIegTip) return;
            e.preventDefault();
            if (hov) hideTip();
            startTip(cell, e, true);
        });
        scroll.addEventListener('focusin', e => {
            const cell = cellOf(e.target);
            if (cell) axis(grid, cell);
        });
        scroll.addEventListener('focusout', () => axis(grid, null));
    }

    function renderFallback(body, imdbId) {
        body.innerHTML = '';
        const el = document.createElement(imdbId ? 'a' : 'div');
        if (imdbId) {
            el.className = 'jf-ieg-link emby-button button-link';
            external(el, IMDB + encodeURIComponent(imdbId) + '/ratings/');
            el.textContent = CONFIG.TITLE;
        } else {
            el.className = 'jf-ieg-status';
            el.textContent = CONFIG.EMPTY_TEXT;
        }
        body.appendChild(el);
    }

    function renderGrid(body, seasons, imdbId, sid, seriesName) {
        body.innerHTML = '';
        const inverted = getInv();
        const allEpNums = [...new Set(seasons.flatMap(s => s.episodes.map(e => e.ep)))].sort((a, b) => a - b);
        const scroll = document.createElement('div');
        scroll.className = 'jf-ieg-scroll';
        const grid = document.createElement('div');
        grid.className = 'jf-ieg-grid';
        grid.style.gridTemplateColumns = 'var(--c1) repeat(' + (inverted ? allEpNums.length : seasons.length) + ', var(--c1))';

        const corner = document.createElement('button');
        corner.type = 'button';
        corner.className = 'jf-ieg-cell jf-ieg-corner jf-ieg-corner-btn';
        corner.setAttribute('aria-label', 'Invert grid axes');
        corner.innerHTML = '<svg class="jf-ieg-corner-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="color:inherit"><path d="M2.5 4.5H11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 2L11 4.5 8.5 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 11.5H5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 9L5 11.5 7.5 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        grid.appendChild(corner);

        const link = (a, id, num) => {
            if (id && sid) {
                a.href = detailsUrl(id, sid);
                a.dataset.jfInternalId = id;
            } else if (imdbId) {
                external(a, IMDB + encodeURIComponent(imdbId) + '/episodes/?season=' + num);
            } else {
                a.href = '#';
                a.setAttribute('aria-disabled', 'true');
            }
        };

        const mkSeason = s => {
            const a = document.createElement('a');
            a.className = 'jf-ieg-cell jf-ieg-season emby-button button-link';
            a.textContent = 'S' + s.num;
            a.title = (seriesName || CONFIG.TITLE) + ' - Season ' + String(s.num).padStart(2, '0');
            a.dataset.jfAxisSeason = String(s.num);
            link(a, s.seasonJfId, s.num);
            return a;
        };

        const mkEpHead = (n, sticky) => {
            const d = document.createElement('div');
            d.className = 'jf-ieg-cell jf-ieg-episode' + (sticky ? ' jf-ieg-sticky-left' : '');
            d.textContent = 'E' + n;
            d.dataset.jfAxisEpisode = String(n);
            return d;
        };

        const mkCell = (ep, season) => {
            const d = document.createElement(ep ? 'a' : 'div');
            if (!ep) {
                d.className = 'jf-ieg-cell jf-ieg-ghost';
                d.setAttribute('aria-hidden', 'true');
                return d;
            }
            const r = toRating(ep.rating);
            if (r == null) {
                d.className = 'jf-ieg-cell jf-ieg-empty emby-button button-link';
                d.textContent = '-';
            } else {
                d.className = 'jf-ieg-cell jf-ieg-rating' + (r >= 9.8 ? ' jf-ieg-rating-98plus' : r >= 9.7 ? ' jf-ieg-rating-97' : r >= 9.6 ? ' jf-ieg-rating-96' : '') + ' emby-button button-link';
                d.textContent = r.toFixed(1);
                d.style.cssText = ratingStyle(r);
            }
            link(d, ep.jfId, season.num);
            if (ep.jfId && sid) d.dataset.jfIegTip = '1';
            d.dataset.jfIegS = String(season.num);
            d.dataset.jfIegE = String(ep.ep);
            return d;
        };

        if (!inverted) {
            for (const s of seasons) grid.appendChild(mkSeason(s));
            for (const n of allEpNums) {
                grid.appendChild(mkEpHead(n, true));
                for (const s of seasons) grid.appendChild(mkCell(s.episodes.find(e => e.ep === n), s));
            }
        } else {
            for (const n of allEpNums) grid.appendChild(mkEpHead(n, false));
            for (const s of seasons) {
                const sh = mkSeason(s);
                sh.classList.add('jf-ieg-sticky-left');
                grid.appendChild(sh);
                for (const n of allEpNums) grid.appendChild(mkCell(s.episodes.find(e => e.ep === n), s));
            }
        }

        scroll.appendChild(grid);
        body.appendChild(scroll);
        bindGrid(scroll, grid, () => {
            setInv(!inverted);
            renderGrid(body, seasons, imdbId, sid, seriesName);
        }, sid);
    }

    async function loadPanel(root) {
        if (root.dataset.loaded === '1' || root.dataset.loading === '1') return;
        root.dataset.loading = '1';
        const body = root.querySelector('.jf-ieg-body');
        if (!body) { root.dataset.loading = '0'; return; }
        body.innerHTML = '<div class="jf-ieg-status">Loading…</div>';
        const id = root.dataset.itemId;
        try {
            const tt = fetchImdbId(id);
            const [jf, imdbId, ds] = await Promise.all([
                fetchJf(id).catch(() => ({ seasonsByNum: {}, seasonIds: {} })),
                tt,
                tt.then(v => v ? fetchDataset(v) : null).catch(() => null)
            ]);
            if (imdbId) root.dataset.imdbId = imdbId;
            if (jf.name) root.dataset.seriesName = jf.name;
            const seasons = mergeData(ds, jf);
            if (seasons.some(s => s.episodes.some(e => e.rating != null || e.jfId))) renderGrid(body, seasons, imdbId, root.dataset.serverId || '', root.dataset.seriesName || '');
            else renderFallback(body, imdbId);
        } catch (e) {
            console.warn('[JF-IEG] Panel load failed', e);
            renderFallback(body, root.dataset.imdbId || '');
        } finally {
            root.dataset.loaded = '1';
            root.dataset.loading = '0';
        }
    }

    function createBlock(itemId, sid) {
        const root = document.createElement('section');
        root.setAttribute('data-jf-ieg-root', '1');
        root.dataset.itemId = itemId;
        root.dataset.serverId = sid || '';
        root.dataset.seriesName = '';
        root.dataset.loaded = '0';
        root.dataset.loading = '0';
        root.innerHTML = '<div class="jf-ieg-box"><button type="button" class="jf-ieg-toggle" aria-expanded="false"><span class="jf-ieg-toggle-label"></span><span class="material-icons jf-ieg-toggle-icon" aria-hidden="true">expand_more</span></button><div class="jf-ieg-panel" hidden><div class="jf-ieg-body"></div></div></div>';
        root.querySelector('.jf-ieg-toggle-label').textContent = CONFIG.TITLE;
        const t = root.querySelector('.jf-ieg-toggle'), p = root.querySelector('.jf-ieg-panel');
        t.addEventListener('click', () => {
            const nx = t.getAttribute('aria-expanded') !== 'true';
            t.setAttribute('aria-expanded', nx ? 'true' : 'false');
            p.hidden = !nx;
            if (nx) loadPanel(root);
        });
        return root;
    }

    function mount(view, id, sid, season) {
        let block = view.querySelector(ROOT);
        if (block && block.dataset.itemId === id) return;
        if (block) block.remove();
        injectStyle();
        block = createBlock(id, sid);
        const anchor = view.querySelector('#castCollapsible');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(block, anchor);
        } else {
            const box = season.closest(BOXES.join(','));
            box.parentNode.insertBefore(block, box.nextSibling);
        }
    }

    function check(view, p) {
        const season = view.querySelector(SEASON);
        if (!season) return false;
        mount(view, p.id, p.serverId || season.getAttribute('data-serverid') || '', season);
        return true;
    }

    let unwatch = null;

    function watch(view, p) {
        if (unwatch) unwatch();
        if (!p.id) return;
        const block = view.querySelector(ROOT);
        if (block && block.dataset.itemId === p.id) return;
        if (check(view, p) || view.querySelector(TYPED)) return;
        const boxes = BOXES.map(b => view.querySelector(b)).filter(Boolean);
        if (!boxes.length) return;
        const obs = new MutationObserver(() => {
            if (check(view, p) || view.querySelector(TYPED)) stop();
        });
        const stop = () => {
            obs.disconnect();
            if (unwatch === stop) unwatch = null;
        };
        boxes.forEach(b => obs.observe(b, { childList: true, subtree: true }));
        unwatch = stop;
    }

    document.addEventListener('viewshow', e => {
        const view = e.target;
        if (view && view.classList && view.classList.contains('itemDetailPage')) watch(view, (e.detail && e.detail.params) || {});
        else if (unwatch) unwatch();
    }, true);

    const current = document.querySelector('.itemDetailPage:not(.hide)');
    if (current) watch(current, hashParams());
})();
