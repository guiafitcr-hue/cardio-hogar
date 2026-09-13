import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Trash2 } from "lucide-react";

interface SesionProgramada {
  id: string;
  fecha: string;
  hora: string | null;
  tipo: string | null;
  registro_asociado_id: string | null;
}

interface GestionSesionesProgramadasProps {
  participanteId: string;
}

const HOY = format(new Date(), "yyyy-MM-dd");

export function GestionSesionesProgramadas({
  participanteId,
}: GestionSesionesProgramadasProps) {
  const queryClient = useQueryClient();
  const queryKey = ["sesiones-programadas-gestion", participanteId];

  const [fecha, setFecha] = useState(HOY);
  const [hora, setHora] = useState("09:00");
  const [tipo, setTipo] = useState<"telemonitoreo" | "domiciliar">(
    "telemonitoreo",
  );
  const [numeroSemanas, setNumeroSemanas] = useState(1);
  const [guardando, setGuardando] = useState(false);

  const { data: programadas } = useQuery({
    queryKey,
    queryFn: async (): Promise<SesionProgramada[]> => {
      const { data, error } = await supabase
        .from("sesiones_programadas")
        .select("id, fecha, hora, tipo, registro_asociado_id")
        .eq("participante_id", participanteId)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const agregarSesiones = async () => {
    if (!fecha) {
      showError("Selecciona una fecha de inicio.");
      return;
    }
    setGuardando(true);

    const filas = Array.from({ length: Math.max(1, numeroSemanas) }).map(
      (_, i) => ({
        participante_id: participanteId,
        fecha: format(addWeeks(parseISO(fecha), i), "yyyy-MM-dd"),
        hora,
        tipo,
      }),
    );

    const { error } = await supabase.from("sesiones_programadas").insert(filas);
    setGuardando(false);

    if (error) {
      showError("No se pudieron programar las sesiones.");
      return;
    }

    showSuccess(
      filas.length > 1
        ? `${filas.length} sesiones programadas.`
        : "Sesión programada.",
    );
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["proxima-sesion"] });
  };

  const eliminarSesion = async (id: string) => {
    const { error } = await supabase
      .from("sesiones_programadas")
      .delete()
      .eq("id", id);

    if (error) {
      showError("No se pudo eliminar la sesión programada.");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calendario de sesiones programadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="fecha-programada">Fecha de inicio</Label>
            <Input
              id="fecha-programada"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hora-programada">Hora</Label>
            <Input
              id="hora-programada"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telemonitoreo">Telemonitoreo</SelectItem>
                <SelectItem value="domiciliar">Visita domiciliar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="semanas-programada">Repetir (semanas)</Label>
            <Input
              id="semanas-programada"
              type="number"
              min={1}
              max={12}
              className="w-24"
              value={numeroSemanas}
              onChange={(e) => setNumeroSemanas(Number(e.target.value))}
            />
          </div>
          <Button onClick={agregarSesiones} disabled={guardando}>
            {guardando ? "Guardando..." : "Programar"}
          </Button>
        </div>

        <div className="space-y-2">
          {programadas?.length === 0 && (
            <p className="text-sm text-gray-500">
              No hay sesiones programadas todavía.
            </p>
          )}
          {programadas?.map((s) => {
            const atrasada = s.fecha < HOY && !s.registro_asociado_id;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border p-2 text-sm ${
                  atrasada ? "border-amber-400 bg-amber-50" : ""
                }`}
              >
                <div>
                  <span className="font-medium">
                    {format(parseISO(s.fecha), "d 'de' MMMM", { locale: es })}
                  </span>
                  {s.hora && <span> · {s.hora}</span>}
                  <span> · {s.tipo === "domiciliar" ? "Domiciliar" : "Telemonitoreo"}</span>
                  {s.registro_asociado_id && (
                    <Badge variant="outline" className="ml-2 text-green-700 border-green-400">
                      Completada
                    </Badge>
                  )}
                  {atrasada && (
                    <Badge variant="outline" className="ml-2 text-amber-700 border-amber-400">
                      Sin registrar
                    </Badge>
                  )}
                </div>
                {!s.registro_asociado_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarSesion(s.id)}
                    aria-label="Eliminar sesión programada"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
