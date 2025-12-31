import { createFileRoute } from "@tanstack/react-router";
import { StatsCards } from "@/components/Dashboard/StatsCards";
import { SalesChart } from "@/components/Dashboard/SalesChart";
import { InventoryTable } from "@/components/Dashboard/InventoryTable";
import { TopPerformers } from "@/components/Dashboard/TopPerformers";
import { ModeToggle } from "@/components/ModeToggle"; // <--- Importamos el botón nuevo
import { ThemeProvider } from "@/components/theme-provider"; // <--- Importamos el proveedor

// Datos falsos
import { statsData, inventoryData, chartData } from "@/mock-data/dashboard";

export const Route = createFileRoute("/_layout/")({
  component: DashboardWrapper, // Usamos un Wrapper
});

// Envolvemos todo el dashboard con el ThemeProvider
function DashboardWrapper() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Dashboard />
    </ThemeProvider>
  )
}

function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40">
      
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Panel de Control</h1>
          </div>
          
          {/* AQUÍ PONEMOS EL BOTÓN DE MODO OSCURO */}
          <div className="flex items-center gap-2">
             <ModeToggle /> 
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <StatsCards data={statsData} />

        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
             {/* Pasamos los datos al gráfico */}
             <SalesChart data={chartData} />
          </div>
          <div className="xl:col-span-1">
            <TopPerformers />
          </div>
        </div>

        <div className="grid gap-4 md:gap-8 grid-cols-1">
           <InventoryTable data={inventoryData} />
        </div>
      </main>
    </div>
  );
}