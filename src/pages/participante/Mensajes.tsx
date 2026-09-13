import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChatConversacion } from "@/components/ChatConversacion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

const MensajesParticipante = () => {
  const { perfil } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["conversacion-participante", perfil?.id],
    enabled: !!perfil?.profesional_asignado_id,
    queryFn: async () => {
      const profesionalId = perfil!.profesional_asignado_id as string;

      const { data: profesional } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("id", profesionalId)
        .single();

      const { data: existente } = await supabase
        .from("conversaciones")
        .select("id")
        .eq("participante_id", perfil!.id)
        .eq("profesional_id", profesionalId)
        .maybeSingle();

      if (existente) {
        return { conversacionId: existente.id, nombreProfesional: profesional?.nombre ?? "Profesional" };
      }

      const { data: nueva, error } = await supabase
        .from("conversaciones")
        .insert({ participante_id: perfil!.id, profesional_id: profesionalId })
        .select("id")
        .single();

      if (error) throw error;
      return { conversacionId: nueva.id, nombreProfesional: profesional?.nombre ?? "Profesional" };
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-lg mx-auto space-y-3">
        <Link
          to="/participante"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        {isLoading && <Skeleton className="h-96 w-full" />}

        {!isLoading && !perfil?.profesional_asignado_id && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No tienes un profesional asignado todavía.
            </CardContent>
          </Card>
        )}

        {data && (
          <ChatConversacion
            conversacionId={data.conversacionId}
            miId={perfil!.id}
            nombreOtraParte={data.nombreProfesional}
          />
        )}
      </div>
    </div>
  );
};

export default MensajesParticipante;
