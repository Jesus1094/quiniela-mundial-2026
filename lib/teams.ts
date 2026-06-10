// Datos del torneo: 48 equipos, 12 grupos (A–L), con bandera emoji.

export type Team = {
  nombre: string;
  bandera: string;
};

export type Grupo = {
  letra: string; // "A".."L"
  tipo: string; // "grupo_A".."grupo_L"
  equipos: Team[];
};

export const GRUPOS: Grupo[] = [
  {
    letra: "A",
    tipo: "grupo_A",
    equipos: [
      { nombre: "México", bandera: "🇲🇽" },
      { nombre: "Sudáfrica", bandera: "🇿🇦" },
      { nombre: "Corea del Sur", bandera: "🇰🇷" },
      { nombre: "República Checa", bandera: "🇨🇿" },
    ],
  },
  {
    letra: "B",
    tipo: "grupo_B",
    equipos: [
      { nombre: "Canadá", bandera: "🇨🇦" },
      { nombre: "Qatar", bandera: "🇶🇦" },
      { nombre: "Suiza", bandera: "🇨🇭" },
      { nombre: "Bosnia y Herzegovina", bandera: "🇧🇦" },
    ],
  },
  {
    letra: "C",
    tipo: "grupo_C",
    equipos: [
      { nombre: "Brasil", bandera: "🇧🇷" },
      { nombre: "Marruecos", bandera: "🇲🇦" },
      { nombre: "Haití", bandera: "🇭🇹" },
      { nombre: "Escocia", bandera: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    ],
  },
  {
    letra: "D",
    tipo: "grupo_D",
    equipos: [
      { nombre: "EE.UU.", bandera: "🇺🇸" },
      { nombre: "Paraguay", bandera: "🇵🇾" },
      { nombre: "Australia", bandera: "🇦🇺" },
      { nombre: "Turquía", bandera: "🇹🇷" },
    ],
  },
  {
    letra: "E",
    tipo: "grupo_E",
    equipos: [
      { nombre: "Alemania", bandera: "🇩🇪" },
      { nombre: "Curazao", bandera: "🇨🇼" },
      { nombre: "Costa de Marfil", bandera: "🇨🇮" },
      { nombre: "Ecuador", bandera: "🇪🇨" },
    ],
  },
  {
    letra: "F",
    tipo: "grupo_F",
    equipos: [
      { nombre: "Países Bajos", bandera: "🇳🇱" },
      { nombre: "Japón", bandera: "🇯🇵" },
      { nombre: "Túnez", bandera: "🇹🇳" },
      { nombre: "Suecia", bandera: "🇸🇪" },
    ],
  },
  {
    letra: "G",
    tipo: "grupo_G",
    equipos: [
      { nombre: "Bélgica", bandera: "🇧🇪" },
      { nombre: "Irán", bandera: "🇮🇷" },
      { nombre: "Egipto", bandera: "🇪🇬" },
      { nombre: "Nueva Zelanda", bandera: "🇳🇿" },
    ],
  },
  {
    letra: "H",
    tipo: "grupo_H",
    equipos: [
      { nombre: "España", bandera: "🇪🇸" },
      { nombre: "Uruguay", bandera: "🇺🇾" },
      { nombre: "Arabia Saudita", bandera: "🇸🇦" },
      { nombre: "Cabo Verde", bandera: "🇨🇻" },
    ],
  },
  {
    letra: "I",
    tipo: "grupo_I",
    equipos: [
      { nombre: "Francia", bandera: "🇫🇷" },
      { nombre: "Senegal", bandera: "🇸🇳" },
      { nombre: "Noruega", bandera: "🇳🇴" },
      { nombre: "Irak", bandera: "🇮🇶" },
    ],
  },
  {
    letra: "J",
    tipo: "grupo_J",
    equipos: [
      { nombre: "Argentina", bandera: "🇦🇷" },
      { nombre: "Austria", bandera: "🇦🇹" },
      { nombre: "Argelia", bandera: "🇩🇿" },
      { nombre: "Jordania", bandera: "🇯🇴" },
    ],
  },
  {
    letra: "K",
    tipo: "grupo_K",
    equipos: [
      { nombre: "Portugal", bandera: "🇵🇹" },
      { nombre: "Colombia", bandera: "🇨🇴" },
      { nombre: "Uzbekistán", bandera: "🇺🇿" },
      { nombre: "DR Congo", bandera: "🇨🇩" },
    ],
  },
  {
    letra: "L",
    tipo: "grupo_L",
    equipos: [
      { nombre: "Inglaterra", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { nombre: "Croacia", bandera: "🇭🇷" },
      { nombre: "Ghana", bandera: "🇬🇭" },
      { nombre: "Panamá", bandera: "🇵🇦" },
    ],
  },
];

// Lista plana de los 48 equipos (para selectores de fase final y comodín).
export const TODOS_LOS_EQUIPOS: Team[] = GRUPOS.flatMap((g) => g.equipos);

// Mapa nombre -> bandera, para renderizar resultados/predicciones guardadas.
export const BANDERA_POR_EQUIPO: Record<string, string> = Object.fromEntries(
  TODOS_LOS_EQUIPOS.map((t) => [t.nombre, t.bandera])
);

export function banderaDe(nombre: string | null | undefined): string {
  if (!nombre) return "";
  return BANDERA_POR_EQUIPO[nombre] ?? "🏳️";
}
