import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EscalaBorg } from "@/components/EscalaBorg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  registroSesionSchema,
  type RegistroSesionValues,
  SINTOMAS_GRUPO_A,
  SINTOMAS_GRUPO_B,
  OPCIONES_CUMPLIMIENTO,
} from "@/lib/sesiones-schema";
import { showError, showSuccess } from "@/utils/toast";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const RegistrarSesion = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [mostrarAlertaCritica, setMostrarAlertaCritica] = useState(false);

  const form = useForm<RegistroSesionValues>({
    resolver: zodResolver(registroSesionSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      duracionMinutos: undefined as unknown as number,
      fcMax: undefined as unknown as number,
      rpe: 0,
      cumplimiento: undefined as unknown as RegistroSesionValues["cumplimiento"],
      motivoIncumplimiento: "",
      sintomasGrupoA: [],
      sintomasGrupoB: [],
      otro: false,
      otroDescripcion: "",
      comentarios: "",
    },
  });

  const cumplimiento = form.watch("cumplimiento");
  const sintomasGrupoA = form.watch("sintomasGrupoA");
  const sintomasGrupoB = form.watch("sintomasGrupoB");
  const otro = form.watch("otro");
  const sinSintomas =
    sintomasGrupoA.length === 0 && sintomasGrupoB.length === 0 && !otro;

  const alternarSintoma = (
    campo: "sintomasGrupoA" | "sintomasGrupoB",
    sintoma: string,
    marcado: boolean,
  ) => {
    const actual = form.getValues(campo);
    form.setValue(
      campo,
      marcado ? [...actual, sintoma] : actual.filter((s) => s !== sintoma),
      { shouldValidate: true },
    );
  };

  const limpiarSintomas = () => {
    form.setValue("sintomasGrupoA", []);
    form.setValue("sintomasGrupoB", []);
    form.setValue("otro", false);
    form.setValue("otroDescripcion", "");
  };

  const onSubmit = async (valores: RegistroSesionValues) => {
    if (!perfil) return;
    setEnviando(true);

    const sintomasBConOtro = [
      ...valores.sintomasGrupoB,
      ...(valores.otro && valores.otroDescripcion
        ? [`Otro: ${valores.otroDescripcion.trim()}`]
        : []),
    ];
    const esCritica = valores.sintomasGrupoA.length > 0;

    const { data: nuevaSesion, error } = await supabase
      .from("sesiones")
      .insert({
        participante_id: perfil.id,
        fecha: valores.fecha,
        duracion_minutos: valores.duracionMinutos,
        fc_max: valores.fcMax,
        rpe: valores.rpe,
        cumplimiento: valores.cumplimiento,
        motivo_incumplimiento:
          valores.cumplimiento === "Completo"
            ? null
            : valores.motivoIncumplimiento || null,
        sintomas_grupo_a: valores.sintomasGrupoA,
        sintomas_grupo_b: sintomasBConOtro,
        alerta: esCritica,
        nivel_alerta: esCritica ? "critico" : "ninguno",
        comentarios: valores.comentarios || null,
      })
      .select("id")
      .single();

    if (error || !nuevaSesion) {
      setEnviando(false);
      showError("No se pudo guardar la sesión. Intenta de nuevo.");
      return;
    }

    // Si había una sesión programada para hoy sin registro asociado, la
    // vinculamos con este registro (mejor esfuerzo: no bloquea el guardado).
    await supabase
      .from("sesiones_programadas")
      .update({ registro_asociado_id: nuevaSesion.id })
      .eq("participante_id", perfil.id)
      .eq("fecha", valores.fecha)
      .is("registro_asociado_id", null);

    // Si hay alerta crítica, documentamos el síntoma automáticamente en la
    // conversación con el profesional asignado (mejor esfuerzo: no bloquea
    // el guardado de la sesión si esto falla).
    if (esCritica && perfil.profesional_asignado_id) {
      try {
        const profesionalId = perfil.profesional_asignado_id;
        const { data: conversacionExistente } = await supabase
          .from("conversaciones")
          .select("id")
          .eq("participante_id", perfil.id)
          .eq("profesional_id", profesionalId)
          .maybeSingle();

        let conversacionId = conversacionExistente?.id as string | undefined;

        if (!conversacionId) {
          const { data: nuevaConversacion } = await supabase
            .from("conversaciones")
            .insert({ participante_id: perfil.id, profesional_id: profesionalId })
            .select("id")
            .single();
          conversacionId = nuevaConversacion?.id;
        }

        if (conversacionId) {
          await supabase.from("mensajes").insert({
            conversacion_id: conversacionId,
            emisor_id: perfil.id,
            es_mensaje_sistema: true,
            texto: `Alerta automática: se reportó "${valores.sintomasGrupoA.join(", ")}" durante la sesión del ${valores.fecha}.`,
          });
        }
      } catch {
        // No bloquea el flujo principal; el profesional igual verá la
        // alerta destacada en su panel de seguimiento.
      }
    }

    setEnviando(false);

    if (esCritica) {
      setMostrarAlertaCritica(true);
      return;
    }

    showSuccess("Sesión registrada correctamente.");
    navigate("/participante", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        <Link
          to="/participante"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Registrar sesión</CardTitle>
            <CardDescription>
              Cuéntanos cómo te fue en tu sesión de ejercicio de hoy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Fecha de la sesión
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duracionMinutos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Duración del ejercicio (minutos)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-12 text-base"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fcMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Frecuencia cardíaca máxima (lpm)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-12 text-base"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rpe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Percepción del esfuerzo (0 = nada, 10 = máximo)
                      </FormLabel>
                      <FormControl>
                        <EscalaBorg value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cumplimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Cumplimiento del ejercicio
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="gap-3"
                        >
                          {OPCIONES_CUMPLIMIENTO.map((opcion) => (
                            <label
                              key={opcion}
                              htmlFor={`cumplimiento-${opcion}`}
                              className="flex items-center gap-3 rounded-lg border p-3 text-base cursor-pointer"
                            >
                              <RadioGroupItem
                                value={opcion}
                                id={`cumplimiento-${opcion}`}
                                className="h-5 w-5"
                              />
                              {opcion}
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {cumplimiento && cumplimiento !== "Completo" && (
                  <FormField
                    control={form.control}
                    name="motivoIncumplimiento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">
                          ¿Qué motivo tuvo?
                        </FormLabel>
                        <FormControl>
                          <Textarea className="text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-3">
                  <FormLabel className="text-base">
                    ¿Tuviste alguno de estos síntomas?
                  </FormLabel>

                  <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-red-700">
                      Síntomas de alarma
                    </p>
                    {SINTOMAS_GRUPO_A.map((sintoma) => (
                      <label
                        key={sintoma}
                        className="flex items-start gap-3 text-base cursor-pointer"
                      >
                        <Checkbox
                          className="h-6 w-6 mt-0.5"
                          checked={sintomasGrupoA.includes(sintoma)}
                          onCheckedChange={(marcado) =>
                            alternarSintoma("sintomasGrupoA", sintoma, marcado === true)
                          }
                        />
                        <span>{sintoma}</span>
                      </label>
                    ))}
                  </div>

                  <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-yellow-800">
                      Síntomas a monitorear
                    </p>
                    {SINTOMAS_GRUPO_B.map((sintoma) => (
                      <label
                        key={sintoma}
                        className="flex items-start gap-3 text-base cursor-pointer"
                      >
                        <Checkbox
                          className="h-6 w-6 mt-0.5"
                          checked={sintomasGrupoB.includes(sintoma)}
                          onCheckedChange={(marcado) =>
                            alternarSintoma("sintomasGrupoB", sintoma, marcado === true)
                          }
                        />
                        <span>{sintoma}</span>
                      </label>
                    ))}
                    <label className="flex items-start gap-3 text-base cursor-pointer">
                      <Checkbox
                        className="h-6 w-6 mt-0.5"
                        checked={otro}
                        onCheckedChange={(marcado) =>
                          form.setValue("otro", marcado === true, {
                            shouldValidate: true,
                          })
                        }
                      />
                      <span>Otro</span>
                    </label>
                    {otro && (
                      <FormField
                        control={form.control}
                        name="otroDescripcion"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Describe el síntoma"
                                className="text-base bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <label className="flex items-center gap-3 text-base cursor-pointer text-gray-600">
                    <Checkbox
                      className="h-6 w-6"
                      checked={sinSintomas}
                      onCheckedChange={(marcado) => {
                        if (marcado) limpiarSintomas();
                      }}
                    />
                    Ninguno de los síntomas anteriores
                  </label>
                </div>

                <FormField
                  control={form.control}
                  name="comentarios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Comentarios adicionales (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea className="text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={enviando}
                >
                  {enviando ? "Guardando..." : "Guardar sesión"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={mostrarAlertaCritica}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Síntoma de alarma registrado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base text-gray-700">
              Tu registro se guardó y tu profesional será notificado. Si el
              síntoma es severo o continúa, contacta de inmediato a tu
              profesional de salud o a los servicios de emergencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="w-full h-12 text-base"
              onClick={() => navigate("/participante", { replace: true })}
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegistrarSesion;
