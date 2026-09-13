import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { HeartPulse } from "lucide-react";

const Index = () => {
  const { session, perfil, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-8 w-2/3 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (session && perfil) {
    return (
      <Navigate to={perfil.rol === "profesional" ? "/profesional" : "/participante"} replace />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <HeartPulse className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold">Plan de Rehabilitación Cardíaca en Casa</h1>
        <p className="text-gray-600">
          Registra tus sesiones de ejercicio, sigue tu progreso y mantente en contacto
          con tu profesional de salud.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/login">Soy participante</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/profesional/login">Soy profesional de la salud</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
