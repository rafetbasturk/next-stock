import {
  deliveryKindArray,
  statusArray,
  stockMovementTypeArray,
  unitArray,
} from "@/lib/constants";
import { currencyArray } from "@/lib/currency";

export type Currency = (typeof currencyArray)[number];
export type CurrencyCode = Currency;
export type DeliveryKind = (typeof deliveryKindArray)[number];
export type OrderStatus = (typeof statusArray)[number];
export type StockMovementType = (typeof stockMovementTypeArray)[number];
export type Unit = (typeof unitArray)[number];

const currencySet = new Set<string>(currencyArray);
const deliveryKindSet = new Set<string>(deliveryKindArray);
const orderStatusSet = new Set<string>(statusArray);
const stockMovementTypeSet = new Set<string>(stockMovementTypeArray);
const unitSet = new Set<string>(unitArray);

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && currencySet.has(value);
}

export function isDeliveryKind(value: unknown): value is DeliveryKind {
  return typeof value === "string" && deliveryKindSet.has(value);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && orderStatusSet.has(value);
}

export function isStockMovementType(value: unknown): value is StockMovementType {
  return typeof value === "string" && stockMovementTypeSet.has(value);
}

export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && unitSet.has(value);
}

export function toCurrencyOrDefault(
  value: unknown,
  fallback: Currency = "TRY",
): Currency {
  return isCurrency(value) ? value : fallback;
}

export function toDeliveryKindOrDefault(
  value: unknown,
  fallback: DeliveryKind = "DELIVERY",
): DeliveryKind {
  return isDeliveryKind(value) ? value : fallback;
}

export function toOrderStatusOrDefault(
  value: unknown,
  fallback: OrderStatus = "KAYIT",
): OrderStatus {
  return isOrderStatus(value) ? value : fallback;
}

export function toUnitOrDefault(
  value: unknown,
  fallback: Unit = "adet",
): Unit {
  return isUnit(value) ? value : fallback;
}
