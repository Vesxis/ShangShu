import { notifyAuthChange } from "@/lib/useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  color: string;
  status: string;
  image_url?: string | null;
  description?: string | null;
  quantity: number;
  category?: Category | null;
}

export interface ProductCreate {
  name: string;
  price: number;
  color: string;
  image_url?: string | null;
  description?: string | null;
  quantity?: number;
}

export interface ProductUpdate {
  name?: string;
  price?: number;
  color?: string;
  image_url?: string | null;
  quantity?: number;
  category_id?: number | null;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  age: number;
  balance: number;
  role?: string;
}

export interface ClientStats {
  client_id: number;
  total_orders: number;
  total_spent: number;
  balance: number;
}

export interface Order {
  id: number;
  title: string;
  client_id: number;
  status: string;
}

export interface OrderProduct {
  id: number;
  name: string;
  price: number;
  color: string;
  quantity: number;
}

export interface OrderWithProducts {
  id: number;
  title: string;
  status: string;
  client_id: number;
  products: OrderProduct[];
}

export interface Transaction {
  id: number;
  amount: number;
  type: "deposit" | "withdraw" | "purchase" | "refund";
  description: string | null;
  client_fk: number;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchResponse(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new ApiError(0, "无法连接服务器，请检查网络后重试");
  }
}

async function readErrorDetail(res: Response): Promise<string> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return `请求失败（HTTP ${res.status}），请稍后重试`;
  }
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string" && detail) {
    if (detail === "Not authenticated") return "请先登录后再操作";
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") {
      return /[\u3400-\u9fff]/.test(first.msg) ? first.msg : "输入内容不符合要求，请检查表单后重试";
    }
  }
  return `请求失败（HTTP ${res.status}），请稍后重试`;
}

