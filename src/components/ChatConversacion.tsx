import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface Mensaje {
  id: string;
  conversacion_id: string;
  emisor_id: string | null;
  texto: string;
  fecha: string;
  leido: boolean;
  es_mensaje_sistema: boolean;
}

interface ChatConversacionProps {
  conversacionId: string;
  miId: string;
  nombreOtraParte: string;
}

export function ChatConversacion({
  conversacionId,
  miId,
  nombreOtraParte,
}: ChatConversacionProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finalRef = useRef<HTMLDivElement>(null);

  const queryKey = ["mensajes", conversacionId];

  const { data: mensajes } = useQuery({
    queryKey,
    queryFn: async (): Promise<Mensaje[]> => {
      const { data, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conversacionId)
        .order("fecha", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Suscripción en tiempo real a mensajes nuevos de esta conversación.
  useEffect(() => {
    const canal = supabase
      .channel(`mensajes-${conversacionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `conversacion_id=eq.${conversacionId}`,
        },
        (payload) => {
          queryClient.setQueryData<Mensaje[]>(queryKey, (actuales) => {
            const nuevo = payload.new as Mensaje;
            if (actuales?.some((m) => m.id === nuevo.id)) return actuales;
            return [...(actuales ?? []), nuevo];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionId]);

  // Marca como leídos los mensajes recibidos (no propios) al ver la conversación.
  useEffect(() => {
    const noLeidos = (mensajes ?? []).filter(
      (m) => m.emisor_id !== miId && !m.leido,
    );
    if (noLeidos.length === 0) return;

    supabase
      .from("mensajes")
      .update({ leido: true })
      .in(
        "id",
        noLeidos.map((m) => m.id),
      )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversaciones-profesional"] });
      });
  }, [mensajes, miId, queryClient]);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviarMensaje = async () => {
    const contenido = texto.trim();
    if (!contenido) return;
    setEnviando(true);
    setTexto("");

    const { error } = await supabase.from("mensajes").insert({
      conversacion_id: conversacionId,
      emisor_id: miId,
      texto: contenido,
      es_mensaje_sistema: false,
    });

    setEnviando(false);
    if (!error) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg border">
      <div className="border-b p-3 font-semibold">{nombreOtraParte}</div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mensajes?.map((m) => {
          if (m.es_mensaje_sistema) {
            return (
              <div
                key={m.id}
                className="mx-auto max-w-[90%] rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm px-3 py-2 text-center"
              >
                {m.texto}
                <div className="text-[10px] text-yellow-700 mt-1">
                  {format(parseISO(m.fecha), "d MMM, HH:mm", { locale: es })}
                </div>
              </div>
            );
          }

          const esPropio = m.emisor_id === miId;
          return (
            <div
              key={m.id}
              className={cn("flex", esPropio ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-base",
                  esPropio
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                <div
                  className={cn(
                    "text-[10px] mt-1",
                    esPropio ? "text-blue-100" : "text-gray-500",
                  )}
                >
                  {format(parseISO(m.fecha), "d MMM, HH:mm", { locale: es })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finalRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviarMensaje();
            }
          }}
          placeholder="Escribe un mensaje..."
          className="h-12 text-base"
        />
        <Button
          size="lg"
          className="h-12"
          onClick={enviarMensaje}
          disabled={enviando || !texto.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
