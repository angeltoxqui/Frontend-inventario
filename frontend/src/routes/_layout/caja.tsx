import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Receipt } from "lucide-react";
import { getOrders, updateOrderStatus, Order } from "@/lib/orders-store";

export const Route = createFileRoute("/_layout/caja")({
  component: CashierPanel,
});

function CashierPanel() {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => {
    const allOrders = getOrders();
    // Solo mostramos las que ya pasaron por cocina ("served")
    setOrders(allOrders.filter(o => o.status === "served"));
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePayOrder = (id: string) => {
    if (confirm("¿Confirmar pago de esta orden?")) {
      updateOrderStatus(id, "paid");
      loadOrders();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Receipt className="h-6 w-6" /> Caja - Órdenes por Cobrar
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {orders.length === 0 ? (
          <p className="text-muted-foreground col-span-2">No hay órdenes pendientes de cobro.</p>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/40 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Mesa {order.table}</CardTitle>
                <Badge className="bg-blue-600">Por Cobrar</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold">{item.quantity}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          ${(item.price * item.quantity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="p-4 bg-muted/10 flex items-center justify-between border-t">
                  <div className="text-xl font-bold">
                    Total: <span className="text-primary">${order.total.toLocaleString()}</span>
                  </div>
                  <Button size="lg" onClick={() => handlePayOrder(order.id)}>
                    <DollarSign className="mr-2 h-4 w-4" /> Cobrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}