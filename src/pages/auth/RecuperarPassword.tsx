import { useState } from "react";
import { Link } from "react-router-dom";
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
  recuperarPasswordSchema,
  type RecuperarPasswordValues,
} from "@/lib/auth-schemas";
import { showError } from "@/utils/toast";
import { HeartPulse, MailCheck } from "lucide-react";

const RecuperarPassword = () => {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const form = useForm<RecuperarPasswordValues>({
    resolver: zodResolver(recuperarPasswordSchema),
    defaultValues: { correo: "" },
  });

  const onSubmit = async (valores: RecuperarPasswordValues) => {
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      valores.correo,
      { redirectTo: `${window.location.origin}/restablecer-password` },
    );
    setEnviando(false);

    if (error) {
      showError(error.message);
      return;
    }

    // Mostramos el mismo mensaje exista o no la cuenta, para no revelar
    // qué correos están registrados.
    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <HeartPulse className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un enlace para crear una nueva
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="text-center space-y-3 py-4">
              <MailCheck className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-base text-gray-700">
                Si el correo está registrado, te enviamos un enlace para
                restablecer tu contraseña. Revisa tu bandeja de entrada.
              </p>
            </div>
          ) : (
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
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={enviando}
                >
                  {enviando ? "Enviando..." : "Enviar enlace"}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              <Link to="/login" className="text-blue-600 hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarPassword;
