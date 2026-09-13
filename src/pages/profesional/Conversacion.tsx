import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatConversacion } from "@/components/ChatConversacion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { ArrowLeft } from "lucide-react";

const ConversacionProfesional = () => {
  const { id } = useParams<{ id: string }>();
  const { perfil } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["conversacion-detalle", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: conversacion, error } = await supabase
        .from("conversaciones")
        .select("id, participante_id, atendida")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: participante } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("id", conversacion.participante_id)
        .single();

      return {
        atendida: conversacion.atendida,
        nombreParticipante: participante?.nombre ?? "Participante",
      };
    },
  });

  const alternarAtendida = async () => {
    if (!id || !data) return;
    const { error } = await supabase
      .from("conversaciones")
      .update({ atendida: !data.atendida })
      .eq("id", id);

    if (error) {
      showError("No se pudo actualizar el estado de la conversación.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["conversacion-detalle", id] });
    queryClient.invalidateQueries({ queryKey: ["conversaciones-profesional"] });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-lg mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <Link
            to="/profesional/mensajes"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          {data && (
            <Button variant="outline" size="sm" onClick={alternarAtendida}>
              {data.atendida ? "Marcar como pendiente" : "Marcar como atendida"}
            </Button>
          )}
        </div>

        {isLoading && <Skeleton className="h-96 w-full" />}

        {data && id && perfil && (
          <ChatConversacion
            conversacionId={id}
            miId={perfil.id}
            nombreOtraParte={data.nombreParticipante}
          />
        )}
      </div>
    </div>
  );
};

export default ConversacionProfesional;
