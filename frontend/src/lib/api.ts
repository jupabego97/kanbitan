import type {
  DashboardMetrics,
  Product,
  PurchaseRequest,
  PurchaseRequestDraft,
  RequestEvent,
  RequestStatus,
  Supplier,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail?.message ?? body?.detail ?? `Error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getSuppliers() {
  return apiFetch<Supplier[]>("/api/v1/suppliers");
}

export async function getProducts(query: string) {
  return apiFetch<Product[]>(`/api/v1/products?query=${encodeURIComponent(query)}`);
}

export async function getRequests(params: { status?: RequestStatus; supplierId?: string; query?: string } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.supplierId) search.set("supplier_id", params.supplierId);
  if (params.query) search.set("query", params.query);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<{ items: PurchaseRequest[]; total: number }>(`/api/v1/requests${suffix}`);
}

export async function getDashboard() {
  return apiFetch<DashboardMetrics>("/api/v1/dashboard");
}

export async function createRequest(payload: PurchaseRequestDraft) {
  return apiFetch<PurchaseRequest>("/api/v1/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changeRequestStatus(
  id: string,
  status: RequestStatus,
  actor = "Operaciones",
  note?: string,
) {
  return apiFetch<PurchaseRequest>(`/api/v1/requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, actor, note }),
  });
}

export async function getRequestEvents(id: string) {
  return apiFetch<RequestEvent[]>(`/api/v1/requests/${id}/events`);
}
