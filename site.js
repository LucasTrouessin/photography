(function () {
  const pad = n => String(n).padStart(2, "0");
  const el = (tag, attrs = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    kids.forEach(c => e.appendChild(c));
    return e;
  };
  /* ---------- FILIGRANE ---------- */
  // logo « LT » (dessiné sur Canva, redessiné en rectangles nets) — même tracé que icons/logo.svg
  const MARK_SVG = '<svg viewBox="0 0 827 720.5" fill="currentColor">'
    + '<path d="M0 0h202.6v42.5H0zM0 0h42.5v202.6H0zM517.9 678h202.6v42.5H517.9zM678 517.9h42.5v202.6H678z'
    + 'M0 378.5h42.5v342H0zM0 678h190.6v42.5H0zM678 0h42.5v342H678zM571.5 0h255.6v42.5H571.5z"/></svg>';
  let WM = null;                                   // réglages actifs (null = pas de filigrane)
  function setWatermark(data) {
    const w = data.watermark;
    if (!w || !w.enabled) { WM = null; return; }
    const op = Number(w.opacity);
    WM = {
      cls: ["wm", w.color === "dark" ? "dark" : "light", ["s", "m", "l"].includes(w.size) ? w.size : "m", w.position === "left" ? "left" : "right"].join(" "),
      opacity: op >= 0.1 && op <= 1 ? op : 0.8
    };
  }
  function withMark(img) {                         // enveloppe l'image et pose le filigrane dans son coin
    if (!WM) return img;
    const wrap = el("span", { class: "wm-wrap" });
    const mark = el("span", { class: WM.cls, "aria-hidden": "true" });
    mark.style.opacity = WM.opacity;
    mark.innerHTML = MARK_SVG;
    if (img.parentNode) img.parentNode.replaceChild(wrap, img);
    wrap.appendChild(img); wrap.appendChild(mark);
    return wrap;
  }

  /* ---------- RÉPARTITION EN COLONNES (même calcul que l'aperçu de l'admin) ----------
     ratios : largeur/hauteur de chaque photo, dans l'ordre. Renvoie les index par colonne.
     Chaque photo va dans la colonne la moins haute (à égalité : la gauche). À la fin, si la
     colonne de droite dépasse, sa dernière photo passe à gauche : c'est la gauche qui dépasse. */
  const GAP = 0.05;              // espace entre photos, en proportion de la largeur d'une colonne
  function splitColumns(ratios, n, final) {
    const cols = Array.from({ length: n }, () => []), hts = new Array(n).fill(0);
    ratios.forEach((r, i) => {
      let c = 0;
      for (let k = 1; k < n; k++) if (hts[k] < hts[c] - 1e-6) c = k;
      cols[c].push(i); hts[c] += 1 / r + GAP;
    });
    if (final && n === 2 && hts[1] > hts[0] + 1e-6 && cols[1].length > 1) cols[0].push(cols[1].pop());
    return cols;
  }

  /* ---------- ACCUEIL : texte et grande photo ---------- */
  function renderHeroText(data) {
    const t = data.hero && data.hero.title;
    const h1 = document.querySelector(".hero-caption h1");
    if (!h1 || typeof t !== "string") return;
    h1.replaceChildren();
    t.split("\n").forEach((line, i) => {
      if (i) h1.appendChild(document.createElement("br"));
      h1.appendChild(document.createTextNode(line));
    });
    h1.hidden = !t.trim();
  }
  function setHeroImage(src) {   // l'image n'a pas de src dans index.html : on la choisit ici
    const img = document.querySelector(".hero-image img");
    if (!img || img.getAttribute("src")) return img;
    const missing = () => { img.parentNode.classList.add("missing"); img.remove(); };
    if (!src) { missing(); return null; }
    img.onerror = () => {
      if (img.srcset) { img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.src = src; }   // pas de version allégée : photo complète
      else missing();
    };
    if (src.startsWith(HERO_DIR + "/")) {                // créée par l'admin : une version allégée existe pour le mobile
      img.sizes = "100vw";
      img.srcset = `${mediumOf(src)} ${HERO_MED_W}w, ${src} ${HERO_FULL_W}w`;
    }
    img.src = src;
    return img;
  }

  const path = (p, file) => `${p.folder}/${file}`;
  // Version allégée (créée par l'admin : dossier/medium/NOM.jpg). Si elle n'existe pas encore, on retombe sur la photo complète.
  const mediumOf = full => full.replace(/(^|\/)([^/]+?)\.[^./]+$/, "$1medium/$2.jpg");
  const mediumPath = (p, file) => mediumOf(path(p, file));
  const HERO_DIR = "head-photo", HERO_MED_W = 1280, HERO_FULL_W = 2560;   // mêmes valeurs que l'admin
  const LIGHT = window.matchMedia("(max-width: 900px)").matches || !!(navigator.connection && navigator.connection.saveData);   // mobile : versions allégées partout
  const cover = p => p.cover || p.photos[0];

  /* ---------- ACCUEIL ---------- */
  // Les couvertures ne sont demandées que lorsqu'elles approchent de l'écran (économise beaucoup de données sur mobile).
  const lazy = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, obs) => entries.forEach(e => {
        if (e.isIntersecting) { obs.unobserve(e.target); e.target._load(); }
      }), { rootMargin: "900px 0px" })
    : null;
  function renderHome(data) {
    const wrap = document.getElementById("categories");
    data.categories.forEach(cat => {
      const list = cat.projects;
      if (!list.length) return;
      const grid = el("div", { class: "project-grid" });
      list.forEach(p => {
        const box = el("div", { class: "project-image placeholder" }, [el("span", { text: p.title.toUpperCase() })]);
        if (cover(p)) {
          const img = new Image();
          img.alt = p.title;
          img.decoding = "async";
          img.onload = () => { box.className = "project-image"; box.replaceChildren(withMark(img)); };
          img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = "1"; img.src = path(p, cover(p)); } };   // pas de version allégée : photo complète
          box._load = () => { img.src = mediumPath(p, cover(p)); };
          if (lazy) lazy.observe(box); else box._load();
        }
        grid.appendChild(el("a", { class: "project", href: `project.html?p=${encodeURIComponent(p.slug)}` }, [
          box,
          el("div", {}, [el("strong", { text: p.title })])
        ]));
      });
      wrap.appendChild(el("section", { class: "category", id: cat.id }, [
        el("div", { class: "category-title" }, [
          el("h3", { text: cat.label })
        ]),
        grid
      ]));
    });
  }

  /* ---------- PAGE PROJET ---------- */
  function renderProject(data) {
    const slug = new URLSearchParams(location.search).get("p");
    let cat = null, p = null;
    data.categories.forEach(c => c.projects.forEach(x => { if (x.slug === slug) { cat = c; p = x; } }));
    const head = document.getElementById("head");
    const gal = document.getElementById("gallery");
    if (!p) {
      head.appendChild(el("h1", { text: "Project not found" }));
      return;
    }
    document.title = `${p.title} — ${(data.site && data.site.name) || "Lucas Trouessin"}`;
    head.appendChild(el("span", { class: "kicker", text: cat.label }));
    head.appendChild(el("h1", { text: p.title }));
    if (p.description) head.appendChild(el("p", { text: p.description }));

    // nom du projet dans la barre du haut (reste visible au défilement)
    const brand = document.querySelector(".nav .brand");
    if (brand) brand.insertAdjacentElement("afterend", el("span", { class: "where" }, [
      el("span", { class: "cat", text: cat.label }), el("span", { text: p.title })
    ]));

    // Galerie en 2 colonnes, remplies dans l'ordre (1 à gauche, 2 à droite…) en équilibrant
    // les hauteurs. Une fois tout chargé, s'il reste un décalage, c'est la colonne de gauche qui dépasse.
    const list = p.photos;
    if (!list.length) gal.appendChild(el("p", { class: "empty", text: "No photos yet." }));
    const items = [];            // dans l'ordre des photos : { fig, img, ratio, state }
    const ordered = () => items.filter(it => it.state === "ok").map(it => it.img);
    const narrow = window.matchMedia("(max-width: 700px)");
    let lastKey = "", mode = 0, col1 = null;
    function layout() {
      let k = 0;
      while (k < items.length && items[k].state !== "wait") k++;        // photos prêtes, sans trou
      const done = k === items.length, n = narrow.matches ? 1 : 2;
      const ok = items.slice(0, k).filter(it => it.state === "ok");
      updateStatus();
      if (done && !ok.length) {
        gal.replaceChildren();                           // tout a échoué : message + bouton dans la barre d'état
        gal.classList.remove("loading");
        return;
      }
      if (n === 1) {
        // mobile : une seule colonne, on ajoute les photos au fur et à mesure sans toucher à celles déjà affichées
        if (mode !== 1) {
          mode = 1; col1 = el("div", { class: "gcol" });
          items.forEach(it => { it.placed = false; });
          gal.replaceChildren(col1);
        }
        ok.forEach(it => { if (!it.placed) { it.placed = true; col1.appendChild(it.fig); } });
        if (ok.length) gal.classList.remove("loading");
        return;
      }
      const key = `${k}|${n}`;
      if (key === lastKey) return;
      lastKey = key; mode = 2;
      const cols = splitColumns(ok.map(it => it.ratio), n, done);
      gal.replaceChildren(...cols.map(c => el("div", { class: "gcol" }, c.map(i => ok[i].fig))));
      gal.classList.remove("loading");
    }
    const onBreakpoint = () => { lastKey = ""; mode = 0; layout(); };
    if (narrow.addEventListener) narrow.addEventListener("change", onBreakpoint); else narrow.addListener(onBreakpoint);

    // Toutes les photos sont chargées dès l'arrivée sur la page, dans l'ordre, sans attendre le défilement
    // (1re photo seule, puis 3 à la fois). Une barre d'état sous la galerie indique ce qui reste à charger
    // ou ce qui a échoué : sans elle, la galerie a l'air finie alors qu'il manque des photos.
    gal.classList.add("loading");
    const status = el("div", { class: "gal-status", role: "status" });
    gal.insertAdjacentElement("afterend", status);
    let inflight = 0;
    const STALL_MS = 25000;                              // une requête bloquée plus longtemps est traitée comme une erreur
    const limit = () => (items[0] && items[0].state === "wait") ? 1 : 3;
    function pump() {
      while (inflight < limit()) {
        const it = items.find(x => x.state === "wait" && !x.started);
        if (!it) break;
        start(it);
      }
    }
    function load(it, src) {
      clearTimeout(it.timer);
      it.timer = setTimeout(() => { if (it.img.onerror) it.img.onerror(); }, STALL_MS);
      it.img.src = src;
    }
    function start(it) {
      inflight++; it.started = true; it.tries = 0;
      it.light = LIGHT;                                  // d'abord la version allégée (mobile), sinon la complète
      load(it, it.light ? it.lightSrc : it.full);
    }
    function finish() { inflight--; pump(); }
    function retryFailed() {
      items.forEach(it => { if (it.state === "bad") { it.state = "wait"; it.started = false; it.tries = 0; } });
      lastKey = ""; mode = 0;                            // forcer la remise en page (les photos reprennent leur place)
      gal.classList.add("loading");
      updateStatus(); pump();
    }
    function updateStatus() {
      const total = items.length;
      const ok = items.filter(x => x.state === "ok").length, bad = items.filter(x => x.state === "bad").length;
      status.replaceChildren();
      if (ok + bad < total) {
        status.textContent = `Loading photos… ${ok + bad} / ${total}`;
      } else if (bad) {
        const b = el("button", { type: "button", text: "Retry" });
        b.onclick = retryFailed;
        status.append(`${bad} ${bad > 1 ? "photos" : "photo"} could not be loaded. `, b);
      }
    }
    window.addEventListener("online", () => { if (items.some(x => x.state === "bad")) retryFailed(); });

    list.forEach((f, i) => {
      const img = new Image();
      const it = { fig: el("figure"), img, ratio: 1, state: "wait", started: false, tries: 0, timer: null, full: path(p, f), lightSrc: mediumPath(p, f), light: false };
      img.alt = `${p.title} — photo ${i + 1}`;
      img.tabIndex = 0;
      img.decoding = "async";
      if (!LIGHT) img.dataset.full = it.full;            // la visionneuse passe à la version complète (sauf mobile / économie de données)
      if (i < 2) img.fetchPriority = "high";
      img.onload = () => { clearTimeout(it.timer); it.ratio = (img.naturalWidth / img.naturalHeight) || 1; it.state = "ok"; layout(); finish(); };
      img.onerror = () => {
        if (it.light) { it.light = false; load(it, it.full); return; }   // pas de version allégée : on prend la complète
        if (it.tries < 2) {                                              // erreur réseau passagère : 2 nouvelles tentatives
          it.tries++; clearTimeout(it.timer);
          it.timer = setTimeout(() => load(it, it.full + (it.full.includes("?") ? "&" : "?") + "r=" + it.tries), 1000 * it.tries);
          return;
        }
        clearTimeout(it.timer);
        it.state = "bad"; layout(); finish();
      };
      const open = () => openLightbox(ordered(), img);
      img.addEventListener("click", open);
      img.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
      it.fig.appendChild(withMark(img));
      items.push(it);
    });

    updateStatus();
    pump();

    // projet précédent / suivant dans la même catégorie
    const sib = cat.projects, idx = sib.findIndex(x => x.slug === p.slug);
    const pager = document.getElementById("pager");
    const link = (q, label) => el("a", { href: `project.html?p=${encodeURIComponent(q.slug)}`, text: label });
    pager.appendChild(idx > 0 ? link(sib[idx - 1], `← ${sib[idx - 1].title}`) : el("a", { href: "index.html#" + cat.id, text: "← Back" }));
    pager.appendChild(idx < sib.length - 1 ? link(sib[idx + 1], `${sib[idx + 1].title} →`) : el("span"));
  }

  /* ---------- LIGHTBOX ---------- */
  let lb, lbImg, lbCount, imgs = [], cur = 0, touchX = null;
  function buildLightbox() {
    lbImg = el("img", { alt: "" });
    lbCount = el("span", { class: "count" });
    const mk = (cls, label, txt, fn) => { const b = el("button", { class: cls, "aria-label": label, text: txt }); b.onclick = fn; return b; };
    lb = el("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": "Photo viewer" }, [
      withMark(lbImg), lbCount,
      mk("x", "Close", "Close", closeLb), mk("prev", "Previous photo", "Prev", () => go(-1)), mk("next", "Next photo", "Next", () => go(1))
    ]);
    // Clic sur la photo : photo suivante (s'arrête à la dernière). Le fond blanc ne ferme rien.
    lbImg.addEventListener("click", () => go(1));
    lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      touchX = null;
    });
    document.body.appendChild(lb);
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    });
  }
  function show() {
    const shown = imgs[cur], want = cur, full = shown.dataset.full;
    lbImg.src = shown.currentSrc || shown.src;           // tout de suite : ce qui est déjà chargé
    if (full) {                                          // puis la version complète, dès qu'elle est prête
      const pre = new Image();
      pre.onload = () => { if (cur === want && pre.src !== lbImg.src) lbImg.src = pre.src; };
      pre.src = full;
    }
    lbImg.alt = imgs[cur].alt;
    lbCount.textContent = `${pad(cur + 1)} / ${pad(imgs.length)}`;
    lbImg.style.cursor = cur === imgs.length - 1 ? "default" : "pointer";
    lb.querySelector(".prev").style.visibility = cur === 0 ? "hidden" : "visible";
    lb.querySelector(".next").style.visibility = cur === imgs.length - 1 ? "hidden" : "visible";
  }
  function go(d) {
    const n = cur + d;
    if (n < 0 || n >= imgs.length) return;   // pas de boucle : on s'arrête aux extrémités
    cur = n; show();
  }
  function openLightbox(nodes, img) {
    if (!lb) buildLightbox();
    imgs = Array.from(nodes); cur = imgs.indexOf(img);
    show(); lb.classList.add("open"); document.body.style.overflow = "hidden";
    lb.querySelector(".x").focus();
  }
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; }

  /* ---------- À PROPOS (texte + email) ---------- */
  function renderAbout(data) {
    const a = data.about || {};
    const p = document.querySelector(".about p");
    const c = document.querySelector("a.contact");
    if (p && a.text) p.textContent = a.text;
    if (c && a.email) {
      c.href = `mailto:${a.email}`;
      c.textContent = `${a.email} ↗`;
    }
  }

  /* ---------- CHARGEMENT DES DONNÉES (site.json) ---------- */
  const page = document.body.dataset.page;
  fetch("site.json", { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      setWatermark(data);
      if (page === "home") {
        const hero = setHeroImage(data.hero && data.hero.image);
        renderHeroText(data);
        if (hero && WM) {
          if (hero.complete && hero.naturalWidth) withMark(hero);
          else hero.addEventListener("load", () => withMark(hero), { once: true });
        }
        renderHome(data); renderAbout(data);
      }
      if (page === "project") renderProject(data);
    })
    .catch(err => {
      console.error("Impossible de charger site.json", err);
      if (page === "home") setHeroImage(null);
      const m = document.querySelector("main");
      if (m) m.appendChild(el("p", { class: "empty", text: "Unable to load the content." }));
    });

  /* ---------- ANNÉE DU COPYRIGHT ---------- */
  const year = document.getElementById("current-year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- PROTECTION DES PHOTOS ----------
     Délégation d'événements : fonctionne aussi pour les images
     créées après le chargement de la page (galeries, lightbox). */
  document.addEventListener("contextmenu", e => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });
  document.addEventListener("dragstart", e => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });
})();
