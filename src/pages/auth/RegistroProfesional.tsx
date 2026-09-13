import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import {
  registroProfesionalSchema,
  type RegistroProfesionalValues,
} from "@/lib/auth-schemas";
import { showError } from "@/utils/toast";
import { Stethoscope } from "lucide-react";

const RegistroProfesional = () => {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<RegistroProfesionalValues>({
    resolver: zodResolver(registroProfesionalSchema),
    defaultValues: {
      nombre: "",
      correo: "",
      password: "",
      confirmarPassword: "",
    },
  });

  const onSubmit = async (valores: RegistroProfesionalValues) => {
    setEnviando(true);

    // 1. El correo debe estar pre-autorizado (no hay autorregistro abierto).
    const { data: autorizado, error: errorAutorizado } = await supabase
      .from("profesionales_autorizados")
      .select("correo")
      .eq("correo", valores.correo)
      .maybeSingle();

    if (errorAutorizado) {
      setEnviando(false);
      showError("No se pudo verificar tu correo. Intenta de nuevo.");
      return;
    }

    if (!autorizado) {
      setEnviando(false);
      form.setError("correo", {
        message:
          "Este correo no está autorizado como profesional. Contacta al equipo del programa.",
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
      rol: "profesional",
      nombre: valores.nombre,
      correo: valores.correo,
    });

    setEnviando(false);

    if (errorPerfil) {
      showError(
        "Tu cuenta se creó, pero no se pudo guardar tu perfil. Contacta al equipo del programa.",
      );
      return;
    }

    if (!datosAuth.session) {
      navigate("/profesional/login", { replace: true });
      return;
    }

    navigate("/profesional", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Stethoscope className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Completar registro</CardTitle>
          <CardDescription>
            Solo para correos autorizados por el programa
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
                      Correo electrónico autorizado
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
              <Link
                to="/profesional/login"
                className="text-blue-600 hover:underline"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistroProfesional;
