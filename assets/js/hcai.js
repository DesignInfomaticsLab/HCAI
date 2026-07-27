/* =========================================================================
   HCAI — site runtime
   빌드 도구 없이 동작합니다. content/*.json 을 읽어 화면을 그립니다.
   페이지에서 HCAI.init({ page: 'home' }) 형태로 호출합니다.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------- 상태 ------------------------------------------------------ */

  var LANGS = ["ko", "en"];
  var lang = (function () {
    try {
      var saved = localStorage.getItem("hcai-lang");
      if (LANGS.indexOf(saved) > -1) return saved;
    } catch (e) {}
    return (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  })();

  var data = {};      // 로드된 JSON 캐시
  var pageName = "";  // 현재 페이지 이름

  /* ---------- UI 문자열 -------------------------------------------------- */

  var UI = {
    skip:          { ko: "본문으로 건너뛰기", en: "Skip to content" },
    menu:          { ko: "메뉴", en: "Menu" },
    close:         { ko: "닫기", en: "Close" },
    all:           { ko: "전체", en: "All" },
    ongoing:       { ko: "진행중", en: "Ongoing" },
    completed:     { ko: "종료", en: "Completed" },
    research:      { ko: "연구 프로젝트", en: "Research Projects" },
    activities:    { ko: "활동 및 뉴스", en: "Activities & News" },
    people:        { ko: "구성원", en: "People" },
    publications:  { ko: "연구 성과", en: "Publications" },
    archive:       { ko: "아카이브", en: "Archive" },
    sitemap:       { ko: "바로가기", en: "Sitemap" },
    viewAll:       { ko: "전체 보기", en: "View all" },
    empty:         { ko: "아직 등록된 항목이 없습니다", en: "Nothing here yet" },
    notFound:      { ko: "요청한 항목을 찾을 수 없습니다", en: "The requested entry was not found" },
    contact:       { ko: "연락처", en: "Contact" },
    links:         { ko: "링크", en: "Links" },
    address:       { ko: "주소", en: "Address" },
    backTo:        { ko: "목록으로", en: "Back to index" },
    prev:          { ko: "이전", en: "Previous" },
    next:          { ko: "다음", en: "Next" },
    period:        { ko: "연구 기간", en: "Period" },
    funder:        { ko: "지원 기관", en: "Funded by" },
    kind:          { ko: "구분", en: "Type" },
    status:        { ko: "상태", en: "Status" },
    date:          { ko: "일자", en: "Date" },
    place:         { ko: "장소", en: "Venue" },
    category:      { ko: "분류", en: "Category" },
    topics:        { ko: "주제", en: "Topics" },
    related:       { ko: "관련 성과", en: "Related output" },
    searchPh:      { ko: "제목 · 키워드 · 연도로 검색", en: "Search by title, keyword, or year" },
    resultCount:   { ko: "건", en: "entries" },
    loading:       { ko: "불러오는 중…", en: "Loading…" },
    projectCount:  { ko: "연구 프로젝트", en: "Research projects" },
    memberCount:   { ko: "구성원", en: "Members" },
    since:         { ko: "설립", en: "Established" }
  };

  /* ---------- 유틸 ------------------------------------------------------- */

  /** 다국어 값에서 현재 언어 문자열을 꺼냅니다. 문자열이면 그대로 반환. */
  function t(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join("\n");
    return v[lang] || v.ko || v.en || "";
  }

  /** 다국어 배열(줄 배열)에서 현재 언어 배열을 꺼냅니다. */
  function tArr(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    var picked = v[lang] || v.ko || v.en || [];
    return Array.isArray(picked) ? picked : [picked];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** "2025-08-01" → "2025.08.01" / "2025-04" → "2025.04" */
  function fmtDate(s) { return s ? String(s).replace(/-/g, ".") : ""; }

  /** 시작–종료 기간 문자열 */
  function fmtPeriod(start, end) {
    if (!start && !end) return "";
    if (!end) return fmtDate(start) + " –";
    if (!start) return "– " + fmtDate(end);
    return fmtDate(start) + " – " + fmtDate(end);
  }

  function year(s) { return s ? String(s).slice(0, 4) : ""; }

  /** 인물 사진이 없을 때 쓸 이니셜 */
  function initials(name) {
    var ko = (name && name.ko) || "";
    var en = (name && name.en) || "";
    if (/[가-힣]/.test(ko)) return ko.length > 2 ? ko.slice(1) : ko;
    var parts = (en || ko).trim().split(/\s+/);
    return parts.map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
  }

  /* ---------- 미니 마크다운 --------------------------------------------
     줄 배열을 HTML 로 변환합니다. 지원 문법:
       '## 제목'            → <h3>
       '- 항목'             → <ul><li>
       '> 인용'             → <blockquote>
       '![캡션](경로)'      → <figure><img><figcaption>
       그 외                → <p>
     인라인: **굵게**, [링크](주소)
     -------------------------------------------------------------------- */

  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderBody(lines) {
    var out = [], list = null;

    function flush() {
      if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; }
    }

    tArr(lines).forEach(function (raw) {
      var line = String(raw == null ? "" : raw).trim();
      if (!line) { flush(); return; }

      var img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) {
        flush();
        out.push(
          '<figure><img src="' + esc(img[2]) + '" alt="' + esc(img[1]) + '" loading="lazy">' +
          (img[1] ? "<figcaption>" + inline(img[1]) + "</figcaption>" : "") +
          "</figure>"
        );
        return;
      }
      if (line.indexOf("## ") === 0) { flush(); out.push("<h3>" + inline(line.slice(3)) + "</h3>"); return; }
      if (line.indexOf("> ")  === 0) { flush(); out.push("<blockquote>" + inline(line.slice(2)) + "</blockquote>"); return; }
      if (line.indexOf("- ")  === 0) { (list = list || []).push("<li>" + inline(line.slice(2)) + "</li>"); return; }

      flush();
      out.push("<p>" + inline(line) + "</p>");
    });

    flush();
    return out.join("");
  }

  /* ---------- 데이터 로딩 ------------------------------------------------ */

  function load(names) {
    return Promise.all(names.map(function (n) {
      if (data[n]) return Promise.resolve(data[n]);
      return fetch("content/" + n + ".json", { cache: "no-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error(n + ".json (" + r.status + ")");
          return r.json();
        })
        .then(function (j) { data[n] = j; return j; });
    }));
  }

  /* ---------- 공통 셸: 헤더 / 푸터 --------------------------------------- */

  function renderHeader() {
    var site = data.site;
    var here = (location.pathname.split("/").pop() || "index.html");

    var navHtml = site.nav.map(function (item) {
      var current = item.href === here ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + esc(item.href) + '"' + current + '>' + esc(t(item.label)) + "</a>";
    }).join("");

    var langHtml = LANGS.map(function (L) {
      return '<button type="button" data-lang="' + L + '" aria-pressed="' + (L === lang) + '">' +
             L.toUpperCase() + "</button>";
    }).join("");

    var host = el("#site-header");
    if (!host) return;

    host.innerHTML =
      '<a class="skip-link" href="#main">' + esc(t(UI.skip)) + "</a>" +
      '<div class="wrap header__inner">' +
        '<a class="brand" href="index.html">' +
          '<span class="brand__mark">HCAI</span>' +
          '<span class="brand__name">' + esc(t(site.name)) + "</span>" +
        "</a>" +
        '<button class="navtoggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
          "<span>" + esc(t(UI.menu)) + "</span>" +
        "</button>" +
        '<nav class="nav" id="site-nav" aria-label="Main">' + navHtml +
          '<div class="langtoggle" role="group" aria-label="Language">' + langHtml + "</div>" +
        "</nav>" +
      "</div>";

    // 언어 전환
    els("[data-lang]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });

    // 모바일 메뉴
    var toggle = el(".navtoggle", host), nav = el("#site-nav", host);
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
        el("span", toggle).textContent = t(open ? UI.menu : UI.close);
      });
    }
  }

  function renderFooter() {
    var site = data.site, c = site.contact || {};
    var host = el("#site-footer");
    if (!host) return;

    var navHtml = site.nav.map(function (item) {
      return "<li><a href=" + '"' + esc(item.href) + '"' + ">" + esc(t(item.label)) + "</a></li>";
    }).join("");

    var linksHtml = (site.links || []).map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + "</a></li>";
    }).join("");

    host.innerHTML =
      '<div class="wrap">' +
        '<div class="footer__grid">' +
          "<div>" +
            '<p class="footer__title">' + esc(t(site.name)) + "</p>" +
            '<p class="footer__note">' + esc(t(site.footerNote)) + "</p>" +
          "</div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.sitemap)) + "</h4><ul>" + navHtml + "</ul></div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.contact)) + "</h4><ul>" +
            (c.email ? '<li><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></li>" : "") +
            (c.phone ? '<li><a href="tel:' + esc(c.phone.replace(/[^0-9+]/g, "")) + '">' + esc(c.phone) + "</a></li>" : "") +
          "</ul></div>" +
          '<div class="footer__col"><h4>' + esc(t(UI.address)) + "</h4>" +
            "<address>" + esc(t(c.address)) + "</address>" +
            (linksHtml ? "<ul style=\"margin-top:1rem\">" + linksHtml + "</ul>" : "") +
          "</div>" +
        "</div>" +
        '<div class="footer__bottom">' +
          "<span>© " + new Date().getFullYear() + " " + esc(t(site.name)) + "</span>" +
          "<span>" + esc(t(site.university)) + "</span>" +
        "</div>" +
      "</div>";
  }

  function setLang(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem("hcai-lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    render();
  }

  /* ---------- 조각(partial) 렌더러 --------------------------------------- */

  /** 아카이브 index 행 */
  function rowHtml(o) {
    return (
      '<a class="index__row" href="' + esc(o.href) + '">' +
        '<span class="index__date">' + esc(o.date) + "</span>" +
        '<span class="index__body">' +
          '<span class="index__title">' + esc(o.title) + "</span>" +
          (o.desc ? '<span class="index__desc">' + esc(o.desc) + "</span>" : "") +
        "</span>" +
        '<span class="index__meta">' + (o.meta || "") + "</span>" +
        '<span class="index__arrow" aria-hidden="true">→</span>' +
      "</a>"
    );
  }

  function mediaHtml(src, alt, label) {
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">';
    return '<div class="ph">' + esc(label || "HCAI") + "</div>";
  }

  function projectRow(p) {
    var badge = p.status === "completed"
      ? '<span class="badge badge--done">' + esc(t(UI.completed)) + "</span>"
      : '<span class="badge">' + esc(t(UI.ongoing)) + "</span>";
    return rowHtml({
      href: "entry.html?type=project&id=" + encodeURIComponent(p.id),
      date: fmtPeriod(p.start, p.end),
      title: t(p.title),
      desc: t(p.summary),
      meta: badge + ' <span class="index__note">' + esc(t(p.funder)) + "</span>"
    });
  }

  function activityRow(a) {
    var cat = catLabel(a.category);
    return rowHtml({
      href: "entry.html?type=activity&id=" + encodeURIComponent(a.id),
      date: fmtDate(a.date),
      title: t(a.title),
      desc: t(a.summary),
      meta: '<span class="badge">' + esc(cat) + "</span>" +
            (a.place ? ' <span class="index__note">' + esc(t(a.place)) + "</span>" : "")
    });
  }

  function catLabel(id) {
    var found = ((data.activities && data.activities.categories) || []).filter(function (c) { return c.id === id; })[0];
    return found ? t(found.label) : id;
  }

  function pubTypeLabel(id) {
    var found = ((data.publications && data.publications.types) || []).filter(function (c) { return c.id === id; })[0];
    return found ? t(found.label) : id;
  }

  function personCard(m, lead) {
    var photo = m.photo
      ? '<img src="' + esc(m.photo) + '" alt="' + esc(t(m.name)) + '" loading="lazy">'
      : '<div class="person__initials">' + esc(initials(m.name)) + "</div>";

    var links = (m.links || []).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + " ↗</a>";
    });
    if (m.email) links.unshift('<a href="mailto:' + esc(m.email) + '">Email</a>');

    var tags = (m.keywords || []).length
      ? '<div class="tags">' + m.keywords.map(function (k) { return '<span class="tag">' + esc(k) + "</span>"; }).join("") + "</div>"
      : "";

    var other = lang === "ko" ? (m.name.en || "") : (m.name.ko || "");

    return (
      '<div class="person' + (lead ? " person--lead" : "") + '">' +
        '<div class="person__photo">' + photo + "</div>" +
        '<div class="stack stack--sm">' +
          '<p class="person__name">' + esc(t(m.name)) +
            (other ? "<span>" + esc(other) + "</span>" : "") + "</p>" +
          (t(m.role) ? '<p class="person__role">' + esc(t(m.role)) + "</p>" : "") +
          (t(m.affiliation) ? '<p class="person__aff">' + esc(t(m.affiliation)) + "</p>" : "") +
          tags +
          (links.length ? '<p class="person__links">' + links.join("") + "</p>" : "") +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 페이지: 홈 -------------------------------------------------- */

  function renderHome() {
    var site = data.site;
    var projects = data.projects.items || [];
    var acts = (data.activities.items || []);
    var members = (data.people.members || []);

    el("#hero").innerHTML =
      '<div class="wrap">' +
        '<p class="hero__eyebrow">' + esc(t(site.hero.eyebrow)) + "</p>" +
        '<h1 class="hero__headline">' + t(site.hero.headline) + "</h1>" +
        '<p class="hero__sub">' + esc(t(site.hero.sub)) + "</p>" +
        '<div class="hero__meta">' +
          "<div><b>" + projects.length + "</b>" + esc(t(UI.projectCount)) + "</div>" +
          "<div><b>" + acts.length + "</b>" + esc(t(UI.activities)) + "</div>" +
          "<div><b>" + members.length + "</b>" + esc(t(UI.memberCount)) + "</div>" +
          "<div><b>2025</b>" + esc(t(UI.since)) + "</div>" +
        "</div>" +
      "</div>";

    // 연구
    el("#home-research").innerHTML =
      '<div class="wrap">' +
        '<div class="sechead">' +
          '<h2 class="sechead__title"><small>Research</small>' + esc(t(UI.research)) + "</h2>" +
          '<a class="sechead__aside backlink" href="research.html">' + esc(t(UI.viewAll)) + " →</a>" +
        "</div>" +
        (projects.length
          ? '<div class="index">' + projects.slice(0, 4).map(projectRow).join("") + "</div>"
          : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
      "</div>";

    // 활동
    el("#home-activities").innerHTML =
      '<div class="wrap">' +
        '<div class="sechead">' +
          '<h2 class="sechead__title"><small>Activities</small>' + esc(t(UI.activities)) + "</h2>" +
          '<a class="sechead__aside backlink" href="activities.html">' + esc(t(UI.viewAll)) + " →</a>" +
        "</div>" +
        (acts.length
          ? '<div class="index">' + acts.slice(0, 5).map(activityRow).join("") + "</div>"
          : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
      "</div>";

    // 구성원 미리보기
    var preview = members.filter(function (m) { return m.group !== "alumni"; }).slice(0, 6);
    el("#home-people").innerHTML =
      '<div class="wrap">' +
        '<div class="sechead">' +
          '<h2 class="sechead__title"><small>People</small>' + esc(t(UI.people)) + "</h2>" +
          '<a class="sechead__aside backlink" href="people.html">' + esc(t(UI.viewAll)) + " →</a>" +
        "</div>" +
        '<div class="grid grid--4">' + preview.map(function (m) { return personCard(m); }).join("") + "</div>" +
      "</div>";
  }

  /* ---------- 페이지: 소개 ----------------------------------------------- */

  function renderAbout() {
    var site = data.site, about = data.about, c = site.contact || {};

    el("#about-intro").innerHTML =
      '<div class="wrap split">' +
        '<p class="eyebrow">' + (lang === "ko" ? "센터 소개" : "About") + "</p>" +
        '<div class="prose">' + renderBody(about.intro) + "</div>" +
      "</div>";

    var scopeHtml = about.scope.map(function (s) {
      return (
        '<div class="split" style="padding-block:clamp(2rem,4vw,3.25rem);border-top:1px solid var(--line)">' +
          "<div>" +
            '<p class="eyebrow" style="color:var(--accent)">' + esc(s.no) + "</p>" +
            '<h3 style="font-size:var(--fs-h3);margin-top:.75rem">' + esc(t(s.title)) + "</h3>" +
            '<p class="dim" style="font-size:var(--fs-sm);margin-top:.5rem">' + esc(t(s.subtitle)) + "</p>" +
          "</div>" +
          '<div class="prose" style="max-width:none">' + renderBody(tArr(s.items).map(function (i) { return "- " + i; })) + "</div>" +
        "</div>"
      );
    }).join("");

    el("#about-scope").innerHTML =
      '<div class="wrap">' +
        '<div class="sechead"><h2 class="sechead__title"><small>Scope</small>' +
          (lang === "ko" ? "연구 범위" : "Research Scope") + "</h2></div>" +
        scopeHtml +
      "</div>";

    el("#about-contact").innerHTML =
      '<div class="wrap split">' +
        '<p class="eyebrow">' + esc(t(UI.contact)) + "</p>" +
        '<div class="detail__facts" style="margin-top:0">' +
          '<div class="detail__fact"><dt>' + esc(t(UI.address)) + "</dt><dd style=\"white-space:pre-line\">" + esc(t(c.address)) + "</dd></div>" +
          '<div class="detail__fact"><dt>Tel</dt><dd>' + esc(c.phone) + "</dd></div>" +
          '<div class="detail__fact"><dt>Email</dt><dd><a href="mailto:' + esc(c.email) + '" style="border-bottom:1px solid var(--line-strong)">' + esc(c.email) + "</a></dd></div>" +
        "</div>" +
      "</div>";
  }

  /* ---------- 페이지: 연구 ----------------------------------------------- */

  var filterState = { research: "all", activities: "all", archive: "all" };

  function renderResearch() {
    var items = data.projects.items || [];
    var f = filterState.research;
    var shown = f === "all" ? items : items.filter(function (p) { return (p.status || "ongoing") === f; });

    var chips = [
      { id: "all", label: t(UI.all) },
      { id: "ongoing", label: t(UI.ongoing) },
      { id: "completed", label: t(UI.completed) }
    ].map(function (c) {
      return '<button class="chip" type="button" data-filter="research" data-value="' + c.id +
             '" aria-pressed="' + (f === c.id) + '">' + esc(c.label) + "</button>";
    }).join("");

    el("#research-list").innerHTML =
      '<div class="wrap">' +
        '<div class="filters">' + chips + "</div>" +
        (shown.length
          ? '<div class="index">' + shown.map(projectRow).join("") + "</div>"
          : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
        '<p class="sechead__aside" style="margin-top:1.5rem">' + shown.length + " " + esc(t(UI.resultCount)) + "</p>" +
      "</div>";

    bindFilters();
  }

  /* ---------- 페이지: 활동 ----------------------------------------------- */

  function renderActivities() {
    var items = data.activities.items || [];
    var cats = data.activities.categories || [];
    var f = filterState.activities;
    var shown = f === "all" ? items : items.filter(function (a) { return a.category === f; });

    var chipDefs = [{ id: "all", label: t(UI.all) }].concat(cats.map(function (c) {
      return { id: c.id, label: t(c.label) };
    }));

    var chips = chipDefs.map(function (c) {
      var n = c.id === "all" ? items.length : items.filter(function (a) { return a.category === c.id; }).length;
      return '<button class="chip" type="button" data-filter="activities" data-value="' + c.id +
             '" aria-pressed="' + (f === c.id) + '">' + esc(c.label) + " " + n + "</button>";
    }).join("");

    el("#activities-list").innerHTML =
      '<div class="wrap">' +
        '<div class="filters">' + chips + "</div>" +
        (shown.length
          ? '<div class="index">' + shown.map(activityRow).join("") + "</div>"
          : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
        '<p class="sechead__aside" style="margin-top:1.5rem">' + shown.length + " " + esc(t(UI.resultCount)) + "</p>" +
      "</div>";

    bindFilters();
  }

  function bindFilters() {
    els("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterState[btn.getAttribute("data-filter")] = btn.getAttribute("data-value");
        render();
      });
    });
  }

  /* ---------- 페이지: 구성원 --------------------------------------------- */

  function renderPeople() {
    var groups = data.people.groups || [];
    var members = data.people.members || [];

    var html = groups.map(function (g) {
      var list = members.filter(function (m) { return m.group === g.id; });
      if (!list.length) return "";

      var isLead = g.id === "director" && list.length === 1;
      return (
        '<section class="people__group">' +
          '<div class="sechead">' +
            '<h2 class="sechead__title" style="font-size:var(--fs-h3)">' + esc(t(g.label)) + "</h2>" +
            '<span class="sechead__aside">' + list.length + "</span>" +
          "</div>" +
          (isLead
            ? personCard(list[0], true)
            : '<div class="grid grid--4">' + list.map(function (m) { return personCard(m); }).join("") + "</div>") +
        "</section>"
      );
    }).join("");

    el("#people-list").innerHTML = '<div class="wrap">' + (html || '<p class="empty">' + esc(t(UI.empty)) + "</p>") + "</div>";
  }

  /* ---------- 페이지: 통합 아카이브 --------------------------------------- */

  function allEntries() {
    var out = [];

    // badge = 짧은 분류 라벨, note = 지원기관·장소 같은 부가 정보(평문)
    (data.projects.items || []).forEach(function (p) {
      out.push({
        kind: "project",
        sort: p.start || "",
        date: fmtPeriod(p.start, p.end),
        title: t(p.title),
        desc: t(p.summary),
        badge: t(p.status === "completed" ? UI.completed : UI.ongoing),
        note: t(p.funder),
        tags: (p.tags || []).join(" "),
        href: "entry.html?type=project&id=" + encodeURIComponent(p.id)
      });
    });

    (data.activities.items || []).forEach(function (a) {
      out.push({
        kind: "activity",
        sort: a.date || "",
        date: fmtDate(a.date),
        title: t(a.title),
        desc: t(a.summary),
        badge: catLabel(a.category),
        note: t(a.place),
        tags: a.category,
        href: "entry.html?type=activity&id=" + encodeURIComponent(a.id)
      });
    });

    (data.publications.items || []).forEach(function (p) {
      out.push({
        kind: "publication",
        sort: p.year || "",
        date: p.year || "",
        title: t(p.title),
        desc: [p.authors, p.venue].filter(Boolean).join(" · "),
        badge: pubTypeLabel(p.type),
        note: "",
        tags: p.type,
        href: p.url || p.doi || ""
      });
    });

    return out.sort(function (a, b) { return String(b.sort).localeCompare(String(a.sort)); });
  }

  var archiveQuery = "";

  function renderArchive() {
    var entries = allEntries();
    var f = filterState.archive;
    var q = archiveQuery.trim().toLowerCase();

    var shown = entries.filter(function (e) {
      if (f !== "all" && e.kind !== f) return false;
      if (!q) return true;
      return (e.title + " " + e.desc + " " + e.badge + " " + e.note + " " + e.tags + " " + e.date)
        .toLowerCase().indexOf(q) > -1;
    });

    var kinds = [
      { id: "all", label: t(UI.all) },
      { id: "project", label: t(UI.research) },
      { id: "activity", label: t(UI.activities) },
      { id: "publication", label: t(UI.publications) }
    ];

    var chips = kinds.map(function (c) {
      var n = c.id === "all" ? entries.length : entries.filter(function (e) { return e.kind === c.id; }).length;
      return '<button class="chip" type="button" data-filter="archive" data-value="' + c.id +
             '" aria-pressed="' + (f === c.id) + '">' + esc(c.label) + " " + n + "</button>";
    }).join("");

    // 연도별 묶음
    var byYear = {};
    shown.forEach(function (e) {
      var y = year(e.sort) || "—";
      (byYear[y] = byYear[y] || []).push(e);
    });
    var years = Object.keys(byYear).sort().reverse();

    var listHtml = years.map(function (y) {
      return (
        '<section style="margin-top:clamp(2rem,4vw,3.5rem)">' +
          '<div class="sechead" style="margin-bottom:0;border-bottom-color:var(--line)">' +
            '<h2 class="sechead__title" style="font-family:var(--font-mono);font-size:1.25rem;letter-spacing:.08em">' + esc(y) + "</h2>" +
            '<span class="sechead__aside">' + byYear[y].length + "</span>" +
          "</div>" +
          '<div class="index" style="border-top:0">' +
            byYear[y].map(function (e) {
              return rowHtml({
                href: e.href || "#",
                date: e.date,
                title: e.title,
                desc: e.desc,
                meta: '<span class="badge' + (e.kind === "publication" ? " badge--done" : "") + '">' + esc(e.badge) + "</span>" +
                      (e.note ? ' <span class="index__note">' + esc(e.note) + "</span>" : "")
              });
            }).join("") +
          "</div>" +
        "</section>"
      );
    }).join("");

    el("#archive-list").innerHTML =
      '<div class="wrap">' +
        '<div class="filters" style="align-items:center;justify-content:space-between">' +
          "<div class=\"filters\" style=\"padding-bottom:0\">" + chips + "</div>" +
          '<input id="archive-q" class="chip" type="search" style="min-width:min(100%,22rem);border-radius:999px;background:transparent;color:var(--fg)" ' +
            'placeholder="' + esc(t(UI.searchPh)) + '" value="' + esc(archiveQuery) + '">' +
        "</div>" +
        (shown.length ? listHtml : '<p class="empty">' + esc(t(UI.empty)) + "</p>") +
      "</div>";

    bindFilters();

    var input = el("#archive-q");
    if (input) {
      input.addEventListener("input", function () {
        archiveQuery = input.value;
        var pos = input.selectionStart;
        renderArchive();
        var next = el("#archive-q");
        if (next) { next.focus(); try { next.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
  }

  /* ---------- 페이지: 상세 ----------------------------------------------- */

  function qs(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }

  function renderEntry() {
    var type = qs("type"), id = qs("id");
    var host = el("#entry");

    var listHref = type === "activity" ? "activities.html" : "research.html";
    var items = type === "activity" ? (data.activities.items || []) : (data.projects.items || []);
    var idx = -1;
    items.forEach(function (it, i) { if (it.id === id) idx = i; });

    if (idx < 0) {
      host.innerHTML =
        '<div class="wrap section">' +
          '<p class="empty">' + esc(t(UI.notFound)) + "</p>" +
          '<p style="text-align:center"><a class="backlink" href="' + listHref + '">← ' + esc(t(UI.backTo)) + "</a></p>" +
        "</div>";
      return;
    }

    var it = items[idx];
    document.title = t(it.title) + " — HCAI";

    var facts = [];
    if (type === "activity") {
      facts.push([t(UI.date), fmtDate(it.date)]);
      if (t(it.place)) facts.push([t(UI.place), t(it.place)]);
      facts.push([t(UI.category), catLabel(it.category)]);
    } else {
      facts.push([t(UI.period), fmtPeriod(it.start, it.end)]);
      if (t(it.funder)) facts.push([t(UI.funder), t(it.funder)]);
      if (t(it.kind)) facts.push([t(UI.kind), t(it.kind)]);
      facts.push([t(UI.status), t(it.status === "completed" ? UI.completed : UI.ongoing)]);
    }

    var factsHtml = '<dl class="detail__facts">' + facts.map(function (f) {
      return '<div class="detail__fact"><dt>' + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>";
    }).join("") + "</dl>";

    var tagsHtml = (it.tags || []).length
      ? '<div class="tags" style="margin-top:2rem">' +
        it.tags.map(function (k) { return '<span class="tag">' + esc(k) + "</span>"; }).join("") + "</div>"
      : "";

    var rolesHtml = (it.roles || []).length
      ? '<div class="section--tight"><div class="rolelist">' + it.roles.map(function (r) {
          return '<div><p class="rolelist__label">' + esc(t(r.label)) + "</p>" +
            r.people.map(function (p) {
              return '<div class="rolelist__item"><b>' + esc(t(p.name)) + "</b><span>" + esc(t(p.org)) + "</span></div>";
            }).join("") + "</div>";
        }).join("") + "</div></div>"
      : "";

    var galleryHtml = (it.gallery || []).length
      ? '<div class="section--tight"><div class="gallery">' + it.gallery.map(function (g) {
          return '<img src="' + esc(typeof g === "string" ? g : g.src) + '" alt="' + esc(typeof g === "string" ? "" : t(g.caption)) + '" loading="lazy">';
        }).join("") + "</div></div>"
      : "";

    var linksHtml = (it.links || []).length
      ? '<div class="section--tight"><p class="rolelist__label">' + esc(t(UI.links)) + "</p>" +
        it.links.map(function (l) {
          return '<p><a class="backlink" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t(l.label)) + " ↗</a></p>";
        }).join("") + "</div>"
      : "";

    var pubs = (data.publications.items || []).filter(function (p) { return p.project === it.id; });
    var pubsHtml = pubs.length
      ? '<div class="section--tight"><p class="rolelist__label">' + esc(t(UI.related)) + "</p>" +
        '<div class="index">' + pubs.map(function (p) {
          return rowHtml({
            href: p.url || p.doi || "#",
            date: p.year || "",
            title: t(p.title),
            desc: [p.authors, p.venue].filter(Boolean).join(" · "),
            meta: '<span class="badge badge--done">' + esc(pubTypeLabel(p.type)) + "</span>"
          });
        }).join("") + "</div></div>"
      : "";

    var prev = items[idx - 1], next = items[idx + 1];
    var pagerHtml =
      '<div class="wrap"><div class="pager">' +
        (prev ? '<a href="entry.html?type=' + esc(type) + "&id=" + encodeURIComponent(prev.id) + '"><span>' + esc(t(UI.prev)) + "</span><b>" + esc(t(prev.title)) + "</b></a>" : "<span></span>") +
        (next ? '<a style="text-align:right" href="entry.html?type=' + esc(type) + "&id=" + encodeURIComponent(next.id) + '"><span>' + esc(t(UI.next)) + "</span><b>" + esc(t(next.title)) + "</b></a>" : "<span></span>") +
      "</div></div>";

    var coverHtml = it.cover
      ? '<div class="wrap section--tight"><img src="' + esc(it.cover) + '" alt="" style="width:100%;border:1px solid var(--line)"></div>'
      : "";

    host.innerHTML =
      '<div class="wrap detail__head">' +
        '<a class="backlink" href="' + listHref + '">← ' + esc(t(UI.backTo)) + "</a>" +
        '<h1 class="detail__title">' + esc(t(it.title)) + "</h1>" +
        (t(it.summary) ? '<p class="hero__sub" style="margin-top:1.25rem">' + esc(t(it.summary)) + "</p>" : "") +
        factsHtml + tagsHtml +
      "</div>" +
      coverHtml +
      '<div class="wrap section">' +
        '<div class="prose">' + renderBody(it.body) + "</div>" +
        rolesHtml + galleryHtml + pubsHtml + linksHtml +
      "</div>" +
      pagerHtml;
  }

  /* ---------- reveal ------------------------------------------------------ */

  function observeReveal() {
    var targets = els(".reveal");
    if (!targets.length || !("IntersectionObserver" in window)) {
      targets.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    targets.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 렌더 진입점 ------------------------------------------------- */

  var PAGES = {
    home: renderHome,
    about: renderAbout,
    research: renderResearch,
    activities: renderActivities,
    people: renderPeople,
    archive: renderArchive,
    entry: renderEntry
  };

  function render() {
    renderHeader();
    renderFooter();
    if (PAGES[pageName]) PAGES[pageName]();
    els("[data-i18n]").forEach(function (n) {
      var key = n.getAttribute("data-i18n");
      if (UI[key]) n.textContent = t(UI[key]);
    });
    els("[data-i18n-ko]").forEach(function (n) {
      n.textContent = n.getAttribute("data-i18n-" + lang) || n.getAttribute("data-i18n-ko");
    });
    observeReveal();
  }

  var NEEDS = {
    home:       ["site", "projects", "activities", "people"],
    about:      ["site", "about"],
    research:   ["site", "projects"],
    activities: ["site", "activities"],
    people:     ["site", "people"],
    archive:    ["site", "projects", "activities", "publications"],
    entry:      ["site", "projects", "activities", "publications"]
  };

  function init(opts) {
    pageName = (opts && opts.page) || "home";
    document.documentElement.lang = lang;

    load(NEEDS[pageName] || ["site"])
      .then(render)
      .catch(function (err) {
        console.error(err);
        var main = el("#main") || document.body;
        main.innerHTML =
          '<div class="wrap section"><p class="empty">' +
          "콘텐츠를 불러오지 못했습니다 / Failed to load content<br><br>" +
          esc(err.message) +
          "<br><br>로컬에서 열었다면 파일을 더블클릭하지 말고 미리보기 서버를 실행하세요:<br>" +
          "<code>python -m http.server 5173</code></p></div>";
      });
  }

  window.HCAI = { init: init, t: t, setLang: setLang };
})();
