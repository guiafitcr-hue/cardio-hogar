import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "participante" | "profesional";

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string;
  correo: string;
  profesional_asignado_id: string | null;
  codigo_vinculacion_usado: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  diagnostico_cardiaco: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  /** true mientras se resuelve la sesión inicial o se recarga el perfil */
  cargando: boolean;
  /** true solo durante la recarga manual del perfil (no bloquea la UI inicial) */
  recargandoPerfil: boolean;
  recargarPerfil: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function obtenerPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error al cargar el perfil del usuario:", error.message);
    return null;
  }

  return data as Perfil | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recargandoPerfil, setRecargandoPerfil] = useState(false);

  const recargarPerfil = useCallback(async () => {
    if (!user) return;
    setRecargandoPerfil(true);
    const datosPerfil = await obtenerPerfil(user.id);
    setPerfil(datosPerfil);
    setRecargandoPerfil(false);
  }, [user]);

  useEffect(() => {
    let activo = true;

    async function inicializar() {
      const {
        data: { session: sesionActual },
      } = await supabase.auth.getSession();

      if (!activo) return;

      setSession(sesionActual);
      setUser(sesionActual?.user ?? null);

      if (sesionActual?.user) {
        const datosPerfil = await obtenerPerfil(sesionActual.user.id);
        if (activo) setPerfil(datosPerfil);
      }

      if (activo) setCargando(false);
    }

    inicializar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!activo) return;

      setSession(nuevaSesion);
      setUser(nuevaSesion?.user ?? null);

      if (nuevaSesion?.user) {
        const datosPerfil = await obtenerPerfil(nuevaSesion.user.id);
        if (activo) setPerfil(datosPerfil);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPerfil(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        perfil,
        cargando,
        recargandoPerfil,
        recargarPerfil,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (contexto === undefined) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return contexto;
}
