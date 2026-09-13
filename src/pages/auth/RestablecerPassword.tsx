import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  restablecerPasswordSchema,
  type RestablecerPasswordValues,
} from "@/lib/auth-schemas";
import { showError, showSuccess } from "@/utils/toast";
import { HeartPulse } from "lucide-react";

const RestablecerPassword = () => {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [listoParaRestablecer, setListoParaRestablecer] = useState(false);

  // El enlace del correo crea una sesión temporal de tipo "recovery".
  // Esperamos ese evento antes de mostrar el formulario.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") {
        setListoParaRestablecer(true);
      }
    });

    // Si la sesión de recuperación ya se estableció antes de montar este
    // listener, igual dejamos intentar el envío.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setListoParaRestablecer(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const form = useForm<RestablecerPasswordValues>({
    resolver: zodResolver(restablecerPasswordSchema),
    defaultValues: { password: "", confirmarPassword: "" },
  });

  const onSubmit = async (valores: RestablecerPasswordValues) => {
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({
      password: valores.password,
    });
    setEnviando(false);

    if (error) {
      showError(
        "No se pudo actualizar la contraseña. El enlace pudo haber expirado; solicita uno nuevo.",
      );
      return;
    }

    showSuccess("Contraseña actualizada correctamente.");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <HeartPulse className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            Elige una nueva contraseña para tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!listoParaRestablecer && (
            <p className="text-sm text-gray-500 mb-4 text-center">
              Verificando el enlace de recuperación...
            </p>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Nueva contraseña
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
                {enviando ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestablecerPassword;
