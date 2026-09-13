import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, ClipboardList, History, MessageCircle } from "lucide-react";

const DashboardParticipante = () => {
  const { perfil, cerrarSesion } = useAuth();

  const { data: proximaSesion, isLoading } = useQuery({
    queryKey: ["proxima-sesion", perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const hoy = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("sesiones_programadas")
        .select("id, fecha, hora, tipo")
        .eq("participante_id", perfil!.id)
        .gte("fecha", hoy)
        .is("registro_asociado_id", null)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Hola, {perfil?.nombre ?? "participante"}</h1>
          <Button variant="outline" onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <CalendarClock className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <CardTitle className="text-lg">Próxima sesión</CardTitle>
              <CardDescription>Tu siguiente sesión programada</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-6 w-2/3" />}
            {!isLoading && !proximaSesion && (
              <p className="text-gray-500">
                No tienes sesiones programadas por el momento.
              </p>
            )}
            {!isLoading && proximaSesion && (
              <p className="text-base">
                {format(
                  parseISO(proximaSesion.fecha),
                  "EEEE d 'de' MMMM",
                  { locale: es },
                )}
                {proximaSesion.hora ? ` · ${proximaSesion.hora}` : ""}
                {proximaSesion.tipo === "domiciliar"
                  ? " · Visita domiciliar"
                  : " · Telemonitoreo"}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button asChild size="lg" className="h-16 text-base justify-start gap-3">
            <Link to="/participante/registrar">
              <ClipboardList className="h-6 w-6" />
              Registrar sesión
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-16 text-base justify-start gap-3"
          >
            <Link to="/participante/historial">
              <History className="h-6 w-6" />
              Ver mi historial
            </Link>
          </Button>
        </div>

        <Button
          asChild
          variant="secondary"
          size="lg"
          className="w-full h-16 text-base justify-start gap-3"
        >
          <Link to="/participante/mensajes">
            <MessageCircle className="h-6 w-6" />
            Mensajes con mi profesional
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DashboardParticipante;
