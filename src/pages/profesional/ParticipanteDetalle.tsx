import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { GestionSesionesProgramadas } from "@/components/GestionSesionesProgramadas";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";

interface Sesion {
  id: string;
  fecha: string;
  duracion_minutos: number | null;
  fc_max: number | null;
  rpe: number | null;
  cumplimiento: string | null;
  motivo_incumplimiento: string | null;
  sintomas_grupo_a: string[] | null;
  sintomas_grupo_b: string[] | null;
  alerta: boolean | null;
  nivel_alerta: string | null;
  comentarios: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  nota_profesional: string | null;
}

const ParticipanteDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const { perfil } = useAuth();
  const queryClient = useQueryClient();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sesionEnRevision, setSesionEnRevision] = useState<Sesion | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoRevision, setGuardandoRevision] = useState(false);

  const { data: participante } = useQuery({
    queryKey: ["participante", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, correo, telefono, diagnostico_cardiaco")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sesiones, isLoading: cargandoSesiones } = useQuery({
    queryKey: ["sesiones-participante", id, desde, hasta],
    enabled: !!id,
    queryFn: async (): Promise<Sesion[]> => {
      let consulta = supabase
        .from("sesiones")
        .select(
          "id, fecha, duracion_minutos, fc_max, rpe, cumplimiento, motivo_incumplimiento, sintomas_grupo_a, sintomas_grupo_b, alerta, nivel_alerta, comentarios, revisado_por, fecha_revision, nota_profesional",
        )
        .eq("participante_id", id)
        .order("fecha", { ascending: false });

      if (desde) consulta = consulta.gte("fecha", desde);
      if (hasta) consulta = consulta.lte("fecha", hasta);

      const { data, error } = await consulta;
      if (error) throw error;
      return data;
    },
  });

  const { data: programadas } = useQuery({
    queryKey: ["programadas-participante", id, desde, hasta],
    enabled: !!id,
    queryFn: async () => {
      let consulta = supabase
        .from("sesiones_programadas")
        .select("id, fecha, registro_asociado_id")
        .eq("participante_id", id);

      if (desde) consulta = consulta.gte("fecha", desde);
      if (hasta) consulta = consulta.lte("fecha", hasta);

      const { data, error } = await consulta;
      if (error) throw error;
      return data;
    },
  });

  const estadisticas = useMemo(() => {
    const totalProgramadas = programadas?.length ?? 0;
    const completadasProgramadas =
      programadas?.filter((p) => p.registro_asociado_id).length ?? 0;
    const adherencia =
      totalProgramadas > 0
        ? Math.round((completadasProgramadas / totalProgramadas) * 100)
        : null;
    const totalCompletas =
      sesiones?.filter((s) => s.cumplimiento === "Completo").length ?? 0;

    const porSemanaMap = new Map<string, number>();
    (sesiones ?? []).forEach((s) => {
      const inicioSemana = format(
        startOfWeek(parseISO(s.fecha), { weekStartsOn: 1 }),
        "d MMM",
        { locale: es },
      );
      porSemanaMap.set(inicioSemana, (porSemanaMap.get(inicioSemana) ?? 0) + 1);
    });
    const porSemana = Array.from(porSemanaMap.entries()).map(
      ([semana, cantidad]) => ({ semana, cantidad }),
    );

    const datosEvolucion = [...(sesiones ?? [])]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((s) => ({
        fecha: format(parseISO(s.fecha), "d MMM", { locale: es }),
        fcMax: s.fc_max,
        rpe: s.rpe,
        duracion: s.duracion_minutos,
      }));

    const frecuenciaSintomas = new Map<string, number>();
    (sesiones ?? []).forEach((s) => {
      [...(s.sintomas_grupo_a ?? []), ...(s.sintomas_grupo_b ?? [])].forEach(
        (sintoma) => {
          frecuenciaSintomas.set(sintoma, (frecuenciaSintomas.get(sintoma) ?? 0) + 1);
        },
      );
    });
    const sintomasOrdenados = Array.from(frecuenciaSintomas.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    return {
      totalProgramadas,
      completadasProgramadas,
      adherencia,
      totalCompletas,
      porSemana,
      datosEvolucion,
      sintomasOrdenados,
    };
  }, [sesiones, programadas]);

  const abrirRevision = (sesion: Sesion) => {
    setSesionEnRevision(sesion);
    setNotaTexto(sesion.nota_profesional ?? "");
  };

  const guardarRevision = async () => {
    if (!sesionEnRevision || !perfil) return;
    setGuardandoRevision(true);

    const { error } = await supabase
      .from("sesiones")
      .update({
        revisado_por: perfil.id,
        fecha_revision: new Date().toISOString(),
        nota_profesional: notaTexto || null,
      })
      .eq("id", sesionEnRevision.id);

    setGuardandoRevision(false);

    if (error) {
      showError("No se pudo guardar la revisión. Intenta de nuevo.");
      return;
    }

    showSuccess("Alerta marcada como revisada.");
    setSesionEnRevision(null);
    queryClient.invalidateQueries({ queryKey: ["sesiones-participante", id] });
    queryClient.invalidateQueries({ queryKey: ["participantes-asignados"] });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          to="/profesional"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a mis participantes
        </Link>

        <div>
          <h1 className="text-2xl font-bold">
            {participante?.nombre ?? "Participante"}
          </h1>
          {participante?.diagnostico_cardiaco && (
            <p className="text-sm text-gray-500">
              {participante.diagnostico_cardiaco}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtrar por fecha</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="desde">Desde</Label>
              <Input
                id="desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hasta">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            {(desde || hasta) && (
              <Button
                variant="outline"
                onClick={() => {
                  setDesde("");
                  setHasta("");
                }}
              >
                Limpiar
              </Button>
            )}
          </CardContent>
        </Card>

        {id && <GestionSesionesProgramadas participanteId={id} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">
                {estadisticas.adherencia != null
                  ? `${estadisticas.adherencia}%`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500">Adherencia</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{estadisticas.totalCompletas}</p>
              <p className="text-xs text-gray-500">Sesiones completadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">
                {estadisticas.completadasProgramadas}/{estadisticas.totalProgramadas}
              </p>
              <p className="text-xs text-gray-500">Programadas realizadas</p>
            </CardContent>
          </Card>
        </div>

        {estadisticas.datosEvolucion.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Frecuencia cardíaca máxima (lpm)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={estadisticas.datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="fcMax" stroke="#dc2626" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Percepción del esfuerzo (RPE)</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={estadisticas.datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" fontSize={11} />
                    <YAxis fontSize={11} domain={[0, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rpe" stroke="#ea580c" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Duración del ejercicio (min)</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={estadisticas.datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="duracion" stroke="#2563eb" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sesiones por semana</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estadisticas.porSemana}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {estadisticas.sintomasOrdenados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Síntomas reportados en el período</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {estadisticas.sintomasOrdenados.map(([sintoma, cantidad]) => (
                <Badge key={sintoma} variant="secondary">
                  {sintoma} ({cantidad})
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold text-gray-700">
          Historial cronológico
        </h2>

        {cargandoSesiones && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!cargandoSesiones && sesiones?.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No hay sesiones registradas en este período.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {sesiones?.map((s) => {
            const pendienteRevision = s.alerta && !s.revisado_por;
            return (
              <Card
                key={s.id}
                className={
                  s.alerta
                    ? pendienteRevision
                      ? "border-red-400 border-2 bg-red-50"
                      : "border-red-200"
                    : ""
                }
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {format(parseISO(s.fecha), "EEEE d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </p>
                    {s.alerta &&
                      (pendienteRevision ? (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" /> Pendiente de revisión
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-green-700 border-green-400"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Revisada
                        </Badge>
                      ))}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {s.duracion_minutos != null && <span>{s.duracion_minutos} min</span>}
                    {s.fc_max != null && <span>· {s.fc_max} lpm</span>}
                    {s.rpe != null && <span>· RPE {s.rpe}/10</span>}
                    {s.cumplimiento && <span>· {s.cumplimiento}</span>}
                  </div>

                  {s.motivo_incumplimiento && (
                    <p className="text-sm text-gray-500">
                      Motivo: {s.motivo_incumplimiento}
                    </p>
                  )}

                  {((s.sintomas_grupo_a?.length ?? 0) > 0 ||
                    (s.sintomas_grupo_b?.length ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {s.sintomas_grupo_a?.map((sintoma) => (
                        <Badge key={sintoma} variant="destructive">
                          {sintoma}
                        </Badge>
                      ))}
                      {s.sintomas_grupo_b?.map((sintoma) => (
                        <Badge
                          key={sintoma}
                          className="bg-yellow-100 text-yellow-800 border-yellow-300"
                          variant="outline"
                        >
                          {sintoma}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {s.comentarios && (
                    <p className="text-sm text-gray-500 italic">"{s.comentarios}"</p>
                  )}

                  {s.nota_profesional && (
                    <p className="text-sm text-blue-700">
                      Nota profesional: {s.nota_profesional}
                    </p>
                  )}

                  {pendienteRevision && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirRevision(s)}
                    >
                      Marcar como revisada
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!sesionEnRevision}
        onOpenChange={(abierto) => !abierto && setSesionEnRevision(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar alerta como revisada</DialogTitle>
            <DialogDescription>
              Agrega una nota opcional sobre el seguimiento de esta alerta.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notaTexto}
            onChange={(e) => setNotaTexto(e.target.value)}
            placeholder="Nota del profesional (opcional)"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSesionEnRevision(null)}
              disabled={guardandoRevision}
            >
              Cancelar
            </Button>
            <Button onClick={guardarRevision} disabled={guardandoRevision}>
              {guardandoRevision ? "Guardando..." : "Confirmar revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipanteDetalle;
