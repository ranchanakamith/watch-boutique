export async function shopApi(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({ message: 'The backend is unavailable. Start the backend and try again.' }));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const salePrice = (item: { price: number; discountPercentage: number }) => Math.round(item.price * (1 - (item.discountPercentage || 0) / 100) * 100) / 100;
export interface Order {
  id: number; status: string; payment_status: string; total_cents: number; created_at: string; tracking: string;
  shipping: { name: string; phone: string; address: string; city: string; postalCode: string; country: string };
  items: { product_id: number | null; title: string; unit_cents: number; quantity: number }[];
}
