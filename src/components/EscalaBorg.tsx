import { cn } from "@/lib/utils";

const NIVELES: { valor: number; emoji: string; color: string }[] = [
  { valor: 0, emoji: "😌", color: "bg-green-500" },
  { valor: 1, emoji: "🙂", color: "bg-green-500" },
  { valor: 2, emoji: "🙂", color: "bg-lime-500" },
  { valor: 3, emoji: "😐", color: "bg-lime-500" },
  { valor: 4, emoji: "😐", color: "bg-yellow-400" },
  { valor: 5, emoji: "😓", color: "bg-yellow-500" },
  { valor: 6, emoji: "😓", color: "bg-amber-500" },
  { valor: 7, emoji: "😖", color: "bg-orange-500" },
  { valor: 8, emoji: "😖", color: "bg-orange-600" },
  { valor: 9, emoji: "🥵", color: "bg-red-500" },
  { valor: 10, emoji: "🥵", color: "bg-red-600" },
];

interface EscalaBorgProps {
  value: number;
  onChange: (valor: number) => void;
}

/**
 * Selector visual de la Escala de Borg (0-10) para percepción del esfuerzo.
 * Cada botón combina número + emoji + color (nunca solo color, por accesibilidad
 * a daltonismo, según los requisitos de interfaz del proyecto).
 */
export function EscalaBorg({ value, onChange }: EscalaBorgProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Percepción del esfuerzo, escala de Borg de 0 a 10"
      className="grid grid-cols-4 sm:grid-cols-6 gap-2"
    >
      {NIVELES.map((nivel) => {
        const seleccionado = value === nivel.valor;
        return (
          <button
            key={nivel.valor}
            type="button"
            role="radio"
            aria-checked={seleccionado}
            onClick={() => onChange(nivel.valor)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg py-3 text-white transition-transform",
              nivel.color,
              seleccionado
                ? "ring-4 ring-offset-2 ring-gray-900 scale-105"
                : "opacity-80 hover:opacity-100",
            )}
          >
            <span className="text-xl leading-none">{nivel.emoji}</span>
            <span className="text-lg font-bold leading-none mt-1">
              {nivel.valor}
            </span>
          </button>
        );
      })}
    </div>
  );
}
