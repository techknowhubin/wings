/**
 * Shown when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.
 * Avoids a blank screen from thrown errors during module load / AuthProvider render.
 */
export default function MissingSupabaseConfig() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-emerald-900/15 bg-white p-8 shadow-md">
        <h1 className="text-xl font-semibold text-emerald-950 mb-2">Configuration needed</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Supabase environment variables are missing, so the app cannot start. Copy{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.example</code> to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> in the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">wings</code> folder and set{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            VITE_SUPABASE_PUBLISHABLE_KEY
          </code>
          . Then restart the dev server (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run dev</code>
          ).
        </p>
        <p className="text-xs text-muted-foreground">
          For production builds, configure the same variables in your hosting provider (Netlify,
          Vercel, etc.) before deploying.
        </p>
      </div>
    </div>
  );
}
