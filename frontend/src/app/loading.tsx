export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f9fc]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-[#dce9ff]" />
        <p className="text-sm font-semibold text-[#475467]">Cargando Kanbitan</p>
        <p className="mt-1 text-xs text-[#98a2b3]">Preparando tu centro de compras...</p>
      </div>
    </main>
  );
}
