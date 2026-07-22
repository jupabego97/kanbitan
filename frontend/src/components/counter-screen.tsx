"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Barcode, Check, ChevronDown, LoaderCircle, PackagePlus, Search, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRequest, getProducts, getSuppliers } from "@/lib/api";
import type { Product, RequestKind, RequestPriority, Supplier } from "@/lib/types";

const EMPTY = {
  query: "",
  quantity: "1",
  requestKind: "out_of_stock" as RequestKind,
  priority: "normal" as RequestPriority,
  supplierId: "",
  contact: "",
  note: "",
};

function isScannerValue(value: string) {
  return /^\d{6,}$/.test(value.replace(/\s/g, ""));
}

export function CounterScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = form.query.trim();
    if (query.length < 2) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingProducts(true);
      setError(null);
      void getProducts(query)
        .then((result) => {
          if (cancelled) return;
          setProducts(result);
          setActiveSuggestion(0);
          const normalized = query.replace(/\s/g, "");
          const exact = result.find((product) => product.barcode === normalized || product.sku === normalized);
          if (isScannerValue(query) && exact) selectProduct(exact);
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setProducts([]);
          setError(reason instanceof Error ? reason.message : "No se pudo consultar Alegra.");
        })
        .finally(() => {
          if (!cancelled) setLoadingProducts(false);
        });
    }, isScannerValue(query) ? 80 : 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.query]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setForm((current) => ({
      ...current,
      query: product.name,
      supplierId: product.preferred_supplier_id ?? current.supplierId,
    }));
    setProducts([]);
    setError(null);
  };

  const update = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "query") setSelectedProduct(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = selectedProduct?.name ?? form.query.trim();
    if (title.length < 2) {
      setError("Escribe o escanea un producto para continuar.");
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRequest({
        title,
        product_id: selectedProduct?.id ?? null,
        supplier_id: form.supplierId || null,
        quantity: Math.max(1, Number(form.quantity) || 1),
        request_kind: form.requestKind,
        priority: form.priority,
        customer_contact: form.contact.trim() || null,
        note: form.note.trim() || null,
        created_by: "Mostrador",
      });
      setForm(EMPTY);
      setSelectedProduct(null);
      setProducts([]);
      setMessage("Solicitud creada. Ya está lista para avanzar en el tablero.");
      inputRef.current?.focus();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la solicitud.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#101828]">
      <header className="border-b border-[#eaecf0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Kanbitan, Mostrador">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#155eef] text-white shadow-[0_4px_12px_rgba(21,94,239,.28)]"><Zap className="h-[18px] w-[18px] fill-current" /></span>
            <span><span className="block text-[15px] font-extrabold tracking-[-0.04em]">kanbitan</span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">mostrador</span></span>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl bg-[#f2f4f7] p-1" aria-label="Navegación principal">
            <Link href="/" aria-current="page" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#175cd3] shadow-sm">Nueva solicitud</Link>
            <Link href="/tablero" className="rounded-lg px-3 py-2 text-xs font-semibold text-[#667085] transition hover:text-[#344054]">Tablero</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-start justify-between gap-5">
            <div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#175cd3]"><Sparkles className="h-3.5 w-3.5" /> Entrada rápida</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-[#101828] sm:text-5xl">¿Qué hace falta hoy?</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#667085]">Busca en el catálogo de Alegra o escanea el código. Registraremos la necesidad para que compras pueda darle seguimiento.</p></div>
            <Link href="/tablero" className="hidden shrink-0 items-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-bold text-[#344054] shadow-sm transition hover:border-[#84adff] sm:flex">Ver tablero <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>

          <form onSubmit={submit} className="rounded-[28px] border border-[#eaecf0] bg-white p-4 shadow-[0_12px_36px_rgba(16,24,40,.06)] sm:p-7">
            <div className="relative">
              <label htmlFor="counter-product" className="mb-2 block text-xs font-bold text-[#344054]">Producto o código de barras</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2b3]" />
                <Input ref={inputRef} id="counter-product" value={form.query} onChange={(event) => update("query", event.target.value)} onKeyDown={(event) => { if (event.key === "ArrowDown" && products.length) { event.preventDefault(); setActiveSuggestion((current) => (current + 1) % products.length); } if (event.key === "ArrowUp" && products.length) { event.preventDefault(); setActiveSuggestion((current) => (current - 1 + products.length) % products.length); } if (event.key === "Enter" && products[activeSuggestion] && products.length) { event.preventDefault(); selectProduct(products[activeSuggestion]); } if (event.key === "Escape") setProducts([]); }} placeholder="Escribe un nombre, referencia o escanea..." autoComplete="off" className="h-14 rounded-2xl pl-12 pr-12 text-base" role="combobox" aria-expanded={products.length > 0} aria-controls="product-suggestions" aria-autocomplete="list" />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#98a2b3]">{loadingProducts ? <LoaderCircle className="h-5 w-5 animate-spin" /> : isScannerValue(form.query) ? <Barcode className="h-5 w-5" /> : null}</span>
              </div>
              {products.length > 0 && <div id="product-suggestions" role="listbox" className="absolute left-0 right-0 top-[88px] z-20 overflow-hidden rounded-2xl border border-[#d0d5dd] bg-white p-1.5 shadow-[0_18px_48px_rgba(16,24,40,.16)]">{products.map((product, index) => <button type="button" role="option" aria-selected={index === activeSuggestion} key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectProduct(product)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index === activeSuggestion ? "bg-[#eef4ff]" : "hover:bg-[#f9fafb]"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f2f4f7] text-[#667085]"><PackagePlus className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#344054]">{product.name}</span><span className="mt-0.5 block truncate text-[11px] text-[#98a2b3]">{product.sku ?? "Sin referencia"}{product.barcode ? ` · ${product.barcode}` : ""}</span></span><span className="text-[11px] font-semibold text-[#667085]">{product.inventory_enabled && product.inventory_quantity !== null ? `${product.inventory_quantity} disp.` : "Catálogo"}</span></button>)}</div>}
            </div>

            {selectedProduct && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#abefc6] bg-[#ecfdf3] px-3.5 py-3"><div className="flex min-w-0 items-center gap-2"><Check className="h-4 w-4 shrink-0 text-[#039855]" /><span className="truncate text-xs font-bold text-[#027a48]">{selectedProduct.name}</span></div><button type="button" onClick={() => { setSelectedProduct(null); setForm((current) => ({ ...current, query: "" })); inputRef.current?.focus(); }} className="text-[11px] font-bold text-[#027a48] hover:underline">Cambiar</button></div>}
            {error && <p role="alert" className="mt-3 rounded-xl border border-[#fecdca] bg-[#fff1f0] px-3.5 py-3 text-xs font-semibold text-[#b42318]">{error}</p>}
            {message && <p role="status" className="mt-3 rounded-xl border border-[#abefc6] bg-[#ecfdf3] px-3.5 py-3 text-xs font-semibold text-[#027a48]">{message}</p>}

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <fieldset><legend className="mb-2 text-xs font-bold text-[#344054]">Tipo de solicitud</legend><div className="grid grid-cols-2 gap-2">{(["out_of_stock", "new_product"] as RequestKind[]).map((kind) => <button type="button" key={kind} onClick={() => update("requestKind", kind)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${form.requestKind === kind ? "border-[#84adff] bg-[#eef4ff] text-[#175cd3] ring-4 ring-[#dce9ff]" : "border-[#eaecf0] text-[#667085] hover:border-[#d0d5dd]"}`}>{kind === "out_of_stock" ? "Agotado" : "Nuevo producto"}<span className="mt-1 block text-[10px] font-normal text-[#98a2b3]">{kind === "out_of_stock" ? "Reponer catálogo" : "Evaluar incorporación"}</span></button>)}</div></fieldset>
              <div><label htmlFor="counter-quantity" className="mb-2 block text-xs font-bold text-[#344054]">Cantidad</label><Input id="counter-quantity" type="number" min="1" max="100000" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} /></div>
              <div><label htmlFor="counter-priority" className="mb-2 block text-xs font-bold text-[#344054]">Prioridad</label><div className="relative"><select id="counter-priority" value={form.priority} onChange={(event) => update("priority", event.target.value as RequestPriority)} className="h-11 w-full appearance-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 pr-9 text-sm outline-none focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]"><option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baja</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" /></div></div>
              <div><label htmlFor="counter-supplier" className="mb-2 block text-xs font-bold text-[#344054]">Proveedor <span className="font-normal text-[#98a2b3]">(opcional)</span></label><div className="relative"><select id="counter-supplier" value={form.supplierId} onChange={(event) => update("supplierId", event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 pr-9 text-sm outline-none focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]"><option value="">Sin asignar todavía</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" /></div></div>
              <div><label htmlFor="counter-contact" className="mb-2 block text-xs font-bold text-[#344054]">Contacto del cliente <span className="font-normal text-[#98a2b3]">(opcional)</span></label><Input id="counter-contact" type="tel" value={form.contact} onChange={(event) => update("contact", event.target.value)} placeholder="300 123 4567" /></div>
              <div><label htmlFor="counter-note" className="mb-2 block text-xs font-bold text-[#344054]">Contexto <span className="font-normal text-[#98a2b3]">(opcional)</span></label><textarea id="counter-note" rows={1} value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Nota para compras" className="min-h-11 w-full resize-y rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-3 text-sm outline-none placeholder:text-[#98a2b3] focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff]" /></div>
            </div>
            <div className="mt-7 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#f2f4f7] pt-5 sm:flex-row sm:items-center"><p className="text-xs text-[#98a2b3]">Enter selecciona una sugerencia · Esc cancela</p><Button type="submit" disabled={saving} className="h-11 px-5">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />} {saving ? "Guardando..." : "Registrar solicitud"}</Button></div>
          </form>
        </div>
      </main>
    </div>
  );
}
