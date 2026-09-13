import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginParticipante from "./pages/auth/LoginParticipante";
import RegistroParticipante from "./pages/auth/RegistroParticipante";
import LoginProfesional from "./pages/auth/LoginProfesional";
import RegistroProfesional from "./pages/auth/RegistroProfesional";
import RecuperarPassword from "./pages/auth/RecuperarPassword";
import RestablecerPassword from "./pages/auth/RestablecerPassword";
import DashboardParticipante from "./pages/participante/Dashboard";
import RegistrarSesion from "./pages/participante/RegistrarSesion";
import HistorialParticipante from "./pages/participante/Historial";
import MensajesParticipante from "./pages/participante/Mensajes";
import DashboardProfesional from "./pages/profesional/Dashboard";
import ParticipanteDetalle from "./pages/profesional/ParticipanteDetalle";
import MensajesProfesional from "./pages/profesional/Mensajes";
import ConversacionProfesional from "./pages/profesional/Conversacion";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginParticipante />} />
            <Route path="/registro" element={<RegistroParticipante />} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />
            <Route path="/restablecer-password" element={<RestablecerPassword />} />
            <Route path="/profesional/login" element={<LoginProfesional />} />
            <Route path="/profesional/registro" element={<RegistroProfesional />} />

            <Route
              element={
                <ProtectedRoute rolesPermitidos={["participante"]} loginPath="/login" />
              }
            >
              <Route path="/participante" element={<DashboardParticipante />} />
              <Route path="/participante/registrar" element={<RegistrarSesion />} />
              <Route path="/participante/historial" element={<HistorialParticipante />} />
              <Route path="/participante/mensajes" element={<MensajesParticipante />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  rolesPermitidos={["profesional"]}
                  loginPath="/profesional/login"
                />
              }
            >
              <Route path="/profesional" element={<DashboardProfesional />} />
              <Route
                path="/profesional/participante/:id"
                element={<ParticipanteDetalle />}
              />
              <Route path="/profesional/mensajes" element={<MensajesProfesional />} />
              <Route
                path="/profesional/mensajes/:id"
                element={<ConversacionProfesional />}
              />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
