import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopPerformers() {
  const products = [
    {
      name: "Hamburguesa Doble",
      sales: "1,234 ventas",
      revenue: "$15.4M",
      image: "https://ui.shadcn.com/avatars/01.png",
    },
    {
      name: "Pizza Familiar",
      sales: "890 ventas",
      revenue: "$12.1M",
      image: "https://ui.shadcn.com/avatars/03.png",
    },
    {
      name: "Limonada de Coco",
      sales: "2,100 ventas",
      revenue: "$8.2M",
      image: "https://ui.shadcn.com/avatars/04.png",
    },
    {
      name: "Alitas BBQ (x12)",
      sales: "650 ventas",
      revenue: "$7.5M",
      image: "https://ui.shadcn.com/avatars/05.png",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Más Vendidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {products.map((product, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={product.image} />
                  <AvatarFallback>PD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sales}</p>
                </div>
              </div>
              <div className="font-medium text-sm">{product.revenue}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}