import { z } from "zod";

export const COUNTRIES = [
  "United States",
  "Vietnam",
  "Canada",
  "United Kingdom",
  "Australia",
  "Singapore",
  "Japan",
  "South Korea",
  "France",
  "Germany",
] as const;

export const checkoutSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),

  newsletter: z.boolean(),

  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters"),

  address: z
    .string()
    .trim()
    .min(1, "Street address is required")
    .max(120, "Street address must not exceed 120 characters"),

  apartment: z
    .string()
    .max(120, "Apartment must not exceed 120 characters"),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(60, "City must not exceed 60 characters"),

  postalCode: z
    .string()
    .min(1, "Postal / ZIP code is required")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/,
      "Please enter a valid postal / ZIP code"
    ),

  country: z.enum(COUNTRIES, "Please select a country"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\+?(?=(?:\D*\d){7,15}\D*$)[0-9\s().-]{7,20}$/,
      "Please enter a valid phone number"
    ),

  saveInfo: z.boolean(),

  shippingMethod: z.enum(["standard", "express"], "Please select a shipping method"),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
