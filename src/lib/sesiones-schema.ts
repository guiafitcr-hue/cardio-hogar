import { z } from "zod";

export const SINTOMAS_GRUPO_A = [
  "Dolor u opresión en el pecho",
  "Dificultad respiratoria intensa o inusual",
  "Mareo, vértigo o sensación de desmayo",
  "Palpitaciones marcadas o ritmo cardíaco irregular",
  "Sudoración fría, palidez o náuseas intensas",
  "Dolor que se irradia a brazo, cuello, mandíbula o espalda",
] as const;

export const SINTOMAS_GRUPO_B = [
  "Fatiga excesiva o desproporcionada al esfuerzo",
  "Dolor articular o muscular",
  "Calambres en piernas al caminar (claudicación)",
  "Molestia leve o pasajera, sin otros signos asociados",
] as const;

export const OPCIONES_CUMPLIMIENTO = [
  "Completo",
  "Parcial",
  "No realizado",
] as const;

export const registroSesionSchema = z
  .object({
    fecha: z.string().min(1, "Selecciona la fecha"),
    duracionMinutos: z.coerce
      .number({ invalid_type_error: "Ingresa la duración en minutos" })
      .int()
      .min(1, "La duración debe ser mayor a 0")
      .max(600, "Revisa la duración ingresada"),
    fcMax: z.coerce
      .number({ invalid_type_error: "Ingresa la frecuencia cardíaca" })
      .int()
      .min(1, "Ingresa un valor válido")
      .max(300, "Revisa el valor ingresado"),
    rpe: z
      .number({ invalid_type_error: "Selecciona tu nivel de esfuerzo" })
      .int()
      .min(0)
      .max(10),
    cumplimiento: z.enum(OPCIONES_CUMPLIMIENTO, {
      required_error: "Selecciona una opción",
    }),
    motivoIncumplimiento: z.string().optional(),
    sintomasGrupoA: z.array(z.string()).default([]),
    sintomasGrupoB: z.array(z.string()).default([]),
    otro: z.boolean().default(false),
    otroDescripcion: z.string().optional(),
    comentarios: z.string().optional(),
  })
  .refine(
    (datos) =>
      datos.cumplimiento === "Completo" ||
      (datos.motivoIncumplimiento?.trim().length ?? 0) > 0,
    {
      message: "Indica brevemente el motivo",
      path: ["motivoIncumplimiento"],
    },
  )
  .refine(
    (datos) => !datos.otro || (datos.otroDescripcion?.trim().length ?? 0) > 0,
    {
      message: "Describe el síntoma",
      path: ["otroDescripcion"],
    },
  );

export type RegistroSesionValues = z.infer<typeof registroSesionSchema>;
