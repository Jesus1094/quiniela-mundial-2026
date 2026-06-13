// Tipos de la base de datos (manuales, alineados con migraciones 001 y 002).

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          pago_confirmado: boolean;
          password_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
          pago_confirmado?: boolean;
          password_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
          pago_confirmado?: boolean;
          password_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          participant_id: string;
          tipo: string;
          equipo_seleccionado: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          tipo: string;
          equipo_seleccionado: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          tipo?: string;
          equipo_seleccionado?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      results: {
        Row: {
          id: string;
          tipo: string;
          equipo_ganador: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tipo: string;
          equipo_ganador: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tipo?: string;
          equipo_ganador?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          grupo: string;
          equipo_local: string;
          equipo_visitante: string;
          kickoff: string;
          marcador_local: number | null;
          marcador_visitante: number | null;
          cierre_override: string | null;
          orden: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grupo: string;
          equipo_local: string;
          equipo_visitante: string;
          kickoff: string;
          marcador_local?: number | null;
          marcador_visitante?: number | null;
          cierre_override?: string | null;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          grupo?: string;
          equipo_local?: string;
          equipo_visitante?: string;
          kickoff?: string;
          marcador_local?: number | null;
          marcador_visitante?: number | null;
          cierre_override?: string | null;
          orden?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_predictions: {
        Row: {
          id: string;
          participant_id: string;
          match_id: string;
          pred_local: number;
          pred_visitante: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          match_id: string;
          pred_local: number;
          pred_visitante: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          match_id?: string;
          pred_local?: number;
          pred_visitante?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          participant_id: string;
          puntos_grupos: number;
          puntos_fases: number;
          puntos_comodin: number;
          puntos_partidos: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          participant_id: string;
          puntos_grupos?: number;
          puntos_fases?: number;
          puntos_comodin?: number;
          puntos_partidos?: number;
          updated_at?: string;
        };
        Update: {
          participant_id?: string;
          puntos_grupos?: number;
          puntos_fases?: number;
          puntos_comodin?: number;
          puntos_partidos?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
