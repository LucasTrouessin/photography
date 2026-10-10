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
    if (img && !img.getAttribute("src")) img.src = src || img.dataset.default || "fondo.jpeg";
    return img;
  }

  const path = (p, file) => `${p.folder}/${file}`;
  const cover = p => p.cover || p.photos[0];

  /* ---------- ACCUEIL ---------- */
  function renderHome(data) {
    const wrap = document.getElementById("categories");
    data.categories.forEach(cat => {
      const list = cat.projects;
      if (!list.length) return;
      const grid = el("div", { class: "project-grid" });
      list.forEach(p => {
        const box = el("div", { class: "project-image placeholder" }, [el("span", { text: p.title.toUpperCase() })]);
        const img = new Image();
        img.alt = p.title;
        img.onload = () => { box.className = "project-image"; box.replaceChildren(withMark(img)); };
        if (cover(p)) img.src = path(p, cover(p));
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
    let lastKey = "";
    function layout() {
      let k = 0;
      while (k < items.length && items[k].state !== "wait") k++;        // photos prêtes, sans trou
      const done = k === items.length, n = narrow.matches ? 1 : 2;
      const key = `${k}|${n}`;
      if (key === lastKey) return;
      lastKey = key;
      const ok = items.slice(0, k).filter(it => it.state === "ok");
      if (done && !ok.length) {
        gal.replaceChildren(el("p", { class: "empty", text: `No photos yet — add them to ${p.folder}/` }));
        return;
      }
      const cols = splitColumns(ok.map(it => it.ratio), n, done);
      gal.replaceChildren(...cols.map(c => el("div", { class: "gcol" }, c.map(i => ok[i].fig))));
    }
    const onBreakpoint = () => { lastKey = ""; layout(); };
    if (narrow.addEventListener) narrow.addEventListener("change", onBreakpoint); else narrow.addListener(onBreakpoint);

    list.forEach((f, i) => {
      const img = new Image();
      const it = { fig: el("figure"), img, ratio: 1, state: "wait" };
      img.alt = `${p.title} — photo ${i + 1}`;
      img.tabIndex = 0;
      img.decoding = "async";
      if (i > 5) img.fetchPriority = "low";
      img.onload = () => { it.ratio = (img.naturalWidth / img.naturalHeight) || 1; it.state = "ok"; layout(); };
      img.onerror = () => { it.state = "bad"; layout(); };
      const open = () => openLightbox(ordered(), img);
      img.addEventListener("click", open);
      img.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
      it.fig.appendChild(withMark(img));
      items.push(it);
      img.src = path(p, f);
    });

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
    lbImg.src = imgs[cur].currentSrc || imgs[cur].src;
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
      if (page === "home") setHeroImage();
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
