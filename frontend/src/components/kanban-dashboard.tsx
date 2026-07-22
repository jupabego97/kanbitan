"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  Inbox,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  changeRequestStatus,
  createRequest,
  getDashboard,
  getRequestEvents,
  getRequests,
  getSuppliers,
} from "@/lib/api";
import {
  boardStatuses,
  priorityMeta,
  statusMeta,
  type DashboardMetrics,
  type PurchaseRequest,
  type RequestEvent,
  type RequestPriority,
  type RequestStatus,
  type Supplier,
} from "@/lib/types";

type Mode = "loading" | "demo" | "live" | "error";
type FilterTab = "all" | "triage" | "urgent" | "mine";
type FormState = {
  title: string;
  quantity: string;
  supplierId: string;
  priority: RequestPriority;
  contact: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  quantity: "1",
  supplierId: "",
  priority: "normal",
  contact: "",
  note: "",
};

const demoSuppliers: Supplier[] = [
  { id: "supplier-tecno", name: "Tecno Import", lead_time_days: 3 },
  { id: "supplier-delta", name: "Distribuciones Delta", lead_time_days: 5 },
  { id: "supplier-nova", name: "Nova Accesorios", lead_time_days: 2 },
];

const demoRequests: PurchaseRequest[] = [
  {
    id: "request-1",
    title: "Memoria MicroSD 128 GB",
    supplier_id: "supplier-tecno",
    supplier_name: "Tecno Import",
    quantity: 6,
    priority: "urgent",
    status: "triage",
    customer_contact: "300 123 4567",
    note: "Cliente espera confirmación hoy.",
    due_date: "2026-07-17T14:00:00Z",
    created_by: "Mostrador",
    created_at: "2026-07-16T08:32:00Z",
    updated_at: "2026-07-16T08:45:00Z",
  },
  {
    id: "request-2",
    title: "Cargador GaN 65 W",
    supplier_id: "supplier-delta",
    supplier_name: "Distribuciones Delta",
    quantity: 3,
    priority: "high",
    status: "sourcing",
    customer_contact: null,
    note: "Comparar precio entre dos distribuidores.",
    due_date: "2026-07-18T16:00:00Z",
    created_by: "Compras",
    created_at: "2026-07-15T16:12:00Z",
    updated_at: "2026-07-16T09:10:00Z",
  },
  {
    id: "request-3",
    title: "Cable USB-C trenzado 2 m",
    supplier_id: "supplier-nova",
    supplier_name: "Nova Accesorios",
    quantity: 12,
    priority: "normal",
    status: "ordered",
    customer_contact: null,
    note: null,
    due_date: "2026-07-20T10:00:00Z",
    created_by: "Compras",
    created_at: "2026-07-14T10:05:00Z",
    updated_at: "2026-07-15T11:30:00Z",
  },
  {
    id: "request-4",
    title: "Adaptador HDMI a USB-C",
    supplier_id: null,
    supplier_name: null,
    quantity: 4,
    priority: "normal",
    status: "intake",
    customer_contact: "315 555 0122",
    note: "Faltante recurrente en mostrador.",
    due_date: null,
    created_by: "Mostrador",
    created_at: "2026-07-16T09:02:00Z",
    updated_at: "2026-07-16T09:02:00Z",
  },
  {
    id: "request-5",
    title: "Hub USB 3.0 de 4 puertos",
    supplier_id: "supplier-tecno",
    supplier_name: "Tecno Import",
    quantity: 8,
    priority: "low",
    status: "received",
    customer_contact: null,
    note: "Recibido y verificado en bodega.",
    due_date: "2026-07-15T12:00:00Z",
    created_by: "Compras",
    created_at: "2026-07-11T12:15:00Z",
    updated_at: "2026-07-15T15:20:00Z",
  },
  {
    id: "request-6",
    title: "Protector de voltaje 6 tomas",
    supplier_id: "supplier-delta",
    supplier_name: "Distribuciones Delta",
    quantity: 2,
    priority: "high",
    status: "intake",
    customer_contact: null,
    note: "Reponer exhibición de la entrada.",
    due_date: "2026-07-19T09:00:00Z",
    created_by: "Mostrador",
    created_at: "2026-07-15T14:40:00Z",
    updated_at: "2026-07-15T14:40:00Z",
  },
];