async function publicFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchResponse(`${API_URL}${path}`, options);
  if (!res.ok) throw new ApiError(res.status, await readErrorDetail(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  try {
    const res = await fetchResponse(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  pendingRefresh ??= refreshAccessToken().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

function sendAuthed(path: string, options: RequestInit, token: string | null) {
  return fetchResponse(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export async function authFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await sendAuthed(path, options, getAccessToken());

  if (res.status === 401) {
    const fresh = await refreshOnce();
    if (fresh) {
      res = await sendAuthed(path, options, fresh);
    } else {
      logout();
      notifyAuthChange();
    }
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorDetail(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function wsUrl(path: string): string {
  const base = WS_URL || window.location.origin;
  return `${base.replace(/^http/, "ws").replace(/\/$/, "")}${path}`;
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function registerClient(data: RegisterData): Promise<Client> {
  return publicFetch<Client>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function loginClient(data: LoginData): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: data.username, password: data.password });
  return publicFetch<TokenResponse>("/auth/client_login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

export function forgotPassword(email: string): Promise<void> {
  return publicFetch<void>("/auth/forgot_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(reset_token: string, new_password: string): Promise<void> {
  return publicFetch<void>("/auth/reset_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset_token, new_password }),
  });
}

export function verifyEmail(token: string): Promise<void> {
  return publicFetch<void>(`/auth/verify/${token}`);
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return publicFetch<{ message: string }>("/auth/resend_verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function changePassword(old_password: string, new_password: string): Promise<void> {
  return authFetch<void>("/auth/change_password", {
    method: "POST",
    body: JSON.stringify({ old_password, new_password }),
  });
}

export function getMe(): Promise<Client> {
  return authFetch<Client>("/client/me");
}

export function getMyStats(): Promise<ClientStats> {
  return authFetch<ClientStats>("/client/me/stats");
}

export function getMyOrders(): Promise<Order[]> {
  return authFetch<Order[]>("/client/me/orders");
}

export function updateClient(clientId: number, data: { name: string; age: number; address?: string }): Promise<Client> {
  return authFetch<Client>(`/client/${clientId}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteClient(clientId: number): Promise<void> {
  return authFetch<void>(`/client/${clientId}`, { method: "DELETE" });
}

export function getAdminClients(limit = 100, offset = 0): Promise<Client[]> {
  return authFetch<Client[]>(`/client/get_clients?limit=${limit}&offset=${offset}`);
}

export function depositBalance(clientId: number, amount: number): Promise<Client> {
  return authFetch<Client>(`/client/${clientId}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function createPaymentIntent(amount: number): Promise<{ client_secret: string }> {
  return authFetch<{ client_secret: string }>("/payment/create", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function getMyTransactions(limit = 20, offset = 0): Promise<Transaction[]> {
  return authFetch<Transaction[]>(`/transaction/me/transactions?limit=${limit}&offset=${offset}`);
}

export type ProductPage = {
  items: Product[];
  total: number;
  price_ceiling: number;
};

export type CatalogueQuery = {
  name?: string;
  categoryId?: number | null;
  maxPrice?: number | null;
  limit: number;
  offset: number;
};

export function browseProducts(query: CatalogueQuery): Promise<ProductPage> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });
  if (query.name) params.set("name", query.name);
  if (query.categoryId != null) params.set("category_id", String(query.categoryId));
  if (query.maxPrice != null) params.set("max_price", String(query.maxPrice));
  return publicFetch<ProductPage>(`/product/catalogue?${params}`);
}

export function getProducts(limit = 200, offset = 0): Promise<Product[]> {
  return authFetch<Product[]>(`/product/all?limit=${limit}&offset=${offset}`);
}

export function getAdminProducts(limit = 100, offset = 0): Promise<Product[]> {
  return authFetch<Product[]>(`/product/admin/all?limit=${limit}&offset=${offset}`);
}

export function getProduct(id: number): Promise<Product> {
  return authFetch<Product>(`/product/${id}`);
}

export function createProduct(data: ProductCreate): Promise<Product> {
  return authFetch<Product>("/product/", { method: "POST", body: JSON.stringify(data) });
}

export function updateProduct(id: number, data: ProductUpdate): Promise<Product> {
  return authFetch<Product>(`/product/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteProduct(id: number): Promise<Product> {
  return authFetch<Product>(`/product/${id}`, { method: "DELETE" });
}

export function moderateProduct(id: number, status: "accept" | "rejected"): Promise<Product> {
  return authFetch<Product>(`/product/${id}/moderate`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function getCategories(limit = 50, offset = 0): Promise<Category[]> {
  return authFetch<Category[]>(`/category/all?limit=${limit}&offset=${offset}`);
}

export function createCategory(name: string): Promise<Category> {
  return authFetch<Category>("/category/create", { method: "POST", body: JSON.stringify({ name }) });
}

export function deleteCategory(id: number): Promise<void> {
  return authFetch<void>(`/category/${id}`, { method: "DELETE" });
}

export function createOrder(title: string): Promise<Order> {
  return authFetch<Order>("/order/create_orders", { method: "POST", body: JSON.stringify({ title }) });
}

export function addProductToOrder(orderId: number, productId: number, quantity: number): Promise<Order> {
  return authFetch<Order>(`/order/${orderId}/products/${productId}?quantity=${quantity}`, { method: "POST" });
}

export function deleteProductFromOrder(orderId: number, productId: number): Promise<Order> {
  return authFetch<Order>(`/order/${orderId}/order/${productId}/product`, { method: "DELETE" });
}

export function getOrderWithProducts(orderId: number): Promise<OrderWithProducts> {
  return authFetch<OrderWithProducts>(`/order/order_with_products/${orderId}`);
}

export function checkoutOrder(orderId: number): Promise<Order> {
  return authFetch<Order>(`/order/${orderId}/checkout`, { method: "POST" });
}

export function cancelOrder(orderId: number): Promise<void> {
  return authFetch<void>(`/order/${orderId}/refund`, { method: "POST" });
}

export function getAdminOrders(limit = 100, offset = 0): Promise<Order[]> {
  return authFetch<Order[]>(`/order/get_orders?limit=${limit}&offset=${offset}`);
}

export function updateOrderStatus(orderId: number, status: string): Promise<Order> {
  return authFetch<Order>(`/order/${orderId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export function getAiRecommendations(): Promise<string> {
  return authFetch<string>("/ai/recommendations");
}

export function aiSearch(query: string): Promise<Product[]> {
  return authFetch<Product[]>(`/ai/search?query=${encodeURIComponent(query)}`);
}

export function aiChat(message: string): Promise<string> {
  return authFetch<string>("/ai/chat", { method: "POST", body: JSON.stringify({ message }) });
}

export function generateProductDescription(product_name: string): Promise<string> {
  return authFetch<string>("/ai/generate-description", { method: "POST", body: JSON.stringify({ product_name }) });
}
