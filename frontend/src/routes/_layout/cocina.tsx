import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { toast } from "sonner"

export const Route = createFileRoute("/_layout/cocina")({
  component: Cocina,
})

// Mock de datos de comandas (Reemplazar con ItemsService o VentasService)
const mockComandas = [
  { id: 101, mesa: "Mesa 4", estado: "pendiente", items: ["Hamburguesa Doble", "Papas Fritas"], hora: "14:30" },
  { id: 102, mesa: "Mesa 2", estado: "listo", items: ["Coca Cola"], hora: "14:32" },
]

function Cocina() {
  const queryClient = useQueryClient()

  // Simulación de Fetch
  const { data, refetch } = useQuery({
    queryKey: ["comandas"],
    queryFn: async () => mockComandas, // Aquí iría tu API real
    refetchInterval: false // MANUAL
  })

  // Mutación Plato Listo
  const completarPedido = (id: number) => {
    // Aquí iría mutation.mutate(id)
    toast.success(`Pedido #${id} marcado como LISTO ✅`)
    // queryClient.invalidateQueries(["comandas"])
  }

  // Filtrado solo pendientes
  const pendientes = data?.filter(c => c.estado === 'pendiente') || []

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">👨‍🍳 Monitor de Cocina</h1>
        <Button size="lg" onClick={() => refetch()}>🔄 Nuevos Pedidos</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pendientes.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 text-xl py-20">Todo limpio, Chef. 😴</div>
        ) : (
          pendientes.map((pedido) => (
            <Card key={pedido.id} className="border-l-4 border-l-orange-500 shadow-md">
              <CardHeader className="bg-orange-50 dark:bg-orange-950/20 pb-2">
                <CardTitle className="flex justify-between text-lg">
                  {pedido.mesa}
                  <span className="text-sm font-normal text-gray-500">{pedido.hora}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <ul className="list-disc list-inside space-y-1">
                  {pedido.items.map((plato, i) => (
                    <li key={i} className="text-lg font-medium">{plato}</li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => completarPedido(pedido.id)}>
                  ✅ Pedido Listo
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}