const demoMetrics: DashboardMetrics = {
  total_open: 5,
  urgent_open: 1,
  ordered: 1,
  received_this_week: 1,
  average_lead_time_days: 3.3,
};

const statusIcon: Record<Exclude<RequestStatus, "cancelled">, typeof Inbox> = {
  intake: Inbox,
  triage: CircleDot,
  sourcing: ShoppingCart,
  ordered: Truck,
  received: CheckCircle2,
};

function getStatusMeta(status: RequestStatus) {
  if (status === "cancelled") {
    return { label: "Cancelada", shortLabel: "Cancelada", dot: "bg-rose-500", tint: "bg-rose-50" };
  }
  return statusMeta[status];
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(value));
}

function dueLabel(value: string | null) {
  if (!value) return { label: "Sin fecha", tone: "text-[#98a2b3]" };
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Venció ${formatDate(value)}`, tone: "text-[#d92d20]" };
  if (days === 0) return { label: "Vence hoy", tone: "text-[#d92d20]" };
  if (days === 1) return { label: "Vence mañana", tone: "text-[#b54708]" };
  return { label: `Vence ${formatDate(value)}`, tone: "text-[#667085]" };
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101828]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-[#eaecf0] bg-white shadow-[0_24px_80px_rgba(16,24,40,.24)] sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#f2f4f7] bg-white/95 px-6 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#175cd3]">{eyebrow}</p>
            <h2 className="text-xl font-bold tracking-[-0.03em] text-[#101828]">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#eaecf0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.03)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,24,40,.07)] sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#667085]">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-[28px] font-bold leading-none tracking-[-0.05em] text-[#101828]">{value}</p>
      <p className="mt-2 text-xs text-[#98a2b3]">{helper}</p>
    </div>
  );
}

function RequestCard({
  request,
  onOpen,
  onAdvance,
  isUpdating,
}: {
  request: PurchaseRequest;
  onOpen: () => void;
  onAdvance: () => void;
  isUpdating: boolean;
}) {
  const priority = priorityMeta[request.priority];
  const due = dueLabel(request.due_date);
  const canAdvance = request.status !== "received";

  return (
    <article className="group rounded-2xl border border-[#eaecf0] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition hover:-translate-y-0.5 hover:border-[#b2ccff] hover:shadow-[0_8px_24px_rgba(16,24,40,.08)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={onOpen} aria-label={`Abrir ${request.title}`}>
          <p className="truncate text-sm font-bold tracking-[-0.01em] text-[#101828]">{request.title}</p>
          <p className="mt-1 text-[11px] text-[#98a2b3]">Actualizado {relativeTime(request.updated_at)}</p>
        </button>
        <button className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#98a2b3] opacity-0 transition hover:bg-[#f2f4f7] hover:text-[#344054] group-hover:opacity-100" aria-label="Más acciones">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge className={`${priority.tone} gap-1`}>
          <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </Badge>
        {request.supplier_name ? (
          <Badge className="border-[#eaecf0] bg-[#f8fafc] text-[#667085]">
            <Store className="mr-1 h-3 w-3" /> {request.supplier_name}
          </Badge>
        ) : (
          <Badge className="border-dashed border-[#d0d5dd] bg-white text-[#98a2b3]">Proveedor pendiente</Badge>
        )}
      </div>

      {request.note && <p className="mb-3 line-clamp-2 text-xs leading-5 text-[#667085]">{request.note}</p>}

      <div className="flex items-center justify-between border-t border-[#f2f4f7] pt-3">
        <div className="flex min-w-0 items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1 text-[#475467]">
            <Boxes className="h-3.5 w-3.5 text-[#98a2b3]" /> x{request.quantity}
          </span>
          <span className={`flex items-center gap-1 ${due.tone}`}>
            <CalendarDays className="h-3.5 w-3.5" /> {due.label}
          </span>
        </div>
        {canAdvance && (
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#175cd3] transition hover:bg-[#eef4ff] disabled:opacity-50"
            onClick={onAdvance}
            disabled={isUpdating}
          >
            {isUpdating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Avanzar
          </button>
        )}
      </div>
    </article>
  );
}

export function KanbanDashboard() {
  const [mode, setMode] = useState<Mode>("loading");
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(demoMetrics);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [requestData, dashboard, supplierData] = await Promise.all([getRequests(), getDashboard(), getSuppliers()]);
      setRequests(requestData.items);
      setMetrics(dashboard);
      setSuppliers(supplierData);
      setMode("live");
      if (showRefresh) setToast("Datos actualizados");
    } catch {
      if (process.env.NODE_ENV === "production") {
        setRequests([]);
        setSuppliers([]);
        setMetrics({ total_open: 0, urgent_open: 0, ordered: 0, received_this_week: 0, average_lead_time_days: null });
        setMode("error");
      } else {
        setRequests(demoRequests);
        setSuppliers(demoSuppliers);
        setMetrics(demoMetrics);
        setMode("demo");
      }
      if (showRefresh) setToast(process.env.NODE_ENV === "production" ? "No se pudo conectar con la API" : "No se pudo conectar; estás viendo datos de demostración");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setEventsLoading(true), 0);
    getRequestEvents(selectedRequest.id)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([
          {
            id: "demo-event",
            from_status: null,
            to_status: selectedRequest.status,
            note: "Solicitud creada",
            actor: selectedRequest.created_by,
            created_at: selectedRequest.created_at,
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [selectedRequest]);

  useEffect(() => {
    if (!composerOpen && !selectedRequest) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerOpen(false);
        setSelectedId(null);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [composerOpen, selectedRequest]);

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return requests.filter((request): request is PurchaseRequest & { status: Exclude<RequestStatus, "cancelled"> } => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "triage" && request.status === "triage") ||
        (activeTab === "urgent" && request.priority === "urgent") ||
        (activeTab === "mine" && request.created_by === "Mostrador");
      const matchesSupplier = supplierFilter === "all" || request.supplier_id === supplierFilter;
      const matchesQuery = Boolean(
        !normalizedQuery ||
          request.title.toLowerCase().includes(normalizedQuery) ||
          request.supplier_name?.toLowerCase().includes(normalizedQuery),
      );
      return matchesTab && matchesSupplier && matchesQuery && request.status !== "cancelled";
    });
  }, [activeTab, query, requests, supplierFilter]);

  const computedMetrics = useMemo<DashboardMetrics>(() => {
    const open = requests.filter((request) => !["received", "cancelled"].includes(request.status));
    return {
      total_open: open.length,
      urgent_open: open.filter((request) => request.priority === "urgent").length,
      ordered: requests.filter((request) => request.status === "ordered").length,
      received_this_week: requests.filter((request) => request.status === "received").length,
      average_lead_time_days: metrics.average_lead_time_days,
    };
  }, [metrics.average_lead_time_days, requests]);

  const nextStatus = (status: RequestStatus) => {
    if (status === "cancelled") return null;
    const index = boardStatuses.indexOf(status);
    return index >= 0 && index < boardStatuses.length - 1 ? boardStatuses[index + 1] : null;
  };

  const handleAdvance = async (request: PurchaseRequest) => {
    if (request.status === "cancelled") return;
    const target = nextStatus(request.status);
    if (!target) return;
    setUpdatingId(request.id);
    try {
      const updated = mode === "live" ? await changeRequestStatus(request.id, target) : { ...request, status: target, updated_at: new Date().toISOString() };
      setRequests((current) => current.map((item) => (item.id === request.id ? updated : item)));
      setToast(`Movido a ${statusMeta[target].label.toLowerCase()}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo actualizar el estado");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      setToast("Escribe el producto que hace falta");
      return;
    }
    try {
      const supplier = suppliers.find((item) => item.id === form.supplierId);
      const draft = {
        title: form.title.trim(),
        quantity: Math.max(1, Number(form.quantity) || 1),
        supplier_id: form.supplierId || null,
        priority: form.priority,
        customer_contact: form.contact.trim() || null,
        note: form.note.trim() || null,
        created_by: "Mostrador",
      } as const;
      const created: PurchaseRequest =
        mode === "live"
          ? await createRequest(draft)
          : {
              id: `demo-${Date.now()}`,
              title: draft.title,
              supplier_id: draft.supplier_id,
              supplier_name: supplier?.name ?? null,
              quantity: draft.quantity,
              priority: draft.priority,
              status: "intake",
              customer_contact: draft.customer_contact,
              note: draft.note,
              due_date: null,
              created_by: "Mostrador",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
      setRequests((current) => [created, ...current]);
      setForm(EMPTY_FORM);
      setComposerOpen(false);
      setToast("Solicitud creada y lista para revisión");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo crear la solicitud");
    }
  };

  const metricsForView = mode === "live" ? metrics : computedMetrics;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#101828]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#eaecf0] bg-white lg:flex">
        <div className="flex h-[72px] items-center gap-3 border-b border-[#f2f4f7] px-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#155eef] text-white shadow-[0_4px_12px_rgba(21,94,239,.28)]">
            <Zap className="h-[18px] w-[18px] fill-current" />
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-[-0.04em] text-[#101828]">kanbitan</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">operaciones</p>
          </div>
        </div>

        <div className="flex-1 px-3 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#98a2b3]">Workspace</p>
          <nav className="mt-2 space-y-1" aria-label="Navegación principal">
            <Link href="/tablero" className="flex w-full items-center gap-3 rounded-xl bg-[#eef4ff] px-3 py-2.5 text-left text-sm font-bold text-[#175cd3]" aria-current="page">
              <LayoutGrid className="h-[17px] w-[17px]" /> Pedidos <span className="ml-auto rounded-full bg-[#dce9ff] px-2 py-0.5 text-[10px]">{metricsForView.total_open}</span>
            </Link>
            <Link href="/" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#344054]"><Package className="h-[17px] w-[17px]" /> Mostrador</Link>
            <Link href="/inventario" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#344054]"><Package className="h-[17px] w-[17px]" /> Inventario</Link>
            <Link href="/proveedores" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#344054]"><Store className="h-[17px] w-[17px]" /> Proveedores</Link>
          </nav>

          <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#98a2b3]">Vistas guardadas</p>
          <nav className="mt-2 space-y-1" aria-label="Vistas guardadas">
            <button onClick={() => setActiveTab("urgent")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#344054]">
              <span className="h-2 w-2 rounded-full bg-[#f04438]" /> Urgentes <span className="ml-auto text-xs text-[#98a2b3]">{metricsForView.urgent_open}</span>
            </button>
            <button onClick={() => setActiveTab("mine")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#344054]">
              <span className="h-2 w-2 rounded-full bg-[#7f56d9]" /> Mis solicitudes
            </button>
          </nav>
        </div>

        <div className="border-t border-[#f2f4f7] p-3">
          <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[#f9fafb]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d1fadf] text-xs font-extrabold text-[#027a48]">JP</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#344054]">Juan Pablo</span><span className="block truncate text-[11px] text-[#98a2b3]">Operaciones</span></span>
            <Settings2 className="h-4 w-4 text-[#98a2b3]" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-[#eaecf0] bg-white/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#eaecf0] text-[#667085] lg:hidden" aria-label="Abrir menú">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><h1 className="truncate text-lg font-bold tracking-[-0.04em] text-[#101828]">Pedidos</h1><Badge className={mode === "live" ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]" : mode === "error" ? "border-[#fecdca] bg-[#fff1f0] text-[#b42318]" : "border-[#fedf89] bg-[#fffaeb] text-[#b54708]"}>{mode === "loading" ? "Cargando" : mode === "live" ? "En vivo" : mode === "error" ? "Sin conexión" : "Demo"}</Badge></div>
                <p className="hidden text-xs text-[#98a2b3] sm:block">Todo lo que falta, listo para avanzar.</p>
              </div>
            </div>
            <div className="hidden max-w-xs flex-1 items-center md:flex">
              <label className="relative block w-full" htmlFor="global-search">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                <input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedidos..." className="h-10 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] pl-9 pr-16 text-sm outline-none transition focus:border-[#84adff] focus:bg-white focus:ring-4 focus:ring-[#dce9ff]" />
                <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-[#eaecf0] bg-white px-1.5 py-1 text-[10px] font-bold text-[#98a2b3]"><Command className="h-3 w-3" /> K</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => void loadData(true)} aria-label="Actualizar datos" disabled={isRefreshing}><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
              <Button onClick={() => setComposerOpen(true)} className="hidden sm:inline-flex"><Plus className="h-4 w-4" /> Nueva solicitud</Button>
              <Button onClick={() => setComposerOpen(true)} size="icon" className="sm:hidden" aria-label="Nueva solicitud"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-7 sm:py-8">
          {mode === "error" && <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#fecdca] bg-[#fff1f0] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[#b42318]">No pudimos conectar con la API</p><p className="mt-1 text-xs text-[#b42318]">Comprueba el servicio backend y las variables de Railway para continuar.</p></div><Button size="sm" onClick={() => void loadData(true)}>Reintentar</Button></div>}
          <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#175cd3]"><Sparkles className="h-3.5 w-3.5" /> Miércoles, 16 de julio</p><h2 className="text-[30px] font-extrabold tracking-[-0.06em] text-[#101828] sm:text-[36px]">Centro de compras</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">Una vista clara del inventario que pide atención y de las compras que ya están avanzando.</p></div>
            <Button variant="outline" onClick={() => setView(view === "board" ? "list" : "board")}><span className="text-[#175cd3]">{view === "board" ? <ListFilter className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</span>{view === "board" ? "Vista lista" : "Vista tablero"}</Button>
          </section>

          <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            <MetricCard label="Pendientes" value={metricsForView.total_open} helper="solicitudes abiertas" icon={Inbox} tone="bg-[#eef4ff] text-[#175cd3]" />
            <MetricCard label="Necesitan atención" value={metricsForView.urgent_open} helper="prioridad urgente" icon={AlertCircle} tone="bg-[#fff1f0] text-[#d92d20]" />
            <MetricCard label="En tránsito" value={metricsForView.ordered} helper="pedidos confirmados" icon={Truck} tone="bg-[#f4f3ff] text-[#6938ef]" />
            <MetricCard label="Lead time medio" value={metricsForView.average_lead_time_days ? `${metricsForView.average_lead_time_days}d` : "—"} helper="promedio proveedores" icon={Clock3} tone="bg-[#ecfdf3] text-[#039855]" />
          </section>

          <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#eaecf0] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,24,40,.03)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto">
              {(["all", "triage", "urgent", "mine"] as FilterTab[]).map((tab) => {
                const labels: Record<FilterTab, string> = { all: "Todos", triage: "En revisión", urgent: "Urgentes", mine: "Míos" };
                return <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab ? "bg-[#101828] text-white shadow-sm" : "text-[#667085] hover:bg-[#f2f4f7]"}`}>{labels[tab]}</button>;
              })}
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="relative min-w-0 flex-1 md:hidden"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98a2b3]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." className="h-9 w-full rounded-lg border border-[#eaecf0] pl-9 pr-3 text-xs outline-none focus:border-[#84adff]" /></div>
              <div className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98a2b3]" /><select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="h-9 max-w-[170px] appearance-none rounded-lg border border-[#eaecf0] bg-white pl-9 pr-8 text-xs font-semibold text-[#475467] outline-none focus:border-[#84adff]"><option value="all">Todos los proveedores</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98a2b3]" /></div>
            </div>
          </section>

          {mode === "loading" ? <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-[#d0d5dd] bg-white"><div className="text-center"><LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin text-[#155eef]" /><p className="text-sm font-semibold text-[#475467]">Preparando tu tablero</p><p className="mt-1 text-xs text-[#98a2b3]">Conectando con operaciones...</p></div></div> : view === "board" ? <section className="overflow-x-auto pb-3" aria-label="Tablero de pedidos"><div className="grid min-w-[1180px] grid-cols-5 gap-4">{boardStatuses.map((status) => { const Icon = statusIcon[status]; const items = visibleRequests.filter((request) => request.status === status); return <div key={status} className="min-h-[490px] rounded-2xl border border-[#eaecf0] bg-[#f9fafb] p-2.5"><div className="mb-3 flex items-center justify-between px-1.5 pt-1"><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg ${statusMeta[status].tint}`}><Icon className="h-3.5 w-3.5 text-[#475467]" /></span><div><h3 className="text-xs font-extrabold text-[#344054]">{statusMeta[status].label}</h3><p className="text-[10px] text-[#98a2b3]">{items.length} {items.length === 1 ? "solicitud" : "solicitudes"}</p></div></div><button className="grid h-7 w-7 place-items-center rounded-lg text-[#98a2b3] hover:bg-white hover:text-[#344054]" aria-label={`Opciones de ${statusMeta[status].label}`}><MoreHorizontal className="h-4 w-4" /></button></div><div className="space-y-2.5">{items.map((request) => <RequestCard key={request.id} request={request} onOpen={() => setSelectedId(request.id)} onAdvance={() => void handleAdvance(request)} isUpdating={updatingId === request.id} />)}{items.length === 0 && <div className="grid min-h-[160px] place-items-center rounded-xl border border-dashed border-[#d0d5dd] bg-white/60 px-4 text-center"><div><CircleDot className="mx-auto mb-2 h-5 w-5 text-[#d0d5dd]" /><p className="text-xs font-semibold text-[#98a2b3]">Sin solicitudes aquí</p><p className="mt-1 text-[10px] text-[#b2b8c2]">Todo limpio por ahora</p></div></div>}</div></div>; })}</div></section> : <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white"><div className="divide-y divide-[#f2f4f7]">{visibleRequests.map((request) => <button key={request.id} onClick={() => setSelectedId(request.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#f9fafb]"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusMeta[request.status].dot}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#344054]">{request.title}</span><span className="mt-1 block text-xs text-[#98a2b3]">{statusMeta[request.status].label} · {request.supplier_name ?? "Proveedor pendiente"}</span></span><span className="hidden text-xs font-semibold text-[#667085] sm:block">x{request.quantity}</span><Badge className={priorityMeta[request.priority].tone}>{priorityMeta[request.priority].label}</Badge><ChevronRight className="h-4 w-4 text-[#98a2b3]" /></button>)}{visibleRequests.length === 0 && <div className="p-12 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-[#d0d5dd]" /><p className="text-sm font-semibold text-[#475467]">No encontramos pedidos</p><p className="mt-1 text-xs text-[#98a2b3]">Prueba cambiando el filtro o la búsqueda.</p></div>}</div></section>}

          <footer className="mt-6 flex flex-col gap-3 text-xs text-[#98a2b3] sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> Actualizado hace unos segundos · {visibleRequests.length} visibles</p><p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" /> SLA de operación activo <ArrowUpRight className="h-3 w-3" /></p></footer>
        </main>
      </div>

      {mobileNavOpen && <div className="fixed inset-0 z-40 bg-[#101828]/30 lg:hidden" role="presentation" onClick={() => setMobileNavOpen(false)}><aside className="h-full w-[280px] border-r border-[#eaecf0] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between px-2"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#155eef] text-white"><Zap className="h-4 w-4 fill-current" /></div><span className="font-extrabold tracking-[-0.04em]">kanbitan</span></div><button onClick={() => setMobileNavOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[#98a2b3] hover:bg-[#f2f4f7]" aria-label="Cerrar menú"><X className="h-4 w-4" /></button></div><p className="px-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#98a2b3]">Workspace</p><nav className="mt-2 space-y-1"><Link href="/tablero" onClick={() => setMobileNavOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-[#eef4ff] px-3 py-2.5 text-left text-sm font-bold text-[#175cd3]"><LayoutGrid className="h-[17px] w-[17px]" /> Pedidos</Link><Link href="/" onClick={() => setMobileNavOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085]"><Package className="h-[17px] w-[17px]" /> Mostrador</Link><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#667085]"><Store className="h-[17px] w-[17px]" /> Proveedores</button></nav></aside></div>}

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#344054] bg-[#101828] px-4 py-3 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(16,24,40,.25)]"><Check className="h-4 w-4 text-[#6ce9a6]" />{toast}</div>}

      {composerOpen && <ModalShell eyebrow="Nueva entrada" title="Registrar una necesidad" onClose={() => setComposerOpen(false)}><form onSubmit={handleCreate} className="space-y-5 px-6 py-6 sm:px-7"><div><label htmlFor="request-title" className="mb-2 block text-xs font-bold text-[#344054]">Producto o faltante <span className="text-[#d92d20]">*</span></label><Input autoFocus id="request-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Memoria MicroSD 128 GB" /></div><div className="grid grid-cols-2 gap-3"><div><label htmlFor="request-quantity" className="mb-2 block text-xs font-bold text-[#344054]">Cantidad</label><Input id="request-quantity" type="number" min="1" max="100000" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div><div><label htmlFor="request-priority" className="mb-2 block text-xs font-bold text-[#344054]">Prioridad</label><select id="request-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as RequestPriority })} className="h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 text-sm outline-none focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]"><option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baja</option></select></div></div><div><label htmlFor="request-supplier" className="mb-2 block text-xs font-bold text-[#344054]">Proveedor <span className="font-normal text-[#98a2b3]">(opcional)</span></label><select id="request-supplier" value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} className="h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 text-sm outline-none focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]"><option value="">Sin asignar todavía</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.lead_time_days ?? "—"} días</option>)}</select></div><div><label htmlFor="request-contact" className="mb-2 block text-xs font-bold text-[#344054]">Contacto del cliente <span className="font-normal text-[#98a2b3]">(opcional)</span></label><Input id="request-contact" type="tel" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="300 123 4567" /></div><div><label htmlFor="request-note" className="mb-2 block text-xs font-bold text-[#344054]">Contexto <span className="font-normal text-[#98a2b3]">(opcional)</span></label><textarea id="request-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={3} placeholder="¿Qué necesita saber compras?" className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-3 text-sm outline-none placeholder:text-[#98a2b3] focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]" /></div><div className="flex flex-col-reverse gap-2 border-t border-[#f2f4f7] pt-5 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setComposerOpen(false)}>Cancelar</Button><Button type="submit"><Plus className="h-4 w-4" /> Crear solicitud</Button></div></form></ModalShell>}

      {selectedRequest && <ModalShell eyebrow="Detalle de solicitud" title={selectedRequest.title} onClose={() => setSelectedId(null)}><div className="space-y-6 px-6 py-6 sm:px-7"><div className="flex flex-wrap items-center gap-2"><Badge className={`${priorityMeta[selectedRequest.priority].tone} gap-1`}><span className={`h-1.5 w-1.5 rounded-full ${priorityMeta[selectedRequest.priority].dot}`} />{priorityMeta[selectedRequest.priority].label}</Badge><Badge className="border-[#d0d5dd] bg-[#f8fafc] text-[#475467]"><CircleDot className="mr-1 h-3 w-3" />{getStatusMeta(selectedRequest.status).label}</Badge></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-[#f9fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2b3]">Cantidad</p><p className="mt-1 text-lg font-extrabold text-[#344054]">x{selectedRequest.quantity}</p></div><div className="rounded-xl bg-[#f9fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2b3]">Proveedor</p><p className="mt-1 truncate text-sm font-bold text-[#344054]">{selectedRequest.supplier_name ?? "Pendiente"}</p></div><div className="rounded-xl bg-[#f9fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2b3]">Creado por</p><p className="mt-1 truncate text-sm font-bold text-[#344054]">{selectedRequest.created_by}</p></div><div className="rounded-xl bg-[#f9fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2b3]">Fecha objetivo</p><p className="mt-1 text-sm font-bold text-[#344054]">{formatDate(selectedRequest.due_date)}</p></div></div>{selectedRequest.note && <div className="rounded-xl border border-[#dce9ff] bg-[#f5f8ff] p-4"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#175cd3]">Contexto</p><p className="text-sm leading-6 text-[#475467]">{selectedRequest.note}</p></div>}<div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#344054]">Actividad</h3><span className="text-[11px] text-[#98a2b3]">Historial auditable</span></div><div className="space-y-3">{eventsLoading ? <div className="flex items-center gap-2 text-xs text-[#98a2b3]"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando actividad...</div> : events.map((event) => <div key={event.id} className="flex gap-3"><span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ecfdf3] text-[#039855]"><Check className="h-3.5 w-3.5" /></span><div><p className="text-xs font-semibold text-[#475467]">{event.note ?? `Movida a ${statusMeta[event.to_status as Exclude<RequestStatus, "cancelled">]?.label ?? event.to_status}`}</p><p className="mt-0.5 text-[11px] text-[#98a2b3]">{event.actor} · {relativeTime(event.created_at)}</p></div></div>)}</div></div><div className="flex flex-col gap-2 border-t border-[#f2f4f7] pt-5 sm:flex-row sm:justify-between"><div className="flex gap-2">{selectedRequest.customer_contact && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/57${selectedRequest.customer_contact?.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")}><MessageCircle className="h-3.5 w-3.5 text-[#12b76a]" /> WhatsApp</Button>}<Button variant="ghost" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /> Más acciones</Button></div>{nextStatus(selectedRequest.status) && <Button size="sm" onClick={() => { void handleAdvance(selectedRequest); setSelectedId(null); }}><ArrowRight className="h-3.5 w-3.5" /> Avanzar a {statusMeta[nextStatus(selectedRequest.status)!].shortLabel}</Button>}</div></div></ModalShell>}
    </div>
  );
}
