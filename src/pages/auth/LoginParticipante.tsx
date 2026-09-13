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
import { loginSchema, type LoginValues } from "@/lib/auth-schemas";
import { showError } from "@/utils/toast";
import { HeartPulse } from "lucide-react";

const LoginParticipante = () => {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: "", password: "" },
  });

  const onSubmit = async (valores: LoginValues) => {
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.correo,
      password: valores.password,
    });
    setEnviando(false);

    if (error) {
      showError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message,
      );
      return;
    }

    navigate("/participante", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <HeartPulse className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
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
                        autoComplete="current-password"
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
                {enviando ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
            <p>
              <Link
                to="/recuperar-password"
                className="text-blue-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p>
              ¿No tienes cuenta?{" "}
              <Link to="/registro" className="text-blue-600 hover:underline">
                Regístrate aquí
              </Link>
            </p>
            <p>
              ¿Eres profesional de la salud?{" "}
              <Link
                to="/profesional/login"
                className="text-blue-600 hover:underline"
              >
                Ingresa aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginParticipante;
