/* Jellyfin Episodes Ratings Grid 1.0.IMDb-Links-only from github.com/Damocles-fr */
(function () {
  "use strict";

  const CFG = {
    title: "IMDb Episodes Grid",
    debug: false,
    styleId: "jf-imdb-episodes-grid-style-v1",
    rootSelector: '[data-jf-ieg-root="1"]',
    watchDogMs: 800,
    maxWaitMs: 12000,
    reapplyDelayMs: 250,
    readyAnchorWaitMs: 2200,
    itemTtlMs: 1000 * 60 * 60 * 24,
    datasetTtlMs: 1000 * 60 * 60 * 24
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let scheduled = null;
  let runSeq = 0;
  let lastItemId = "";

  function log() {
    if (CFG.debug) console.log.apply(console, ["[JF-IEG]"].concat(Array.from(arguments)));
  }

  function scheduleRun(delay) {
    const d = typeof delay === "number" ? delay : 0;
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(run, d);
  }

  function injectStyle() {
    if (document.getElementById(CFG.styleId)) return;

    const style = document.createElement("style");
    style.id = CFG.styleId;
    style.textContent = `
      [data-jf-ieg-root="1"]{
        margin:.85em 0 1.1em 0;
        position:relative;
        z-index:3;
        clear:both;
        width:100%;
        max-width:calc(100% - 3.15rem);
      }

      @media (max-width:900px){
        [data-jf-ieg-root="1"]{
          max-width:calc(100% - .4rem);
        }
        .jf-ieg-body{
          padding:.72rem .42rem .82rem .42rem !important;
        }
        .jf-ieg-scroll{
          padding-right:.12rem !important;
        }
      }

      .jf-ieg-box{
        border-radius:12px;
        overflow:hidden;
        background:rgb(20,20,20);
        border:1px solid rgba(255,255,255,.08);
      }

      .jf-ieg-toggle{
        width:100%;
        display:flex;
        align-items:center;
        justify-content:flex-start;
        gap:.42rem;
        border:0;
        margin:0;
        padding:.72rem .95rem;
        cursor:pointer;
        color:inherit;
        background:rgba(255,255,255,.025);
        text-align:left;
        font:inherit;
        outline:none !important;
        box-shadow:none !important;
        -webkit-tap-highlight-color:transparent;
      }

      .jf-ieg-toggle:hover{
        background:rgba(255,255,255,.045);
      }

      .jf-ieg-toggle:focus,
      .jf-ieg-toggle:focus-visible{
        outline:none !important;
        box-shadow:none !important;
      }

      .jf-ieg-toggle-label{
        font-size:1.05rem;
        font-weight:700;
        line-height:1.2;
      }

      .jf-ieg-toggle-icon{
        transition:transform .16s ease;
        opacity:.92;
        flex:0 0 auto;
        margin-left:.02rem;
      }

      .jf-ieg-toggle[aria-expanded="true"] .jf-ieg-toggle-icon{
        transform:rotate(180deg);
      }

      .jf-ieg-panel{
        border-top:1px solid rgba(255,255,255,.08);
        background:rgb(20,20,20);
      }

      .jf-ieg-panel[hidden]{
        display:none !important;
      }

      .jf-ieg-body{
        padding:.72rem .82rem .82rem .82rem;
        background:rgb(20,20,20);
      }

      .jf-ieg-status{
        font-size:.92rem;
        opacity:.9;
        padding:.15rem .05rem;
      }

      .jf-ieg-link{
        color:inherit !important;
        text-decoration:none !important;
        font-weight:700;
        background:none !important;
        border:0 !important;
        box-shadow:none !important;
        padding:0 !important;
        min-height:0 !important;
        outline:none !important;
        -webkit-tap-highlight-color:transparent;
      }

      .jf-ieg-link:hover{
        text-decoration:none !important;
        opacity:.96;
        box-shadow:none !important;
      }

      .jf-ieg-link:focus,
      .jf-ieg-link:focus-visible{
        outline:none !important;
        box-shadow:none !important;
      }

      .jf-ieg-scroll{
        position:relative;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:.08rem;
        padding-right:.55rem;
        max-width:100%;
      }

      .jf-ieg-grid{
        display:grid;
        column-gap:.26rem;
        row-gap:.26rem;
        align-items:stretch;
        min-width:max-content;
      }

      .jf-ieg-cell{
        min-width:2.28rem;
        min-height:2.36rem;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        border-radius:8px;
        box-sizing:border-box;
        padding:.18rem .24rem;
        line-height:1;
        border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.03);
        font-size:.86rem;
      }

      .jf-ieg-corner{
        position:sticky;
        left:0;
        z-index:4;
        visibility:hidden;
        pointer-events:none;
        border-color:transparent !important;
        background:transparent !important;
        box-shadow:none !important;
      }

      .jf-ieg-season,
      .jf-ieg-episode{
        font-weight:700;
        background:linear-gradient(rgba(255,255,255,.055), rgba(255,255,255,.055)), rgb(24,24,24);
        background-clip:padding-box;
        font-size:.89rem;
        color:inherit !important;
        text-decoration:none !important;
        text-shadow:none !important;
        filter:none !important;
        outline:none !important;
        -webkit-tap-highlight-color:transparent;
        box-shadow:none !important;
      }

      .jf-ieg-season,
      .jf-ieg-rating,
      .jf-ieg-empty{
        width:2.72rem;
        min-width:2.72rem;
        max-width:2.72rem;
      }

      .jf-ieg-season:hover{
        background:linear-gradient(rgba(255,255,255,.09), rgba(255,255,255,.09)), rgb(24,24,24);
        border-color:rgba(255,255,255,.18);
        box-shadow:none !important;
      }

      .jf-ieg-season:focus,
      .jf-ieg-season:focus-visible{
        outline:none !important;
        box-shadow:none !important;
        text-shadow:none !important;
      }

      .jf-ieg-episode{
        min-width:3.05rem;
        position:sticky;
        left:0;
        z-index:3;
        background:linear-gradient(rgba(255,255,255,.055), rgba(255,255,255,.055)), rgb(24,24,24) !important;
        background-clip:padding-box;
        box-shadow:none !important;
      }

      .jf-ieg-rating{
        color:#fff !important;
        text-decoration:none !important;
        font-weight:900;
        font-size:1.28rem;
        letter-spacing:-.03em;
        font-variant-numeric:tabular-nums;
        transition:filter .16s ease, border-color .16s ease, box-shadow .16s ease, text-shadow .16s ease;
        text-shadow:
          0 1px 0 rgba(0,0,0,.78),
          0 0 1px rgba(0,0,0,.46),
          0 0 2px rgba(0,0,0,.16);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.010), inset 0 -1px 0 rgba(0,0,0,.016) !important;
        outline:none !important;
        -webkit-tap-highlight-color:transparent;
      }

      .jf-ieg-rating:hover{
        text-decoration:none !important;
        filter:brightness(1.36) saturate(1.42) contrast(1.12);
        border-color:rgba(255,255,255,.22);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.05), inset 0 1px 0 rgba(255,255,255,.04) !important;
        text-shadow:
          0 1px 0 rgba(0,0,0,.86),
          0 0 1px rgba(0,0,0,.56),
          0 0 3px rgba(255,255,255,.07);
      }

      .jf-ieg-rating:focus,
      .jf-ieg-rating:focus-visible{
        outline:none !important;
      }

      .jf-ieg-rating-rare-green,
      .jf-ieg-rating-rare-gold{
        filter:brightness(1.36) saturate(1.42) contrast(1.12);
      }

      .jf-ieg-rating-rare-green{
        text-shadow:
          0 1px 0 rgba(0,0,0,.86),
          0 0 1px rgba(0,0,0,.56),
          0 0 4px rgba(72,255,72,.30),
          0 0 9px rgba(72,255,72,.18) !important;
      }

      .jf-ieg-rating-rare-gold{
        text-shadow:
          0 1px 0 rgba(0,0,0,.88),
          0 0 1px rgba(0,0,0,.58),
          0 0 4px rgba(255,240,28,.34),
          0 0 9px rgba(255,240,28,.20) !important;
      }

      .jf-ieg-rating-rare-green:hover,
      .jf-ieg-hover-cross.jf-ieg-rating-rare-green{
        filter:brightness(1.36) saturate(1.42) contrast(1.12) !important;
        text-shadow:
          0 1px 0 rgba(0,0,0,.90),
          0 0 1px rgba(0,0,0,.62),
          0 0 6px rgba(72,255,72,.46),
          0 0 13px rgba(72,255,72,.30),
          0 0 22px rgba(72,255,72,.14) !important;
      }

      .jf-ieg-rating-rare-gold:hover,
      .jf-ieg-hover-cross.jf-ieg-rating-rare-gold{
        filter:brightness(1.36) saturate(1.42) contrast(1.12) !important;
        text-shadow:
          0 1px 0 rgba(0,0,0,.92),
          0 0 1px rgba(0,0,0,.64),
          0 0 6px rgba(255,240,28,.50),
          0 0 13px rgba(255,240,28,.32),
          0 0 22px rgba(255,240,28,.16) !important;
      }

      .jf-ieg-hover-axis.jf-ieg-season{
        background:linear-gradient(rgba(255,255,255,.18), rgba(255,255,255,.18)), rgb(24,24,24) !important;
        border-color:rgba(255,255,255,.34) !important;
        color:#fff !important;
        text-shadow:none !important;
        filter:none !important;
        box-shadow:none !important;
      }

      .jf-ieg-hover-axis.jf-ieg-episode{
        background:linear-gradient(rgba(255,255,255,.18), rgba(255,255,255,.18)), rgb(24,24,24) !important;
        border-color:rgba(255,255,255,.34) !important;
        color:#fff !important;
        text-shadow:none !important;
        filter:none !important;
        box-shadow:none !important;
      }

      .jf-ieg-hover-cross.jf-ieg-rating{
        filter:brightness(1.44) saturate(1.46) contrast(1.14);
        border-color:rgba(255,255,255,.28);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.06) !important;
      }

      .jf-ieg-empty{
        opacity:.15;
        background:rgba(255,255,255,.02);
      }
    `;
    document.head.appendChild(style);
  }

  function isDetailsRoute() {
    const h = String(location.hash || "");
    return h.includes("/details") && (h.includes("id=") || new URL(location.href).searchParams.get("id"));
  }

  function getItemIdFromUrl() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    if (id) return id;
    const hash = url.hash || "";
    const m = hash.match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getBaseUrl() {
    return window.location.origin;
  }

  function getAccessToken() {
    try {
      const raw = localStorage.getItem("jellyfin_credentials");
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const server = obj && obj.Servers && obj.Servers.find(function (s) { return s.AccessToken; });
      return server ? server.AccessToken : null;
    } catch {
      return null;
    }
  }

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() > obj.expires) return null;
      return obj.value;
    } catch {
      return null;
    }
  }

  function cacheSet(key, value, ttlMs) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ value: value, expires: Date.now() + ttlMs }));
    } catch {}
  }

  async function fetchItem(itemId) {
    const cacheKey = "ieg_item_" + itemId;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const token = getAccessToken();
    if (!token) return null;

    const res = await fetch(getBaseUrl() + "/Items/" + itemId + "?Fields=ProviderIds", {
      headers: { "X-Emby-Token": token }
    });
    if (!res.ok) return null;

    const data = await res.json();
    cacheSet(cacheKey, data, CFG.itemTtlMs);
    return data;
  }

  async function fetchDataset(imdbId) {
    const cacheKey = "ieg_dataset_" + imdbId;
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached;

    const res = await fetch(
      "https://raw.githubusercontent.com/mokronos/imdb-heatmap/main/data/" + encodeURIComponent(imdbId) + ".json",
      { credentials: "omit" }
    );

    if (res.status === 404) {
      cacheSet(cacheKey, null, CFG.datasetTtlMs);
      return null;
    }

    if (!res.ok) throw new Error("Dataset HTTP " + res.status);

    const data = await res.json();
    const finalData = Array.isArray(data) && data.length ? data : null;
    cacheSet(cacheKey, finalData, CFG.datasetTtlMs);
    return finalData;
  }

  function normalizeImdbId(id) {
    const s = String(id || "").trim();
    if (!s) return "";
    return s.indexOf("tt") === 0 ? s : "tt" + s;
  }

  function getProviderId(item, wantedKey) {
    const ids = item && item.ProviderIds;
    if (!ids) return "";
    const target = String(wantedKey).toLowerCase();
    for (const k of Object.keys(ids)) {
      if (String(k).toLowerCase() === target) return String(ids[k] || "");
    }
    return "";
  }

  function buildSeriesRatingsLink(seriesImdbId) {
    return "https://www.imdb.com/fr/title/" + encodeURIComponent(seriesImdbId) + "/ratings/";
  }

  function buildSeasonLink(seriesImdbId, seasonNumber) {
    return "https://www.imdb.com/title/" + encodeURIComponent(seriesImdbId) + "/episodes/?season=" + encodeURIComponent(seasonNumber);
  }

  function decorateExternalLink(a, extraClass) {
    if (!a) return;
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    a.setAttribute("is", "emby-linkbutton");
    a.setAttribute("data-imdb-processed", "true");
    a.classList.add("button-link", "emby-button");
    if (extraClass) a.classList.add(extraClass);
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return false;
    return true;
  }

  function pickBestVisible(elements) {
    if (!elements.length) return null;

    let best = null;
    let bestArea = 0;

    for (const el of elements) {
      if (!isElementVisible(el)) continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }

    return best || elements[elements.length - 1] || null;
  }

  function findVisibleCastSection() {
    return pickBestVisible(Array.from(document.querySelectorAll("#castCollapsible")));
  }

  function findVisiblePeopleHeader() {
    return pickBestVisible(Array.from(document.querySelectorAll("#peopleHeader")));
  }

  function findInsertTarget() {
    const castSection = findVisibleCastSection();
    if (castSection && castSection.parentNode) {
      return { parent: castSection.parentNode, before: castSection };
    }

    const peopleHeader = findVisiblePeopleHeader();
    const peopleSection = peopleHeader ? peopleHeader.closest(".verticalSection, .detailVerticalSection, .emby-scroller-container") : null;
    if (peopleSection && peopleSection.parentNode && isElementVisible(peopleSection)) {
      return { parent: peopleSection.parentNode, before: peopleSection };
    }

    return null;
  }

  function findVisibleOfficialImdbLink(imdbId) {
    if (!imdbId) return null;

    const all = Array.from(document.querySelectorAll('a[href*="imdb.com/title/"]'));
    const filtered = all.filter(function (a) {
      if (!a || !a.isConnected) return false;
      if (a.closest(CFG.rootSelector)) return false;
      if (!isElementVisible(a)) return false;

      const href = String(a.getAttribute("href") || a.href || "");
      const m = href.match(/imdb\.com\/(?:[a-z]{2}\/)?title\/(tt\d+)/i);
      if (!m) return false;

      return m[1] === imdbId;
    });

    return pickBestVisible(filtered);
  }

  function findCurrentBlock(itemId) {
    const all = Array.from(document.querySelectorAll(CFG.rootSelector));
    return all.find(function (el) { return el.dataset.itemId === itemId; }) || null;
  }

  function cleanupForeignBlocks(currentItemId) {
    Array.from(document.querySelectorAll(CFG.rootSelector)).forEach(function (el) {
      if (el.dataset.itemId !== currentItemId) el.remove();
    });
  }

  function removeAllBlocks() {
    Array.from(document.querySelectorAll(CFG.rootSelector)).forEach(function (el) {
      el.remove();
    });
  }

  function renderFallback(container, seriesImdbId) {
    container.innerHTML = "";
    const link = document.createElement("a");
    link.href = buildSeriesRatingsLink(seriesImdbId);
    link.textContent = CFG.title;
    decorateExternalLink(link, "jf-ieg-link");
    container.appendChild(link);
  }

  function renderLoading(container) {
    container.innerHTML = '<div class="jf-ieg-status">Loading…</div>';
  }

  function getEpisodeNumbers(data) {
    const set = new Set();

    data.forEach(function (season) {
      if (!Array.isArray(season)) return;
      season.forEach(function (ep) {
        const n = Number(ep && ep.episode);
        if (Number.isFinite(n)) set.add(n);
      });
    });

    return Array.from(set).sort(function (a, b) { return a - b; });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getRegularHighStyle(rr) {
    const key = rr.toFixed(1);

    const map = {
      "7.0": [32, 88, 20.0, 0.840],
      "7.1": [36, 89, 20.8, 0.844],
      "7.2": [40, 90, 21.6, 0.848],
      "7.3": [44, 91, 22.4, 0.852],
      "7.4": [48, 92, 23.2, 0.856],
      "7.5": [54, 93, 24.2, 0.860],
      "7.6": [60, 94, 25.2, 0.864],
      "7.7": [66, 95, 26.4, 0.868],
      "7.8": [72, 96, 27.8, 0.872],
      "7.9": [78, 97, 29.2, 0.876],
      "8.0": [84, 98, 30.6, 0.880],
      "8.1": [90, 99, 32.0, 0.884],
      "8.2": [96, 100, 33.6, 0.889],
      "8.3": [100, 100, 35.2, 0.894],
      "8.4": [103, 100, 37.0, 0.899],
      "8.5": [106, 100, 39.0, 0.905],
      "8.6": [109, 100, 41.3, 0.912],
      "8.7": [112, 100, 43.0, 0.918],
      "8.8": [115, 100, 45.0, 0.927],
      "8.9": [118, 100, 46.0, 0.936],
      "9.0": [120, 100, 45.0, 0.945],
      "9.1": [121, 100, 46.0, 0.954],
      "9.2": [122, 100, 47.0, 0.963],
      "9.3": [123, 100, 48.0, 0.975],
      "9.4": [124, 100, 49.0, 0.987],
      "9.5": [124, 100, 50.0, 0.999],
      "9.6": [124, 100, 53.0, 0.999],
      "9.7": [110, 100, 52.0, 0.999],
      "9.8": [92, 100, 51.5, 0.999],
      "9.9": [72, 100, 51.0, 0.999],
      "10.0": [60, 100, 50.5, 0.999]
    };

    const glowMap = {
      "9.5": {
        glowA: "rgba(64,255,96,.13)",
        glowB: "rgba(64,255,96,.07)",
        textGlow1: "rgba(64,255,96,.24)",
        textGlow2: "rgba(64,255,96,.14)",
        blurA: 4,
        blurB: 8,
        insetA: "rgba(255,255,255,.06)",
        borderAlpha: 0.32
      },
      "9.6": {
        glowA: "rgba(72,255,72,.18)",
        glowB: "rgba(72,255,72,.10)",
        textGlow1: "rgba(72,255,72,.30)",
        textGlow2: "rgba(72,255,72,.18)",
        blurA: 5,
        blurB: 10,
        insetA: "rgba(255,255,255,.07)",
        borderAlpha: 0.34
      },
      "9.7": {
        glowA: "rgba(196,255,56,.17)",
        glowB: "rgba(196,255,56,.09)",
        textGlow1: "rgba(196,255,56,.27)",
        textGlow2: "rgba(196,255,56,.16)",
        blurA: 6,
        blurB: 11,
        insetA: "rgba(255,255,255,.07)",
        borderAlpha: 0.35
      },
      "9.8": {
        glowA: "rgba(255,245,40,.19)",
        glowB: "rgba(255,245,40,.10)",
        textGlow1: "rgba(255,245,40,.32)",
        textGlow2: "rgba(255,245,40,.18)",
        blurA: 7,
        blurB: 13,
        insetA: "rgba(255,255,255,.075)",
        borderAlpha: 0.36
      },
      "9.9": {
        glowA: "rgba(255,240,28,.22)",
        glowB: "rgba(255,240,28,.12)",
        textGlow1: "rgba(255,240,28,.36)",
        textGlow2: "rgba(255,240,28,.20)",
        blurA: 8,
        blurB: 15,
        insetA: "rgba(255,255,255,.08)",
        borderAlpha: 0.38
      },
      "10.0": {
        glowA: "rgba(255,236,18,.25)",
        glowB: "rgba(255,236,18,.14)",
        textGlow1: "rgba(255,236,18,.40)",
        textGlow2: "rgba(255,236,18,.24)",
        blurA: 9,
        blurB: 17,
        insetA: "rgba(255,255,255,.085)",
        borderAlpha: 0.40
      }
    };

    const cfg = map[key] || map["7.0"];
    const h = cfg[0];
    const s = cfg[1];
    const l = cfg[2];
    const a = cfg[3];

    let borderL = Math.min(l + 5, 74);
    let boxShadow = "inset 0 1px 0 rgba(255,255,255,.015), inset 0 -1px 0 rgba(0,0,0,.02)";
    let textShadow = "0 1px 0 rgba(0,0,0,.72), 0 0 1px rgba(0,0,0,.32)";
    let borderAlpha = 0.22;

    if (glowMap[key]) {
      const g = glowMap[key];
      boxShadow = [
        "0 0 " + g.blurA + "px " + g.glowA,
        "0 0 " + g.blurB + "px " + g.glowB,
        "inset 0 0 0 1px rgba(255,255,255,.06)",
        "inset 0 1px 0 " + g.insetA,
        "inset 0 -1px 0 rgba(0,0,0,.03)"
      ].join(", ");
      textShadow = [
        "0 1px 0 rgba(0,0,0,.84)",
        "0 0 1px rgba(0,0,0,.52)",
        "0 0 4px " + g.textGlow1,
        "0 0 8px " + g.textGlow2
      ].join(", ");
      borderL = Math.min(borderL + 5, 84);
      borderAlpha = g.borderAlpha;
    }

    return [
      "background:hsla(" + h + "," + s + "%," + l + "%," + a + ")",
      "border-color:hsla(" + h + "," + s + "%," + borderL + "%," + borderAlpha + ")",
      "color:#fff !important",
      "text-shadow:" + textShadow,
      "box-shadow:" + boxShadow
    ].join(";");
  }

  function getLowStyle(rr) {
    let h, s, l, a;

    if (rr < 4.0) {
      const t = clamp(rr / 4.0, 0, 1);
      h = 0 + (10 - 0) * t;
      s = 14 + (44 - 14) * t;
      l = 5 + (10 - 5) * t;
      a = 0.94 + (0.89 - 0.94) * t;
    } else if (rr < 6.0) {
      const t = clamp((rr - 4.0) / 2.0, 0, 1);
      h = 10 + (20 - 10) * t;
      s = 44 + (70 - 44) * t;
      l = 10 + (17 - 10) * t;
      a = 0.89 + (0.85 - 0.89) * t;
    } else {
      const t = clamp((rr - 6.0) / 1.0, 0, 1);
      h = 20 + (31 - 20) * t;
      s = 70 + (84 - 70) * t;
      l = 17 + (20.5 - 17) * t;
      a = 0.85 + (0.84 - 0.85) * t;
    }

    const borderL = clamp(l + 9, 15, 70);

    return [
      "background:hsla(" + h + "," + s + "%," + l + "%," + a + ")",
      "border-color:hsla(" + h + "," + Math.max(70, s) + "%," + borderL + "%,.22)",
      "color:#fff !important",
      "text-shadow:0 1px 0 rgba(0,0,0,.58), 0 0 1px rgba(0,0,0,.14)"
    ].join(";");
  }

  function getRatingStyle(rating) {
    const r = Number(rating);
    if (!Number.isFinite(r)) return "background:rgba(255,255,255,.03);";

    const rr = Math.round(r * 10) / 10;
    if (rr >= 7.0) return getRegularHighStyle(rr);
    return getLowStyle(rr);
  }

  function clearGridHover(grid) {
    if (!grid || !grid._jfHoverNodes || !grid._jfHoverNodes.length) {
      if (grid) {
        grid._jfHoverNodes = [];
        grid._jfHoverKey = "";
      }
      return;
    }

    grid._jfHoverNodes.forEach(function (el) {
      el.classList.remove("jf-ieg-hover-axis", "jf-ieg-hover-cross");
    });

    grid._jfHoverNodes = [];
    grid._jfHoverKey = "";
  }

  function setGridHover(grid, seasonIndex, episodeIndex) {
    const key = seasonIndex + "|" + episodeIndex;
    if (grid._jfHoverKey === key) return;

    clearGridHover(grid);

    const nodes = [];

    const seasonHeader = grid.querySelector('.jf-ieg-season[data-season-index="' + seasonIndex + '"]');
    const episodeHeader = grid.querySelector('.jf-ieg-episode[data-episode-index="' + episodeIndex + '"]');
    const cross = grid.querySelector('.jf-ieg-rating[data-season-index="' + seasonIndex + '"][data-episode-index="' + episodeIndex + '"]');

    if (seasonHeader) {
      seasonHeader.classList.add("jf-ieg-hover-axis");
      nodes.push(seasonHeader);
    }

    if (episodeHeader) {
      episodeHeader.classList.add("jf-ieg-hover-axis");
      nodes.push(episodeHeader);
    }

    if (cross) {
      cross.classList.add("jf-ieg-hover-cross");
      nodes.push(cross);
    }

    grid._jfHoverNodes = nodes;
    grid._jfHoverKey = key;
  }

  function bindGridHover(grid) {
    grid.addEventListener("mouseover", function (e) {
      const cell = e.target.closest(".jf-ieg-rating");
      if (!cell || !grid.contains(cell)) return;
      setGridHover(grid, cell.dataset.seasonIndex, cell.dataset.episodeIndex);
    });

    grid.addEventListener("mouseleave", function () {
      clearGridHover(grid);
    });

    grid.addEventListener("focusin", function (e) {
      const cell = e.target.closest(".jf-ieg-rating");
      if (!cell || !grid.contains(cell)) return;
      setGridHover(grid, cell.dataset.seasonIndex, cell.dataset.episodeIndex);
    });

    grid.addEventListener("focusout", function (e) {
      if (!grid.contains(e.relatedTarget)) clearGridHover(grid);
    });
  }

  function buildGridElement(seriesImdbId, data) {
    const seasonCount = data.length;
    const episodeNumbers = getEpisodeNumbers(data);
    const cols = "3.05rem repeat(" + seasonCount + ", 2.72rem)";

    const wrapper = document.createElement("div");
    wrapper.className = "jf-ieg-scroll";

    const grid = document.createElement("div");
    grid.className = "jf-ieg-grid";
    grid.style.gridTemplateColumns = cols;

    const corner = document.createElement("div");
    corner.className = "jf-ieg-cell jf-ieg-corner";
    corner.innerHTML = "&nbsp;";
    grid.appendChild(corner);

    for (let s = 0; s < seasonCount; s++) {
      const seasonCell = document.createElement("a");
      seasonCell.className = "jf-ieg-cell jf-ieg-season";
      seasonCell.textContent = "S" + (s + 1);
      seasonCell.href = buildSeasonLink(seriesImdbId, s + 1);
      seasonCell.title = "IMDb season " + (s + 1);
      seasonCell.dataset.seasonIndex = String(s + 1);
      decorateExternalLink(seasonCell);
      grid.appendChild(seasonCell);
    }

    for (const epNum of episodeNumbers) {
      const epCell = document.createElement("div");
      epCell.className = "jf-ieg-cell jf-ieg-episode";
      epCell.textContent = "E" + epNum;
      epCell.dataset.episodeIndex = String(epNum);
      grid.appendChild(epCell);

      for (let s = 0; s < seasonCount; s++) {
        const season = Array.isArray(data[s]) ? data[s] : [];
        const ep = season.find(function (x) { return Number(x && x.episode) === epNum; });

        if (!ep || !Number.isFinite(Number(ep.rating))) {
          const empty = document.createElement("div");
          empty.className = "jf-ieg-cell jf-ieg-empty";
          empty.dataset.seasonIndex = String(s + 1);
          empty.dataset.episodeIndex = String(epNum);
          grid.appendChild(empty);
          continue;
        }

        const a = document.createElement("a");
        a.className = "jf-ieg-cell jf-ieg-rating";
        a.textContent = Number(ep.rating).toFixed(1);
        a.style.cssText = getRatingStyle(ep.rating);

        const roundedRating = Math.round(Number(ep.rating) * 10) / 10;
        if (roundedRating >= 9.8) {
          a.classList.add("jf-ieg-rating-rare-gold");
        } else if (roundedRating >= 9.5) {
          a.classList.add("jf-ieg-rating-rare-green");
        }

        const seasonLabelNum = String(s + 1).padStart(2, "0");
        const episodeLabelNum = String(epNum).padStart(2, "0");
        a.title = "S" + seasonLabelNum + "E" + episodeLabelNum + " • IMDb";

        a.dataset.seasonIndex = String(s + 1);
        a.dataset.episodeIndex = String(epNum);
        a.href = ep.id
          ? "https://www.imdb.com/title/" + encodeURIComponent(ep.id) + "/"
          : buildSeasonLink(seriesImdbId, s + 1);

        decorateExternalLink(a);
        grid.appendChild(a);
      }
    }

    bindGridHover(grid);
    wrapper.appendChild(grid);
    return wrapper;
  }

  async function ensurePanelLoaded(root, imdbId) {
    if (root.dataset.loaded === "1" || root.dataset.loading === "1") return;

    const body = root.querySelector(".jf-ieg-body");
    if (!body) return;

    root.dataset.loading = "1";
    renderLoading(body);

    try {
      const data = await fetchDataset(imdbId);

      body.innerHTML = "";

      if (!Array.isArray(data) || !data.length) {
        renderFallback(body, imdbId);
        root.dataset.loaded = "1";
        return;
      }

      body.appendChild(buildGridElement(imdbId, data));
      root.dataset.loaded = "1";
    } catch (err) {
      log("ensurePanelLoaded failed", err);
      renderFallback(body, imdbId);
      root.dataset.loaded = "1";
    } finally {
      root.dataset.loading = "0";
    }
  }

  function createBlock(itemId, imdbId) {
    const root = document.createElement("section");
    root.setAttribute("data-jf-ieg-root", "1");
    root.dataset.itemId = itemId;
    root.dataset.imdbId = imdbId;
    root.dataset.loaded = "0";
    root.dataset.loading = "0";

    root.innerHTML = `
      <div class="jf-ieg-box">
        <button type="button" class="jf-ieg-toggle" aria-expanded="false">
          <span class="jf-ieg-toggle-label">${CFG.title}</span>
          <span class="material-icons jf-ieg-toggle-icon" aria-hidden="true">expand_more</span>
        </button>
        <div class="jf-ieg-panel" hidden>
          <div class="jf-ieg-body"></div>
        </div>
      </div>
    `;

    const toggle = root.querySelector(".jf-ieg-toggle");
    const panel = root.querySelector(".jf-ieg-panel");

    toggle.addEventListener("click", async function () {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const next = !expanded;

      toggle.setAttribute("aria-expanded", next ? "true" : "false");
      panel.hidden = !next;

      if (next) {
        await ensurePanelLoaded(root, imdbId);
      }
    });

    return root;
  }

  function ensureMounted(itemId, imdbId, target) {
    cleanupForeignBlocks(itemId);

    let existing = findCurrentBlock(itemId);

    if (existing && existing.dataset.imdbId !== imdbId) {
      existing.remove();
      existing = null;
    }

    if (!existing) {
      existing = createBlock(itemId, imdbId);
      target.parent.insertBefore(existing, target.before);
    } else if (existing.nextSibling !== target.before) {
      target.parent.insertBefore(existing, target.before);
    }
  }

  async function run() {
    const mySeq = ++runSeq;
    injectStyle();

    if (!isDetailsRoute()) {
      removeAllBlocks();
      return;
    }

    const itemId = getItemIdFromUrl();
    if (!itemId) return;

    const item = await fetchItem(itemId);
    if (mySeq !== runSeq) return;
    if (!item) return;

    if (item.Type !== "Series") {
      removeAllBlocks();
      return;
    }

    const imdbId = normalizeImdbId(getProviderId(item, "imdb"));
    if (!imdbId) {
      removeAllBlocks();
      return;
    }

    const existingVisibleBlock = findCurrentBlock(itemId);
    if (
      existingVisibleBlock &&
      existingVisibleBlock.dataset.imdbId === imdbId &&
      existingVisibleBlock.isConnected &&
      isElementVisible(existingVisibleBlock)
    ) {
      return;
    }

    const startedAt = Date.now();
    let target = null;
    let readyLink = null;

    while (Date.now() - startedAt < CFG.maxWaitMs) {
      if (mySeq !== runSeq) return;

      const nowItemId = getItemIdFromUrl();
      if (!nowItemId || nowItemId !== itemId) return;

      target = findInsertTarget();
      readyLink = findVisibleOfficialImdbLink(imdbId);

      if (target && readyLink) break;
      if (target && Date.now() - startedAt >= CFG.readyAnchorWaitMs) break;

      await sleep(120);
    }

    if (mySeq !== runSeq) return;
    if (!target) return;

    ensureMounted(itemId, imdbId, target);
  }

  window.addEventListener("hashchange", function () { scheduleRun(0); }, true);
  window.addEventListener("popstate", function () { scheduleRun(0); }, true);
  document.addEventListener("viewshow", function () { scheduleRun(0); }, true);
  document.addEventListener("viewbeforeshow", function () { scheduleRun(0); }, true);

  if (document.body) {
    new MutationObserver(function () {
      if (!isDetailsRoute()) return;

      const itemId = getItemIdFromUrl() || "";
      if (!itemId) return;

      const currentBlock = findCurrentBlock(itemId);
      if (!currentBlock || !currentBlock.isConnected || !isElementVisible(currentBlock)) {
        scheduleRun(CFG.reapplyDelayMs);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  setInterval(function () {
    if (!isDetailsRoute()) return;

    const itemId = getItemIdFromUrl() || "";
    const currentBlock = itemId ? findCurrentBlock(itemId) : null;

    if (itemId && itemId !== lastItemId) {
      lastItemId = itemId;
      scheduleRun(0);
      scheduleRun(350);
      scheduleRun(900);
      return;
    }

    if (itemId) {
      if (!currentBlock || !currentBlock.isConnected || !isElementVisible(currentBlock)) {
        scheduleRun(CFG.reapplyDelayMs);
      }
    }
  }, CFG.watchDogMs);

  scheduleRun(0);
})();