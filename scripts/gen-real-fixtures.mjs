// Genera el calendario REAL de fase de grupos del Mundial 2026 (72 partidos)
// con fechas/horas oficiales. Horas de origen en ET (EDT = UTC-4 en junio).
// Fuente: calendario oficial FIFA WC 2026 (worldcupwiki / FIFA).
import { writeFileSync } from "node:fs";

const ES = {
  Mexico: "México", "South Africa": "Sudáfrica", "South Korea": "Corea del Sur",
  Czechia: "República Checa", "Czech Republic": "República Checa", Canada: "Canadá",
  Qatar: "Qatar", Switzerland: "Suiza", "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  Brazil: "Brasil", Morocco: "Marruecos", Haiti: "Haití", Scotland: "Escocia",
  USA: "EE.UU.", Paraguay: "Paraguay", Australia: "Australia", "Türkiye": "Turquía",
  Turkey: "Turquía", Germany: "Alemania", "Curaçao": "Curazao", Curacao: "Curazao",
  "Ivory Coast": "Costa de Marfil", Ecuador: "Ecuador", Netherlands: "Países Bajos",
  Japan: "Japón", Tunisia: "Túnez", Sweden: "Suecia", Belgium: "Bélgica", Iran: "Irán",
  Egypt: "Egipto", "New Zealand": "Nueva Zelanda", Spain: "España", Uruguay: "Uruguay",
  "Saudi Arabia": "Arabia Saudita", "Cape Verde": "Cabo Verde", France: "Francia",
  Senegal: "Senegal", Norway: "Noruega", Iraq: "Irak", Argentina: "Argentina",
  Austria: "Austria", Algeria: "Argelia", Jordan: "Jordania", Portugal: "Portugal",
  Colombia: "Colombia", Uzbekistan: "Uzbekistán", "DR Congo": "DR Congo",
  England: "Inglaterra", Croatia: "Croacia", Ghana: "Ghana", Panama: "Panamá",
};

