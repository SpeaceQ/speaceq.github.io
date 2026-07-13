/* ===================================================================
   THE MARGINALIA — router, markdown loader, renderer
   Reads essays from assets/posts.json and assets/posts/*.md.
   No external URLs, no embedded posts.
   =================================================================== */

(function () {
  "use strict";

  const POSTS_JSON = "assets/posts.json";
  const POSTS_DIR  = "assets/posts/";

  const views = {
    home:    document.getElementById("view-home"),
    post:    document.getElementById("view-post"),
    about:   document.getElementById("view-about"),
    loading: document.getElementById("view-loading"),
    error:   document.getElementById("view-error"),
  };

  const progressBar = document.getElementById("progressBar");
  const backTopBtn  = document.getElementById("backTop");
  const searchInput = document.getElementById("searchInput");

  let posts = [];
  let filteredPosts = [];

  /* ---------- helpers ---------- */
  function show(view) {
    Object.values(views).forEach(v => v.hidden = true);
    if (view) view.hidden = false;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return { m: months[d.getMonth()], d: d.getDate(), y: d.getFullYear() };
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  /* ---------- markdown renderer ---------- */
  function renderMarkdown(md) {
    if (window.Markdown && window.Markdown.render) {
      return window.Markdown.render(md);
    }
    // last-resort fallback
    return "<p>" + escapeHtml(md).replace(/\n\n/g, "</p><p>") + "</p>";
  }

  /* ---------- date / header meta ---------- */
  function initHeaderMeta() {
    const now = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById("todayDate").textContent =
      months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
    document.getElementById("copyYear").textContent = now.getFullYear();
  }

  /* ---------- home view ---------- */
  function renderHome() {
    if (!posts.length) { show(views.error); return; }
    const listToRender = filteredPosts.length ? filteredPosts : posts;
    const featured = listToRender[0];
    const rest = listToRender.slice(1);

    const slot = document.getElementById("featuredSlot");
    const fdate = fmtDate(featured.date);
    slot.innerHTML = `
      <div class="featured-visual">
        <span class="folio-num">FOLIO №01</span>
        <span class="glyph">${escapeHtml(featured.glyph || "&")}</span>
      </div>
      <div class="featured-text">
        <span class="kicker">${escapeHtml(featured.category)}</span>
        <h1>${formatTitle(featured.title)}</h1>
        <p class="dek">${escapeHtml(featured.excerpt)}</p>
        <div class="featured-meta">
          <span class="by">by <strong>${escapeHtml(featured.author)}</strong></span>
          <span class="mono">·</span>
          <span class="mono">${fdate.m} ${fdate.d}, ${fdate.y}</span>
          <span class="mono">·</span>
          <span class="mono">${featured.readTime} min read</span>
        </div>
        <a href="#/${featured.slug}" class="read-link">Read the essay <span class="arrow">→</span></a>
      </div>
    `;

    const list = document.getElementById("postList");
    list.classList.add("stagger");
    list.innerHTML = rest.map(p => {
      const d = fmtDate(p.date);
      return `
        <li class="post-item" data-slug="${p.slug}">
          <a href="#/${p.slug}" style="display:contents;">
            <span class="pi-date">${d.m} ${d.d}<span class="yr">${d.y}</span></span>
            <div class="pi-body">
              <span class="pi-cat">${escapeHtml(p.category)}</span>
              <h3 class="pi-title">${formatTitle(p.title)}</h3>
              <p class="pi-excerpt">${escapeHtml(p.excerpt)}</p>
            </div>
            <span class="pi-arrow">→</span>
          </a>
        </li>
      `;
    }).join("");

    show(views.home);
    setActiveNav("home");
    window.scrollTo(0, 0);
    updateProgress(0);
  }

  function formatTitle(title) {
    return escapeHtml(title).replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  /* ---------- post view ---------- */
  async function renderPost(slug) {
    const post = posts.find(p => p.slug === slug);
    if (!post) { showError(); return; }

    show(views.loading);

    let md = "";
    try {
      const res = await fetch(POSTS_DIR + post.file);
      if (!res.ok) throw new Error("fetch failed");
      md = await res.text();
    } catch (e) {
      showError();
      return;
    }

    const html = renderMarkdown(md);

    const idx = posts.indexOf(post);
    const prev = posts[idx + 1];
    const next = posts[idx - 1];
    const d = fmtDate(post.date);

    const view = views.post;
    view.innerHTML = `
      <div class="article-head">
        <span class="article-cat">${escapeHtml(post.category)}</span>
        <h1 class="article-title">${formatTitle(post.title)}</h1>
        <p class="article-dek">${escapeHtml(post.excerpt)}</p>
        <div class="article-byline">
          <span>by <strong>${escapeHtml(post.author)}</strong></span>
          <span class="dot"></span>
          <span>${d.m} ${d.d}, ${d.y}</span>
          <span class="dot"></span>
          <span>${post.readTime} min read</span>
        </div>
      </div>
      <div class="article-rule"><span>§</span></div>
      <div class="prose">${html}</div>
      <footer class="article-foot">
        <div class="tags">
          ${post.tags.map(t => `<a href="#/" class="tag">${escapeHtml(t)}</a>`).join("")}
        </div>
        <nav class="post-nav">
          ${prev ? `<a href="#/${prev.slug}" class="prev">
            <span class="pn-label">← Previously</span>
            <span class="pn-title">${formatTitle(prev.title)}</span>
          </a>` : `<span></span>`}
          ${next ? `<a href="#/${next.slug}" class="next">
            <span class="pn-label">Next →</span>
            <span class="pn-title">${formatTitle(next.title)}</span>
          </a>` : `<span></span>`}
        </nav>
      </footer>
    `;

    show(view);
    setActiveNav(null);
    window.scrollTo(0, 0);
    updateProgress(0);
    view.querySelector(".prose")?.classList.add("stagger");
  }

  /* ---------- about view ---------- */
  function renderAbout() {
    const view = views.about;
    view.innerHTML = `
      <div class="about-head">
        <h1>About the <em>Marginalia</em></h1>
      </div>
      <div class="prose">
        <p>The Marginalia is a small, slow journal about the craft of design — the things written in the margins, the decisions nobody explains, the letterforms we walk past every day without looking.</p>
        <p>It is published when there is something worth saying, and not before. There are no schedules, no growth funnels, no engagement metrics chasing your attention. Only essays, set carefully, meant to be read at a desk with good light.</p>
        <h2>What you'll find here</h2>
        <p>Notes on typography and the history of letters. Observations from the studio. Small arguments about whitespace, color, and the difference between something that is finished and something that is merely done.</p>
        <blockquote><p>The margin is where the real reading happens.</p></blockquote>
        <h2>How it's made</h2>
        <p>This journal is a static site with no external dependencies. Each essay lives as a Markdown file in the <code>assets/posts/</code> folder and is loaded in your browser at runtime. No database, no tracking, no CDN resources.</p>
        <p>To add an essay, drop a <code>.md</code> file into <code>assets/posts/</code> and add an entry to <code>assets/posts.json</code>. Deploy to GitHub Pages and the new essay appears automatically.</p>
        <hr />
        <p><em>Set in Georgia and system monospace fonts. Made with patience.</em></p>
      </div>
    `;
    show(view);
    setActiveNav("about");
    window.scrollTo(0, 0);
    updateProgress(0);
  }

  /* ---------- error ---------- */
  function showError() {
    show(views.error);
    window.scrollTo(0, 0);
  }

  /* ---------- nav active state ---------- */
  function setActiveNav(name) {
    document.querySelectorAll(".primary-nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.nav === name);
    });
  }

  /* ---------- reading progress ---------- */
  function updateProgress(pct) {
    progressBar.style.width = pct + "%";
  }
  function onScroll() {
    const st = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    updateProgress(h > 0 ? Math.min(100, (st / h) * 100) : 0);
    backTopBtn.classList.toggle("show", st > 600);
  }

  /* ---------- search ---------- */
  function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      filteredPosts = [];
      renderHome();
      return;
    }
    filteredPosts = posts.filter(p => {
      const haystack = [p.title, p.excerpt, p.category, p.author, ...(p.tags || [])]
        .join(" ").toLowerCase();
      return haystack.includes(query);
    });
    renderHome();
  }

  /* ---------- router ---------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash === "" ) {
      renderHome();
    } else if (hash === "about") {
      renderAbout();
    } else {
      renderPost(hash);
    }
  }

  /* ---------- init ---------- */
  async function init() {
    initHeaderMeta();
    show(views.loading);

    try {
      const res = await fetch(POSTS_JSON);
      if (!res.ok) throw new Error("no manifest");
      posts = await res.json();
    } catch (e) {
      showError();
      return;
    }

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    route();
  }

  /* ---------- events ---------- */
  window.addEventListener("hashchange", route);
  window.addEventListener("scroll", onScroll, { passive: true });
  backTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  searchInput.addEventListener("input", handleSearch);
  window.addEventListener("hashchange", () => {
    if (location.hash.replace(/^#\/?/, "") !== "") {
      searchInput.value = "";
      filteredPosts = [];
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
