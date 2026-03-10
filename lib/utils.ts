import {  clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {ClassValue} from 'clsx';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export const delay = async (ms: number): Promise<void> => {
  if (process.env.DEV) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  // Skip delay in production
  return
}

export function capitalizeTurkish(word: string): string {
  if (!word) return word
  const turkishMap: { [key: string]: string } = {
    i: 'İ',
    ı: 'I',
    ğ: 'Ğ',
    ü: 'Ü',
    ş: 'Ş',
    ö: 'Ö',
    ç: 'Ç',
  }

  const firstChar = word.charAt(0)
  const capitalizedFirst =
    turkishMap[firstChar.toLowerCase()] || firstChar.toUpperCase()

  return capitalizedFirst + word.slice(1).toLowerCase()
}

/**
 * Generates an array of years in descending or ascending order.
 *
 * @param startYear - The first year in the range
 * @param endYear - The last year in the range (defaults to current year)
 * @param descending - Whether to sort in descending order (default: true)
 * @returns string[] - List of years
 */
export function generateYearOptions(
  startYear: number,
  endYear: number = new Date().getFullYear(),
  descending: boolean = true,
): Array<string> {
  const years = []
  for (let y = startYear; y <= endYear; y++) {
    years.push(String(y))
  }
  return descending ? years.reverse() : years
}
