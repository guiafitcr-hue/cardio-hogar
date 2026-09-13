import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type Rol } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  /** Roles permitidos para acceder a esta rama de rutas. */
  rolesPermitidos: Rol[];
  /** Ruta de login a la que redirigir si no hay sesión activa. */
  loginPath: string;
}

function PantallaCargando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-8 w-2/3 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

/**
 * Protege un árbol de rutas: exige sesión activa y un rol específico
 * (participante o profesional). Se usa como elemento de una ruta padre
 * junto con rutas hijas renderizadas mediante <Outlet />.
 */
export function ProtectedRoute({
  rolesPermitidos,
  loginPath,
}: ProtectedRouteProps) {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <PantallaCargando />;
  }

  if (!session) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // La sesión existe pero el perfil aún no ha llegado (o falló la carga).
  if (!perfil) {
    return <PantallaCargando />;
  }

  if (!rolesPermitidos.includes(perfil.rol)) {
    // Usuario autenticado pero con el rol equivocado para esta rama:
    // lo mandamos a su propio panel en vez de mostrarle un error.
    const destino = perfil.rol === "profesional" ? "/profesional" : "/participante";
    return <Navigate to={destino} replace />;
  }

  return <Outlet />;
}
