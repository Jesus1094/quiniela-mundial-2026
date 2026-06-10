// Tipos de la base de datos (manuales, alineados con la migración 001).

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          pago_confirmado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
          pago_confirmado?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
          pago_confirmado?: boolean;
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
      scores: {
        Row: {
          participant_id: string;
          puntos_grupos: number;
          puntos_fases: number;
          puntos_comodin: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          participant_id: string;
          puntos_grupos?: number;
          puntos_fases?: number;
          puntos_comodin?: number;
          updated_at?: string;
        };
        Update: {
          participant_id?: string;
          puntos_grupos?: number;
          puntos_fases?: number;
          puntos_comodin?: number;
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