// [día(jun), horaET, minET, local, visitante, grupo]  — orden cronológico.
const F = [
  [11, 15, 0, "Mexico", "South Africa", "A"],
  [11, 22, 0, "South Korea", "Czechia", "A"],
  [12, 15, 0, "Canada", "Bosnia & Herzegovina", "B"],
  [12, 21, 0, "USA", "Paraguay", "D"],
  [13, 15, 0, "Qatar", "Switzerland", "B"],
  [13, 18, 0, "Brazil", "Morocco", "C"],
  [13, 21, 0, "Haiti", "Scotland", "C"],
  [14, 0, 0, "Australia", "Türkiye", "D"],
  [14, 13, 0, "Germany", "Curaçao", "E"],
  [14, 16, 0, "Netherlands", "Japan", "F"],
  [14, 19, 0, "Ivory Coast", "Ecuador", "E"],
  [14, 22, 0, "Sweden", "Tunisia", "F"],
  [15, 12, 0, "Spain", "Cape Verde", "H"],
  [15, 15, 0, "Belgium", "Egypt", "G"],
  [15, 18, 0, "Saudi Arabia", "Uruguay", "H"],
  [15, 21, 0, "Iran", "New Zealand", "G"],
  [16, 15, 0, "France", "Senegal", "I"],
  [16, 18, 0, "Iraq", "Norway", "I"],
  [16, 21, 0, "Argentina", "Algeria", "J"],
  [17, 0, 0, "Austria", "Jordan", "J"],
  [17, 13, 0, "Portugal", "DR Congo", "K"],
  [17, 16, 0, "England", "Croatia", "L"],
  [17, 19, 0, "Ghana", "Panama", "L"],
  [17, 22, 0, "Uzbekistan", "Colombia", "K"],
  [18, 12, 0, "Czechia", "South Africa", "A"],
  [18, 15, 0, "Switzerland", "Bosnia & Herzegovina", "B"],
  [18, 18, 0, "Canada", "Qatar", "B"],
  [18, 21, 0, "Mexico", "South Korea", "A"],
  [19, 15, 0, "USA", "Australia", "D"],
  [19, 18, 0, "Scotland", "Morocco", "C"],
  [19, 20, 30, "Brazil", "Haiti", "C"],
  [19, 23, 0, "Türkiye", "Paraguay", "D"],
  [20, 13, 0, "Netherlands", "Sweden", "F"],
  [20, 16, 0, "Germany", "Ivory Coast", "E"],
  [20, 20, 0, "Ecuador", "Curaçao", "E"],
  [21, 0, 0, "Tunisia", "Japan", "F"],
  [21, 12, 0, "Spain", "Saudi Arabia", "H"],
  [21, 15, 0, "Belgium", "Iran", "G"],
  [21, 18, 0, "Uruguay", "Cape Verde", "H"],
  [21, 21, 0, "New Zealand", "Egypt", "G"],
  [22, 13, 0, "Argentina", "Austria", "J"],
  [22, 17, 0, "France", "Iraq", "I"],
  [22, 20, 0, "Norway", "Senegal", "I"],
  [22, 23, 0, "Jordan", "Algeria", "J"],
  [23, 13, 0, "Portugal", "Uzbekistan", "K"],
  [23, 16, 0, "England", "Ghana", "L"],
  [23, 19, 0, "Panama", "Croatia", "L"],
  [23, 22, 0, "Colombia", "DR Congo", "K"],
  [24, 15, 0, "Switzerland", "Canada", "B"],
  [24, 15, 0, "Bosnia & Herzegovina", "Qatar", "B"],
  [24, 18, 0, "Scotland", "Brazil", "C"],
  [24, 18, 0, "Morocco", "Haiti", "C"],
  [24, 21, 0, "Czechia", "Mexico", "A"],
  [24, 21, 0, "South Africa", "South Korea", "A"],
  [25, 16, 0, "Curaçao", "Ivory Coast", "E"],
  [25, 16, 0, "Ecuador", "Germany", "E"],
  [25, 19, 0, "Japan", "Sweden", "F"],
  [25, 19, 0, "Tunisia", "Netherlands", "F"],
  [25, 22, 0, "Türkiye", "USA", "D"],
  [25, 22, 0, "Paraguay", "Australia", "D"],
  [26, 15, 0, "Norway", "France", "I"],
  [26, 15, 0, "Senegal", "Iraq", "I"],
  [26, 20, 0, "Cape Verde", "Saudi Arabia", "H"],
  [26, 20, 0, "Uruguay", "Spain", "H"],
  [26, 23, 0, "Egypt", "Iran", "G"],
  [26, 23, 0, "New Zealand", "Belgium", "G"],
  [27, 17, 0, "Panama", "England", "L"],
  [27, 17, 0, "Croatia", "Ghana", "L"],
  [27, 19, 30, "Colombia", "Portugal", "K"],
  [27, 19, 30, "DR Congo", "Uzbekistan", "K"],
  [27, 22, 0, "Algeria", "Austria", "J"],
  [27, 22, 0, "Jordan", "Argentina", "J"],
];

const esc = (s) => s.replace(/'/g, "''");
const tr = (n) => {
  if (!(n in ES)) throw new Error(`Sin mapeo ES para: ${n}`);
  return ES[n];
};

const filas = F.map(([d, h, m, loc, vis, g], idx) => {
  // ET (EDT) = UTC-4  →  UTC = ET + 4h. Date.UTC maneja el desbordamiento de día.
  const ko = new Date(Date.UTC(2026, 5, d, h + 4, m, 0)).toISOString();
  return `('${g}', '${esc(tr(loc))}', '${esc(tr(vis))}', '${ko}', ${idx})`;
});

const sql =
  "delete from public.matches;\n" +
  "insert into public.matches (grupo, equipo_local, equipo_visitante, kickoff, orden) values\n" +
  filas.join(",\n") +
  ";\n";

writeFileSync(new URL("../supabase/seed_003_real_fixtures.sql", import.meta.url), sql);
console.log(`Generados ${F.length} partidos reales.`);
