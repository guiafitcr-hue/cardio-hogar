import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface SesionHistorial {
  id: string;
  fecha: string;
  duracion_minutos: number | null;
  fc_max: number | null;
  rpe: number | null;
  cumplimiento: string | null;
  sintomas_grupo_a: string[] | null;
  sintomas_grupo_b: string[] | null;
  alerta: boolean | null;
  comentarios: string | null;
}

const Historial = () => {
  const { perfil } = useAuth();

  const { data: sesiones, isLoading } = useQuery({
    queryKey: ["historial-sesiones", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sesiones")
        .select(
          "id, fecha, duracion_minutos, fc_max, rpe, cumplimiento, sintomas_grupo_a, sintomas_grupo_b, alerta, comentarios",
        )
        .eq("participante_id", perfil!.id)
        .order("fecha", { ascending: false })
        .order("creado_en", { ascending: false });

      if (error) throw error;
      return data as SesionHistorial[];
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        <Link
          to="/participante"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <h1 className="text-2xl font-bold">Tu historial de sesiones</h1>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!isLoading && sesiones?.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Todavía no has registrado ninguna sesión.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {sesiones?.map((sesion) => {
            const totalSintomas =
              (sesion.sintomas_grupo_a?.length ?? 0) +
              (sesion.sintomas_grupo_b?.length ?? 0);

            return (
              <Card
                key={sesion.id}
                className={sesion.alerta ? "border-red-400 border-2" : ""}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {format(parseISO(sesion.fecha), "EEEE d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </p>
                    {sesion.alerta && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" /> Alerta
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {sesion.duracion_minutos != null && (
                      <span>{sesion.duracion_minutos} min</span>
                    )}
                    {sesion.fc_max != null && <span>· {sesion.fc_max} lpm</span>}
                    {sesion.rpe != null && <span>· RPE {sesion.rpe}/10</span>}
                    {sesion.cumplimiento && (
                      <span>· {sesion.cumplimiento}</span>
                    )}
                  </div>

                  {totalSintomas > 0 && (
                    <p className="text-sm text-gray-600">
                      Síntomas reportados: {totalSintomas}
                    </p>
                  )}

                  {sesion.comentarios && (
                    <p className="text-sm text-gray-500 italic">
                      "{sesion.comentarios}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Historial;
