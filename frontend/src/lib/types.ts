export type RequestStatus =
  | "intake"
  | "triage"
  | "sourcing"
  | "ordered"
  | "received"
  | "cancelled";

export type RequestPriority = "urgent" | "high" | "normal" | "low";
export type RequestKind = "out_of_stock" | "new_product";

export type Product = {
  id: string;
  alegra_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  inventory_quantity: number | null;
  inventory_enabled: boolean;
  last_synced_at: string;
  preferred_supplier_id: string | null;
};

export type Supplier = {
  id: string;
  alegra_id?: string | null;
  name: string;
  lead_time_days: number | null;
};

export type PurchaseRequest = {
  id: string;
  title: string;
  supplier_id: string | null;
  supplier_name: string | null;
  quantity: number;
  request_kind?: RequestKind;
  priority: RequestPriority;
  status: RequestStatus;
  customer_contact: string | null;
  note: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PurchaseRequestDraft = {
  title: string;
  product_id?: string | null;
  supplier_id?: string | null;
  quantity: number;
  request_kind?: RequestKind;
  priority: RequestPriority;
  customer_contact?: string | null;
  note?: string | null;
  due_date?: string | null;
  created_by?: string;
};

export type RequestEvent = {
  id: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  actor: string;
  created_at: string;
};

export type DashboardMetrics = {
  total_open: number;
  urgent_open: number;
  ordered: number;
  received_this_week: number;
  average_lead_time_days: number | null;
};

export const statusMeta: Record<
  Exclude<RequestStatus, "cancelled">,
  { label: string; shortLabel: string; dot: string; tint: string }
> = {
  intake: { label: "Nuevas", shortLabel: "Nuevas", dot: "bg-slate-400", tint: "bg-slate-50" },
  triage: { label: "En revisión", shortLabel: "Revisión", dot: "bg-amber-500", tint: "bg-amber-50" },
  sourcing: { label: "Por pedir", shortLabel: "Por pedir", dot: "bg-violet-500", tint: "bg-violet-50" },
  ordered: { label: "En tránsito", shortLabel: "Tránsito", dot: "bg-blue-500", tint: "bg-blue-50" },
  received: { label: "Recibido", shortLabel: "Recibido", dot: "bg-emerald-500", tint: "bg-emerald-50" },
};

export const boardStatuses: Array<Exclude<RequestStatus, "cancelled">> = [
  "intake",
  "triage",
  "sourcing",
  "ordered",
  "received",
];

export const priorityMeta: Record<RequestPriority, { label: string; tone: string; dot: string }> = {
  urgent: { label: "Urgente", tone: "border-[#fecdca] bg-[#fff1f0] text-[#b42318]", dot: "bg-[#f04438]" },
  high: { label: "Alta", tone: "border-[#fedf89] bg-[#fffaeb] text-[#b54708]", dot: "bg-[#f79009]" },
  normal: { label: "Normal", tone: "border-[#d0d5dd] bg-[#f8fafc] text-[#475467]", dot: "bg-[#98a2b3]" },
  low: { label: "Baja", tone: "border-[#d1fadf] bg-[#ecfdf3] text-[#027a48]", dot: "bg-[#12b76a]" },
};
