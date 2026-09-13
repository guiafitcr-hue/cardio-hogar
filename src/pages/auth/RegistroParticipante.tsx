import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormDescription,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import {
  registroParticipanteSchema,
  type RegistroParticipanteValues,
} from "@/lib/auth-schemas";
import { showError } from "@/utils/toast";
import { HeartPulse } from "lucide-react";

const RegistroParticipante = () => {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<RegistroParticipanteValues>({
    resolver: zodResolver(registroParticipanteSchema),
    defaultValues: {
      nombre: "",
      correo: "",
      password: "",
      confirmarPassword: "",
      codigoVinculacion: "",
      telefono: "",
      fechaNacimiento: "",
      diagnosticoCardiaco: "",
    },
  });

  const onSubmit = async (valores: RegistroParticipanteValues) => {
    setEnviando(true);

    // 1. Validar el código de vinculación y obtener el id del profesional asignado
    // (función SECURITY DEFINER: evita que el participante necesite leer la tabla
    // de usuarios de otra persona antes de tener su propia sesión/perfil).
    const { data: profesionalId, error: errorCodigo } = await supabase.rpc(
      "obtener_profesional_por_codigo",
      { codigo: valores.codigoVinculacion.trim() },
    );

    if (errorCodigo) {
      setEnviando(false);
      showError("No se pudo validar el código de vinculación. Intenta de nuevo.");
      return;
    }

    if (!profesionalId) {
      setEnviando(false);
      form.setError("codigoVinculacion", {
        message:
          "El código de vinculación no es válido. Verifícalo con tu profesional.",
      });
      return;
    }

    // 2. Crear la cuenta de autenticación
    const { data: datosAuth, error: errorAuth } = await supabase.auth.signUp({
      email: valores.correo,
      password: valores.password,
    });

    if (errorAuth) {
      setEnviando(false);
      showError(
        errorAuth.message === "User already registered"
          ? "Ya existe una cuenta con ese correo."
          : errorAuth.message,
      );
      return;
    }

    const nuevoUsuarioId = datosAuth.user?.id;
    if (!nuevoUsuarioId) {
      setEnviando(false);
      showError("No se pudo crear la cuenta. Intenta de nuevo.");
      return;
    }

    // 3. Crear el perfil en la tabla usuarios
    const { error: errorPerfil } = await supabase.from("usuarios").insert({
      id: nuevoUsuarioId,
      rol: "participante",
      nombre: valores.nombre,
      correo: valores.correo,
      profesional_asignado_id: profesionalId,
      codigo_vinculacion_usado: valores.codigoVinculacion.trim(),
      telefono: valores.telefono || null,
      fecha_nacimiento: valores.fechaNacimiento || null,
      diagnostico_cardiaco: valores.diagnosticoCardiaco || null,
    });

    setEnviando(false);

    if (errorPerfil) {
      showError(
        "Tu cuenta se creó, pero no se pudo guardar tu perfil. Contacta a tu profesional.",
      );
      return;
    }

    // Si el proyecto exige confirmación de correo, no habrá sesión activa todavía.
    if (!datosAuth.session) {
      navigate("/login", { replace: true });
      return;
    }

    navigate("/participante", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <HeartPulse className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>
            Plan de Rehabilitación Cardíaca en Casa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Nombre completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="correo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Correo electrónico
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmarPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Confirmar contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigoVinculacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Código de vinculación
                    </FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormDescription>
                      Te lo proporciona tu profesional de salud.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Teléfono (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaNacimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Fecha de nacimiento (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diagnosticoCardiaco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Diagnóstico cardíaco (opcional)
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
                {enviando ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistroParticipante;
