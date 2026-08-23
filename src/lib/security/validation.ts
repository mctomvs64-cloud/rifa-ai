import { z } from "zod";

export const sanitizeString = (input: string, maxLength = 1000): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "");
};

export const sanitizePhone = (input: string): string => {
  return input.replace(/\D/g, "").slice(0, 15);
};

export const sanitizeEmail = (input: string): string => {
  return input.trim().toLowerCase().slice(0, 255);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return /^\d{10,11}$/.test(phone);
};

export const validateSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 100;
};

export const moneySchema = z.number().min(0).max(1000000).multipleOf(0.01);

export const nameSchema = z
  .string()
  .min(2, "Nome muito curto")
  .max(100, "Nome muito longo")
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome contém caracteres inválidos");

export const titleSchema = z
  .string()
  .min(3, "Título muito curto")
  .max(100, "Título muito longo")
  .regex(/^[^<>]*$/, "Título contém caracteres inválidos");

export const descriptionSchema = z
  .string()
  .max(5000, "Descrição muito longa")
  .optional();

export const urlSchema = z
  .string()
  .url("URL inválida")
  .max(500, "URL muito longa")
  .optional()
  .or(z.literal(""));

export const imageUrlArraySchema = z
  .array(urlSchema)
  .max(10, "Máximo 10 imagens")
  .default([]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.string().cuid("ID inválido");