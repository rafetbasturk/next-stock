import type { Currency, Unit } from "@/lib/types/domain";

export type ProductTableRow = {
  id: number;
  customerId: number;
  code: string;
  name: string;
  customerName: string | null;
  material: string | null;
  price: number | null;
  currency: Currency;
  stockQuantity: number;
  minStockLevel: number;
  unit: Unit;
  specs: string;
  specsNet: string;
  postProcess: string;
  coating: string;
  notes: string;
  otherCodes: string;
};

export type ProductDetail = {
  id: number;
  customerId: number;
  code: string;
  name: string;
  customerName: string | null;
  material: string | null;
  price: number | null;
  currency: Currency;
  stockQuantity: number;
  minStockLevel: number;
  unit: Unit;
  specs: string | null;
  specsNet: string | null;
  postProcess: string | null;
  coating: string | null;
  notes: string | null;
  otherCodes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductMutationResponse = {
  id: number;
  customerId: number;
  code: string;
  name: string;
  unit: Unit;
  price: number | null;
  currency: Currency;
  stockQuantity: number;
  minStockLevel: number;
  otherCodes: string | null;
  material: string | null;
  postProcess: string | null;
  coating: string | null;
  specs: string | null;
  specsNet: string | null;
  notes: string | null;
  updatedAt: string;
};
