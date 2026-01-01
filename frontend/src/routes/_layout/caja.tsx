import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"     // Usando @
import { Input } from "@/components/ui/input"       // Usando @
import { Label } from "@/components/ui/label"       // Usando @
import { Switch } from "@/components/ui/switch"     // Usando @
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"

export const Route = createFileRoute("/_layout/caja")({
  component: Caja,
})

function Caja() {
  const [showArqueo, setShowArqueo] = useState(false)
  
  // Estados para Arqueo Ciego
  const [efectivoReal, setEfectivoReal] = useState("")
  const [digitalReal, setDigitalReal] = useState("")
  const [pasoArqueo, setPasoArqueo] = useState(1) // 1: Inputs, 2: Resultado

  // Mock datos sistema
  const sistema = { efectivo: 500000, digital: 300000 }

  const calcularDiferencia = () => {
    const totalReal = Number(efectivoReal) + Number(digitalReal)
    const totalSistema = sistema.efectivo + sistema.digital
    return totalReal - totalSistema
  }

  const diferencia = calcularDiferencia()

  return (
    <div className="p-6">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold">💰 Caja y Facturación</h1>
        <Button variant="destructive" onClick={() => setShowArqueo(true)}>🔒 Cierre de Caja</Button>
      </div>

      {/* Panel de Cobro (Ejemplo Simplificado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="border p-4 rounded-lg bg-white dark:bg-gray-800">
            <h3 className="font-bold mb-4">Cobrar Mesa 1</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border p-3 rounded bg-yellow-50 dark:bg-yellow-900/10">
                <Switch id="factura-e" />
                <Label htmlFor="factura-e">Generar Factura Electrónica</Label>
              </div>
              <Button className="w-full" size="lg" onClick={() => {
                 // Validación estricta
                 const facturaE = (document.getElementById('factura-e') as HTMLInputElement)?.ariaChecked === 'true'
                 // Aquí validarías si el cliente tiene datos completos
                 toast.success("Cobro registrado exitosamente")
              }}>
                💵 Cobrar $120.000
              </Button>
            </div>
         </div>
      </div>

      {/* Modal de Arqueo Ciego */}
      <Dialog open={showArqueo} onOpenChange={setShowArqueo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🔐 Cierre de Caja (Ciego)</DialogTitle>
          </DialogHeader>
          
          {pasoArqueo === 1 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500">Por favor, cuenta el dinero físico y digital sin mirar el sistema.</p>
              <div className="space-y-2">
                <Label>Efectivo en Cajón (Real)</Label>
                <Input type="number" value={efectivoReal} onChange={e => setEfectivoReal(e.target.value)} placeholder="$ 0" />
              </div>
              <div className="space-y-2">
                <Label>Total Datafono/Apps (Real)</Label>
                <Input type="number" value={digitalReal} onChange={e => setDigitalReal(e.target.value)} placeholder="$ 0" />
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <h3 className="text-lg font-medium">Resultado del Cuadre</h3>
              <div className={`text-5xl font-bold ${diferencia === 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-yellow-500'}`}>
                {diferencia === 0 ? "PERFECTO" : `$ ${diferencia}`}
              </div>
              <p className="text-muted-foreground">
                {diferencia === 0 ? "La caja cuadra exactamente." : diferencia < 0 ? "⚠️ FALTANTE DE DINERO" : "⚠️ SOBRANTE DE DINERO"}
              </p>
            </div>
          )}

          <DialogFooter>
            {pasoArqueo === 1 ? (
              <Button onClick={() => setPasoArqueo(2)}>Comparar</Button>
            ) : (
              <Button onClick={() => { setShowArqueo(false); setPasoArqueo(1); toast.success("Cierre guardado") }}>Finalizar Turno</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}