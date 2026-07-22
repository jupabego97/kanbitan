"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, Package, RefreshCw, Search, Store, Zap } from "lucide-react";

import { getProducts, getSuppliers } from "@/lib/api";
import type { Product, Supplier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CatalogShell({ current, children }: { current: "inventory" | "suppliers"; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#101828]">
      <header className="border-b border-[#eaecf0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Volver al mostrador">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#155eef] text-white shadow-[0_4px_12px_rgba(21,94,239,.28)]"><Zap className="h-[18px] w-[18px] fill-current" /></span>
            <span><span className="block text-[15px] font-extrabold tracking-[-0.04em]">kanbitan</span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">operaciones</span></span>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl bg-[#f2f4f7] p-1" aria-label="Navegación principal">
            <Link href="/tablero" className="rounded-lg px-3 py-2 text-xs font-semibold text-[#667085] transition hover:text-[#344054]">Pedidos</Link>
            <Link href="/inventario" aria-current={current === "inventory" ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${current === "inventory" ? "bg-white text-[#175cd3] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>Inventario</Link>
            <Link href="/proveedores" aria-current={current === "suppliers" ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${current === "suppliers" ? "bg-white text-[#175cd3] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>Proveedores</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">{children}</main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: typeof Package }) {
  return <div className="mb-8 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eef4ff] text-[#175cd3]"><Icon className="h-5 w-5" /></span><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#175cd3]">{eyebrow}</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-[#101828] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">{description}</p></div></div>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-[#fecdca] bg-[#fff1f0] p-5"><p className="text-sm font-bold text-[#b42318]">No pudimos cargar esta vista</p><p className="mt-1 text-xs text-[#b42318]">{message}</p><Button size="sm" className="mt-4" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" /> Reintentar</Button></div>;
}

export function InventoryPage() {
  const pageSize = 20;
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextOffset = offset, nextQuery = submittedQuery) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProducts(nextQuery, nextOffset, pageSize);
      setProducts(result);
      setOffset(nextOffset);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Comprueba que el catálogo de Alegra ya esté sincronizado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(0, ""); }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    void load(0, query.trim());
  };

  return <CatalogShell current="inventory"><PageHeading eyebrow="Catálogo conectado" title="Inventario" description="Consulta el catálogo y las existencias que vienen directamente de Alegra." icon={Package} /><form onSubmit={submit} className="mb-5 flex max-w-2xl gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, referencia o código..." className="pl-10" /></div><Button type="submit" disabled={loading}><Search className="h-4 w-4" /> Buscar</Button></form>{error ? <ErrorPanel message={error} onRetry={() => void load()} /> : <div className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]"><div className="flex items-center justify-between border-b border-[#f2f4f7] px-5 py-4"><p className="text-xs font-bold text-[#344054]">Productos de Alegra</p><Badge className="border-[#abefc6] bg-[#ecfdf3] text-[#027a48]">Fuente conectada</Badge></div>{loading ? <div className="grid min-h-[260px] place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-[#155eef]" /></div> : <><div className="divide-y divide-[#f2f4f7]">{products.map((product) => <div key={product.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#344054]">{product.name}</p><p className="mt-1 truncate text-xs text-[#98a2b3]">{product.sku ?? "Sin referencia"}{product.barcode ? ` · ${product.barcode}` : ""}</p></div><div className="flex items-center gap-3 text-xs"><span className="text-[#667085]">{product.inventory_enabled ? `${product.inventory_quantity ?? 0} disponibles` : "No inventariable"}</span><Badge className={product.inventory_enabled && (product.inventory_quantity ?? 0) > 0 ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]" : "border-[#eaecf0] bg-[#f8fafc] text-[#667085]"}>{product.inventory_enabled && (product.inventory_quantity ?? 0) > 0 ? "Disponible" : "Sin existencias"}</Badge></div></div>)}{products.length === 0 && <div className="p-12 text-center text-sm text-[#667085]">No encontramos productos con esa búsqueda.</div>}</div><div className="flex items-center justify-between border-t border-[#f2f4f7] px-5 py-3"><p className="text-xs text-[#98a2b3]">Mostrando {products.length} productos</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={offset === 0 || loading} onClick={() => void load(Math.max(0, offset - pageSize))}><ChevronLeft className="h-3.5 w-3.5" /> Anterior</Button><Button variant="outline" size="sm" disabled={products.length < pageSize || loading} onClick={() => void load(offset + pageSize)}>Siguiente <ChevronRight className="h-3.5 w-3.5" /></Button></div></div></>}</div>}</CatalogShell>;
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setSuppliers(await getSuppliers()); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Comprueba la conexión con la API."); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return <CatalogShell current="suppliers"><PageHeading eyebrow="Red de abastecimiento" title="Proveedores" description="Contactos y proveedores disponibles para asignar solicitudes de compra." icon={Store} />{error ? <ErrorPanel message={error} onRetry={() => void load()} /> : <div className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]"><div className="flex items-center justify-between border-b border-[#f2f4f7] px-5 py-4"><p className="text-xs font-bold text-[#344054]">Proveedores activos</p><Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar</Button></div>{loading ? <div className="grid min-h-[260px] place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-[#155eef]" /></div> : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{suppliers.map((supplier) => <article key={supplier.id} className="rounded-2xl border border-[#eaecf0] p-4 transition hover:border-[#b2ccff] hover:shadow-[0_8px_24px_rgba(16,24,40,.06)]"><div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f3ff] text-[#6938ef]"><Store className="h-4 w-4" /></span><Badge className="border-[#abefc6] bg-[#ecfdf3] text-[#027a48]">Activo</Badge></div><h2 className="mt-4 truncate text-sm font-bold text-[#344054]">{supplier.name}</h2><p className="mt-1 text-xs text-[#667085]">{supplier.lead_time_days === null ? "Lead time no definido" : `${supplier.lead_time_days} días promedio`}</p></article>)}{suppliers.length === 0 && <div className="col-span-full p-12 text-center text-sm text-[#667085]">No hay proveedores sincronizados.</div>}</div>}</div>}</CatalogShell>;
}
