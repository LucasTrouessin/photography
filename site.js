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
  const path = (p, file) => `${p.category}/${p.slug}/${file}`;
  const files = p => p.photos || Array.from({ length: p.count }, (_, i) => `${pad(i + 1)}.${p.ext || "jpg"}`);
  const cover = p => p.cover || files(p)[0];
  const byCat = key => PROJECTS.filter(p => p.category === key);

  /* ---------- ACCUEIL ---------- */
  function renderHome() {
    const wrap = document.getElementById("categories");
    CATEGORIES.forEach(cat => {
      const list = byCat(cat.key);
      if (!list.length) return;
      const grid = el("div", { class: "project-grid" });
      list.forEach(p => {
        const box = el("div", { class: "project-image placeholder" }, [el("span", { text: p.title.toUpperCase() })]);
        const img = new Image();
        img.alt = p.title;
        img.onload = () => { box.className = "project-image"; box.replaceChildren(img); };
        img.src = path(p, cover(p));
        grid.appendChild(el("a", { class: "project", href: `project.html?p=${encodeURIComponent(p.slug)}` }, [
          box,
          el("div", {}, [el("strong", { text: p.title })])
        ]));
      });
      wrap.appendChild(el("section", { class: "category", id: cat.key }, [
        el("div", { class: "category-title" }, [
          el("h3", { text: cat.label })
        ]),
        grid
      ]));
    });
  }

  /* ---------- PAGE PROJET ---------- */
  function renderProject() {
    const slug = new URLSearchParams(location.search).get("p");
    const p = PROJECTS.find(x => x.slug === slug);
    const head = document.getElementById("head");
    const gal = document.getElementById("gallery");
    if (!p) {
      head.appendChild(el("h1", { text: "Project not found" }));
      return;
    }
    const cat = CATEGORIES.find(c => c.key === p.category);
    document.title = `${p.title} — Lucas Trouessin`;
    head.appendChild(el("span", { class: "kicker", text: cat.label }));
    head.appendChild(el("h1", { text: p.title }));
    if (p.description) head.appendChild(el("p", { text: p.description }));

    const list = files(p);
    const loaded = [];           // urls réellement chargées
    let failed = 0;
    list.forEach((f, i) => {
      const fig = el("figure");
      const img = new Image();
      img.alt = `${p.title} — photo ${i + 1}`;
      img.loading = "lazy";
      img.tabIndex = 0;
      img.onload = () => { loaded.push(img); };
      img.onerror = () => {
        fig.remove();
        if (++failed === list.length) {
          gal.appendChild(el("p", { class: "empty", text: `No photos yet — add them to ${p.category}/${p.slug}/` }));
        }
      };
      img.src = path(p, f);
      const open = () => openLightbox(gal.querySelectorAll("img"), img);
      img.addEventListener("click", open);
      img.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
      fig.appendChild(img);
      gal.appendChild(fig);
    });

    // projet précédent / suivant dans la même catégorie
    const sib = byCat(p.category), idx = sib.findIndex(x => x.slug === p.slug);
    const pager = document.getElementById("pager");
    const link = (q, label) => el("a", { href: `project.html?p=${encodeURIComponent(q.slug)}`, text: label });
    pager.appendChild(idx > 0 ? link(sib[idx - 1], `← ${sib[idx - 1].title}`) : el("a", { href: "index.html#" + p.category, text: "← Back" }));
    pager.appendChild(idx < sib.length - 1 ? link(sib[idx + 1], `${sib[idx + 1].title} →`) : el("span"));
  }

  /* ---------- LIGHTBOX ---------- */
  let lb, lbImg, lbCount, imgs = [], cur = 0, touchX = null;
  function buildLightbox() {
    lbImg = el("img", { alt: "" });
    lbCount = el("span", { class: "count" });
    const mk = (cls, label, txt, fn) => { const b = el("button", { class: cls, "aria-label": label, text: txt }); b.onclick = fn; return b; };
    lb = el("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": "Photo viewer" }, [
      lbImg, lbCount,
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

  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "project") renderProject();

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
