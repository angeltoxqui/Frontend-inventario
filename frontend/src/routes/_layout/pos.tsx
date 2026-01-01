import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ItemsService } from "../../client"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { toast } from "sonner"
import { useState } from "react"

export const Route = createFileRoute("/_layout/pos")({
  component: POS,
})

// Función de colores por categoría
const getCategoryStyles = (category: string = "otros") => {
  switch(category.toLowerCase()) {
    case 'bebidas': return 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30'
    case 'fuertes': return 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
    case 'livianos': return 'border-green-400 bg-green-50 dark:bg-green-950/30'
    case 'entradas': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
    case 'postres': return 'border-pink-400 bg-pink-50 dark:bg-pink-950/30'
    default: return 'border-gray-200 bg-gray-50 dark:bg-gray-800'
  }
}

function POS() {
  const queryClient = useQueryClient()
  const [carrito, setCarrito] = useState<any[]>([])

  // 1. Carga de Productos (Sin Polling)
  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: () => ItemsService.readItems({ limit: 100 }),
    refetchInterval: false, // DESACTIVADO EL POLLING
  })

  // Simular envío a cocina
  const enviarComanda = () => {
    toast.success("Pedido enviado a cocina 👨‍🍳")
    setCarrito([])
    // Aquí iría la mutación real POST /ventas
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sala / POS</h2>
        <Button variant="outline" onClick={() => refetch()}>
          🔄 Actualizar Sala
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sección del Menú */}
        <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-3 h-[calc(100vh-150px)] overflow-y-auto">
          {isLoading ? <p>Cargando menú...</p> : items?.data.map((item) => (
            <Card 
              key={item.id} 
              className={`cursor-pointer hover:scale-105 transition-transform ${getCategoryStyles(item.description?.split(':')[0])}`} // Usando descripción como mock de categoría temporal
              onClick={() => setCarrito([...carrito, item])}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg flex justify-between">
                  {item.title}
                  <Badge variant="secondary">${item.id * 10}</Badge> {/* Precio Mock */}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Lógica de Transparencia (Detalles) */}
                {item.description && (
                  <details className="mt-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer font-medium hover:text-primary">Ver ingredientes</summary>
                    <p className="mt-1 pl-2 border-l-2 italic">{item.description}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sección del Carrito / Comanda Actual */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex flex-col h-[calc(100vh-150px)]">
          <h3 className="text-xl font-bold mb-4 border-b pb-2">Comanda Mesa 1</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {carrito.length === 0 ? (
              <p className="text-gray-400 text-center py-10">Selecciona productos...</p>
            ) : (
              carrito.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span>{prod.title}</span>
                  <Button variant="ghost" size="sm" onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))}>❌</Button>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={enviarComanda} disabled={carrito.length === 0}>
              Enviar a Cocina
            </Button>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" variant="secondary">
              Pedir Cuenta (Por Cobrar)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}