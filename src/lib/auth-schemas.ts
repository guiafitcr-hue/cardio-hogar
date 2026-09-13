import { z } from "zod";

const correoSchema = z
  .string()
  .min(1, "El correo es obligatorio")
  .email("Ingresa un correo electrónico válido");

const passwordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres");

export const loginSchema = z.object({
  correo: correoSchema,
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registroParticipanteSchema = z
  .object({
    nombre: z.string().min(2, "Ingresa tu nombre completo"),
    correo: correoSchema,
    password: passwordSchema,
    confirmarPassword: z.string(),
    codigoVinculacion: z
      .string()
      .min(1, "El código de vinculación es obligatorio"),
    telefono: z.string().optional(),
    fechaNacimiento: z.string().optional(),
    diagnosticoCardiaco: z.string().optional(),
  })
  .refine((datos) => datos.password === datos.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });
export type RegistroParticipanteValues = z.infer<
  typeof registroParticipanteSchema
>;

export const registroProfesionalSchema = z
  .object({
    nombre: z.string().min(2, "Ingresa tu nombre completo"),
    correo: correoSchema,
    password: passwordSchema,
    confirmarPassword: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });
export type RegistroProfesionalValues = z.infer<
  typeof registroProfesionalSchema
>;

export const recuperarPasswordSchema = z.object({
  correo: correoSchema,
});
export type RecuperarPasswordValues = z.infer<typeof recuperarPasswordSchema>;

export const restablecerPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmarPassword: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });
export type RestablecerPasswordValues = z.infer<
  typeof restablecerPasswordSchema
>;
