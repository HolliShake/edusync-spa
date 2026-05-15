export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard Home</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This is the landing page inside the dashboard layout. Replace this with your charts,
          tables, and summaries.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Students', '1,284'],
          ['Faculty', '86'],
          ['Pending Requests', '24'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
