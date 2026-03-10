import { relations } from "drizzle-orm/relations";
import { orders, customOrderItems, orderItems, products, customers, deliveries, deliveryItems, users, sessions, stockMovements } from "./schema";

export const customOrderItemsRelations = relations(customOrderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [customOrderItems.orderId],
		references: [orders.id]
	}),
	deliveryItems: many(deliveryItems),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	customOrderItems: many(customOrderItems),
	orderItems: many(orderItems),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
	deliveryItems: many(deliveryItems),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	customer: one(customers, {
		fields: [products.customerId],
		references: [customers.id]
	}),
	stockMovements: many(stockMovements),
}));

export const customersRelations = relations(customers, ({many}) => ({
	products: many(products),
	orders: many(orders),
	deliveries: many(deliveries),
}));

export const deliveriesRelations = relations(deliveries, ({one, many}) => ({
	customer: one(customers, {
		fields: [deliveries.customerId],
		references: [customers.id]
	}),
	deliveryItems: many(deliveryItems),
}));

export const deliveryItemsRelations = relations(deliveryItems, ({one}) => ({
	delivery: one(deliveries, {
		fields: [deliveryItems.deliveryId],
		references: [deliveries.id]
	}),
	orderItem: one(orderItems, {
		fields: [deliveryItems.orderItemId],
		references: [orderItems.id]
	}),
	customOrderItem: one(customOrderItems, {
		fields: [deliveryItems.customOrderItemId],
		references: [customOrderItems.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
	product: one(products, {
		fields: [stockMovements.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [stockMovements.createdBy],
		references: [users.id]
	}),
}));