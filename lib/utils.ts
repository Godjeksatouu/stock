import { clsx, type ClassValue } from "clsx"

// Note: Using pure clsx to avoid runtime vendor-chunk issues with tailwind-merge in Next 15
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
