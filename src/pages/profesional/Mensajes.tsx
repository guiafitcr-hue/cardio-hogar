import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface ConversacionResumen {
  id: string;
  ultimo_mensaje_fecha: string | null;
  atendida: boolean | null;
  nombreParticipante: string;
  noLeidos: number;
}

const MensajesProfesional = () => {
  const { perfil } = useAuth();

  const { data: conversaciones, isLoading } = useQuery({
    queryKey: ["conversaciones-profesional", perfil?.id],
    enabled: !!perfil,
    queryFn: async (): Promise<ConversacionResumen[]> => {
      const { data: convs, error } = await supabase
        .from("conversaciones")
        .select("id, participante_id, ultimo_mensaje_fecha, atendida")
        .eq("profesional_id", perfil!.id)
        .order("ultimo_mensaje_fecha", { ascending: false });

      if (error) throw error;
      if (!convs || convs.length === 0) return [];

      const participanteIds = convs.map((c) => c.participante_id);
      const conversacionIds = convs.map((c) => c.id);

      const [{ data: participantes }, { data: noLeidos }] = await Promise.all([
        supabase.from("usuarios").select("id, nombre").in("id", participanteIds),
        supabase
          .from("mensajes")
          .select("conversacion_id")
          .in("conversacion_id", conversacionIds)
          .eq("leido", false)
          .neq("emisor_id", perfil!.id),
      ]);

      const nombrePorId = new Map(
        (participantes ?? []).map((p) => [p.id, p.nombre]),
      );
      const noLeidosPorConversacion = new Map<string, number>();
      (noLeidos ?? []).forEach((m) => {
        noLeidosPorConversacion.set(
          m.conversacion_id,
          (noLeidosPorConversacion.get(m.conversacion_id) ?? 0) + 1,
        );
      });

      return convs.map((c) => ({
        id: c.id,
        ultimo_mensaje_fecha: c.ultimo_mensaje_fecha,
        atendida: c.atendida,
        nombreParticipante: nombrePorId.get(c.participante_id) ?? "Participante",
        noLeidos: noLeidosPorConversacion.get(c.id) ?? 0,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        <Link
          to="/profesional"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <h1 className="text-2xl font-bold">Mensajes</h1>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading && conversaciones?.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Todavía no tienes conversaciones.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {conversaciones?.map((c) => (
            <Link key={c.id} to={`/profesional/mensajes/${c.id}`}>
              <Card>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {c.nombreParticipante}
                      {c.noLeidos > 0 && (
                        <Badge>{c.noLeidos} nuevo{c.noLeidos > 1 ? "s" : ""}</Badge>
                      )}
                      {c.atendida && (
                        <Badge variant="outline" className="text-gray-500">
                          Atendida
                        </Badge>
                      )}
                    </p>
                    {c.ultimo_mensaje_fecha && (
                      <p className="text-sm text-gray-500">
                        {format(
                          parseISO(c.ultimo_mensaje_fecha),
                          "d MMM, HH:mm",
                          { locale: es },
                        )}
                      </p>
                    )}
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

export default MensajesProfesional;
