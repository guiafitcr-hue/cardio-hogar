import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ChevronRight, MessageCircle } from "lucide-react";

interface ParticipanteConResumen {
  id: string;
  nombre: string;
  ultimaFecha: string | null;
  alertaPendiente: boolean;
}

const DashboardProfesional = () => {
  const { perfil, cerrarSesion } = useAuth();

  const { data: participantes, isLoading } = useQuery({
    queryKey: ["participantes-asignados", perfil?.id],
    enabled: !!perfil,
    queryFn: async (): Promise<ParticipanteConResumen[]> => {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from("usuarios")
        .select("id, nombre")
        .eq("profesional_asignado_id", perfil!.id)
        .eq("rol", "participante")
        .order("nombre", { ascending: true });

      if (errorUsuarios) throw errorUsuarios;
      if (!usuarios || usuarios.length === 0) return [];

      const ids = usuarios.map((u) => u.id);
      const { data: sesiones, error: errorSesiones } = await supabase
        .from("sesiones")
        .select("participante_id, fecha, alerta, revisado_por")
        .in("participante_id", ids)
        .order("fecha", { ascending: false });

      if (errorSesiones) throw errorSesiones;

      const resumen = usuarios.map((u): ParticipanteConResumen => {
        const sesionesDelParticipante = (sesiones ?? []).filter(
          (s) => s.participante_id === u.id,
        );
        return {
          id: u.id,
          nombre: u.nombre,
          ultimaFecha: sesionesDelParticipante[0]?.fecha ?? null,
          alertaPendiente: sesionesDelParticipante.some(
            (s) => s.alerta && !s.revisado_por,
          ),
        };
      });

      // Los participantes con alerta crítica pendiente van primero.
      return resumen.sort((a, b) => {
        if (a.alertaPendiente !== b.alertaPendiente) {
          return a.alertaPendiente ? -1 : 1;
        }
        return a.nombre.localeCompare(b.nombre);
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Hola, {perfil?.nombre ?? "profesional"}</h1>
          <Button variant="outline" onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </div>

        <Button
          asChild
          variant="secondary"
          size="lg"
          className="w-full h-14 text-base justify-start gap-3"
        >
          <Link to="/profesional/mensajes">
            <MessageCircle className="h-6 w-6" />
            Mensajes
          </Link>
        </Button>

        <h2 className="text-lg font-semibold text-gray-700">
          Mis participantes
        </h2>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && participantes?.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Todavía no tienes participantes asignados. Comparte tu código de
              vinculación para que puedan registrarse.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {participantes?.map((p) => (
            <Link key={p.id} to={`/profesional/participante/${p.id}`}>
              <Card
                className={
                  p.alertaPendiente ? "border-red-400 border-2 bg-red-50" : ""
                }
              >
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {p.nombre}
                      {p.alertaPendiente && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" /> Alerta
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {p.ultimaFecha
                        ? `Última sesión: ${format(
                            parseISO(p.ultimaFecha),
                            "d 'de' MMMM, yyyy",
                            { locale: es },
                          )}`
                        : "Sin sesiones registradas"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardProfesional;
