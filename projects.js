/* ============================================================
   TOUTES TES DONNÉES SONT ICI.
   Pour ajouter un projet : copie une ligne dans PROJECTS,
   change slug / title / count, et dépose les photos dans
   le dossier  <category>/<slug>/  nommées 01.jpg, 02.jpg, 03.jpg…
   Exemple : portraits/manu/01.jpg
   ============================================================ */

const CATEGORIES = [
  { key: "portraits", label: "Portraits" },
  { key: "street",    label: "Street Photography" }
];

const PROJECTS = [
  // ---------- PORTRAITS ----------
  { slug: "break", category: "portraits", title: "Breakers de l'Opéra", description: "",                   count: 17, cover: "04.jpg"},
  { slug: "manu", category: "portraits", title: "Manu",                description: "A portrait series.", count: 10, cover: "08.jpg"},
  { slug: "greta",       category: "portraits", title: "Greta",         description: "",                   count: 25, cover: "17.jpg"},
  { slug: "kilia",       category: "portraits", title: "Kilia",         description: "",                   count: 44, cover: "06.jpg"},
  { slug: "tignes",       category: "portraits", title: "Tignes",         description: "",                   count: 17, cover: "12.jpg"},
  { slug: "elisa",       category: "portraits", title: "Elisa",         description: "",                   count: 13, cover: "11.jpg"},
  { slug: "emilie",       category: "portraits", title: "Emilie",         description: "",                   count: 32, cover: "32.jpg"},
  { slug: "jade",       category: "portraits", title: "Jade",         description: "",                   count: 21, cover: "18.jpg"},

  // ---------- STREET ----------
  { slug: "Lyon",              category: "street",    title: "Lyon",                description: "", count: 8, cover: "04.jpg"},
  { slug: "Bangkok",           category: "street",    title: "Bangkok",             description: "", count: 39, cover: "13.jpg"},
  { slug: "Firenze",         category: "street",    title: "Firenze",           description: "", count: 11, cover: "05.jpg"}

  // Options facultatives par projet :
  //   ext: "jpeg"                         → si tes fichiers ne sont pas en .jpg
  //   photos: ["a.jpg","b.jpg"]           → liste de noms précis (remplace count)
  //   cover: "03.jpg"                     → vignette de l'accueil (par défaut 01)
];