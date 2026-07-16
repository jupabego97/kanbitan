# Kanbitan frontend

Next.js App Router + TypeScript + Tailwind CSS 4. La pantalla principal es un dashboard de operaciones pensado para teclado, pantallas pequeñas y trabajo repetitivo de mostrador.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Si `NEXT_PUBLIC_API_URL` no apunta a una API disponible, el dashboard inicia en modo demo para que el equipo pueda revisar la experiencia sin preparar datos primero.
