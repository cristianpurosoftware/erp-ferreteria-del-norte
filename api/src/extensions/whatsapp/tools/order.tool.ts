/**
 * WhatsApp Tool: Create order
 * Allows the AI agent to create orders on behalf of customers.
 */
export async function createOrder(customerId: string, items: { productId: string; quantity: number }[]) {
  // Create a draft order with the specified items
  // Return: { orderId, number, total, status }
  throw new Error('Not implemented: connect WhatsApp provider first');
}
