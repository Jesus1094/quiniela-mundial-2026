// Genera el calendario de fase de grupos (72 partidos) como SQL INSERT.
// Round-robin por grupo (4 equipos = 6 partidos), 3 jornadas.
// Repartidos desde el 11-jun-2026, 4 partidos/día en horarios CDMX (UTC-6):
// 11:00, 14:00, 17:00, 20:00  ->  UTC = local + 6h.
import { writeFileSync } from "node:fs";

const GRUPOS = [
  ["A", ["México", "Sudáfrica", "Corea del Sur", "República Checa"]],
  ["B", ["Canadá", "Qatar", "Suiza", "Bosnia y Herzegovina"]],
  ["C", ["Brasil", "Marruecos", "Haití", "Escocia"]],
  ["D", ["EE.UU.", "Paraguay", "Australia", "Turquía"]],
  ["E", ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"]],
  ["F", ["Países Bajos", "Japón", "Túnez", "Suecia"]],
  ["G", ["Bélgica", "Irán", "Egipto", "Nueva Zelanda"]],
  ["H", ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"]],
  ["I", ["Francia", "Senegal", "Noruega", "Irak"]],
  ["J", ["Argentina", "Austria", "Argelia", "Jordania"]],
  ["K", ["Portugal", "Colombia", "Uzbekistán", "DR Congo"]],
  ["L", ["Inglaterra", "Croacia", "Ghana", "Panamá"]],
];

// Emparejamientos round-robin por jornada para índices [0,1,2,3].
const RONDAS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

const SLOTS_CDMX = [11, 14, 17, 20]; // horas locales
const POR_DIA = SLOTS_CDMX.length;

// Construir la lista ordenada: por jornada, luego por grupo.
const partidos = [];
for (let ronda = 0; ronda < RONDAS.length; ronda++) {
  for (const [letra, equipos] of GRUPOS) {
    for (const [i, j] of RONDAS[ronda]) {
      partidos.push({ grupo: letra, local: equipos[i], visitante: equipos[j] });
    }
  }
}

const esc = (s) => s.replace(/'/g, "''");
const filas = partidos.map((p, idx) => {
  const dia = Math.floor(idx / POR_DIA);
  const slot = idx % POR_DIA;
  const horaUTC = SLOTS_CDMX[slot] + 6; // CDMX es UTC-6 (sin horario de verano)
  // Date.UTC maneja el desbordamiento de horas a días siguientes.
  const ko = new Date(Date.UTC(2026, 5, 11 + dia, horaUTC, 0, 0)).toISOString();
  return `('${p.grupo}', '${esc(p.local)}', '${esc(p.visitante)}', '${ko}', ${idx})`;
});

const sql =
  "insert into public.matches (grupo, equipo_local, equipo_visitante, kickoff, orden) values\n" +
  filas.join(",\n") +
  ";\n";

writeFileSync(new URL("../supabase/seed_002_matches.sql", import.meta.url), sql);
console.log(`Generados ${partidos.length} partidos.`);
console.log(sql);
