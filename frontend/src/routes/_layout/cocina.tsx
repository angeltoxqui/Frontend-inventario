import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";
import { getOrders, updateOrderStatus, Order } from "@/lib/orders-store";

export const Route = createFileRoute("/_layout/cocina")({
  component: KitchenPanel,
});

function KitchenPanel() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Función para cargar datos
  const loadOrders = () => {
    const allOrders = getOrders();
    // Solo mostramos las que están pendientes
    setOrders(allOrders.filter(o => o.status === "pending"));
  };

  // Cargar al inicio y escuchar cambios
  useEffect(() => {
    loadOrders();
    
    // Escuchar evento de storage (cuando POS envía algo)
    const handleStorage = () => loadOrders();
    window.addEventListener("storage", handleStorage);
    
    // Polling cada 2 seg (por si acaso storage events fallan en algunas pestañas)
    const interval = setInterval(loadOrders, 2000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleServeOrder = (id: string) => {
    // Cambiamos estado a 'served' -> Se va a Caja
    updateOrderStatus(id, "served");
    loadOrders(); // Recargamos la vista local
  };

  return (
    <div className="p-6 bg-muted/20 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comandas de Cocina</h1>
          <p className="text-muted-foreground">Órdenes pendientes de preparación</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          Pendientes: {orders.length}
        </Badge>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border-2 border-dashed rounded-xl">
          <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-xl">Todo limpio, chef. No hay órdenes pendientes.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-yellow-500 shadow-md flex flex-col">
              <CardHeader className="pb-2 bg-yellow-500/10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">Mesa {order.table}</CardTitle>
                  <Badge variant="secondary" className="font-mono">
                    {order.timestamp}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>En espera</span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 pt-4">
                <ul className="space-y-3">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <span className="font-bold text-lg">{item.quantity}x</span>
                      <span className="flex-1 ml-3 font-medium leading-tight">
                        {item.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                  onClick={() => handleServeOrder(order.id)}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Servir Orden
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}