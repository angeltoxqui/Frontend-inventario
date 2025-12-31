import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, ChefHat, Coffee, Pizza, Utensils, Send } from "lucide-react";
import { toast } from "sonner"; // Asegúrate de tener instalado sonner o usa alert()

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Importamos nuestro "Cerebro"
import { createOrder } from "@/lib/orders-store";

export const Route = createFileRoute("/_layout/pos")({
  component: PosPanel,
});

// ... (MANTÉN LOS MISMOS DATOS DE CATEGORÍAS Y PRODUCTOS QUE YA TENÍAS) ...
const categories = [
  { id: "all", name: "Todos", icon: Utensils },
  { id: "burger", name: "Hamburguesas", icon: ChefHat },
  { id: "drinks", name: "Bebidas", icon: Coffee },
  { id: "sides", name: "Acompañantes", icon: Pizza },
];

const products = [
  { id: 1, name: "Hamburguesa Clásica", price: 12000, category: "burger", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80" },
  { id: 2, name: "Cheeseburger Doble", price: 18000, category: "burger", image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=300&q=80" },
  { id: 3, name: "Coca Cola", price: 4000, category: "drinks", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80" },
  { id: 4, name: "Limonada Natural", price: 5000, category: "drinks", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80" },
  { id: 5, name: "Papas Fritas", price: 6000, category: "sides", image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=300&q=80" },
];

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

function PosPanel() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState(1); // Mesa por defecto

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Funciones del Carrito
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  // --- NUEVA FUNCIÓN: ENVIAR A COCINA ---
  const handleSendOrder = () => {
    if (cart.length === 0) return;
    
    // 1. Guardamos en nuestro "Backend Falso"
    createOrder(selectedTable, cart);
    
    // 2. Limpiamos
    setCart([]);
    
    // 3. Feedback
    alert("✅ Orden enviada a cocina correctamente!");
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4 bg-muted/20">
      {/* ... (La estructura visual izquierda se mantiene igual) ... */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Barra Superior con Selector de Mesa */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 bg-background p-1 rounded-lg border">
             <span className="text-sm font-medium px-2">Mesa:</span>
             <select 
               className="bg-transparent text-sm font-bold outline-none"
               value={selectedTable}
               onChange={(e) => setSelectedTable(Number(e.target.value))}
             >
               {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
             </select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Categorías */}
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <cat.icon className="h-4 w-4 mr-2" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        <ScrollArea className="flex-1 rounded-md border p-4 bg-background shadow-sm">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-video w-full bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-sm text-primary font-bold">
                    ${product.price.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* --- COLUMNA DERECHA: CARRITO --- */}
      <Card className="flex w-96 flex-col shadow-xl border-l h-full">
        {/* ... (Header del carrito igual) ... */}
        <div className="flex items-center justify-between border-b p-4 bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Orden Mesa {selectedTable}
          </h2>
          <Badge variant="secondary">{cart.length} items</Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground opacity-50">
              <Utensils className="h-12 w-12" />
              <p>Selecciona productos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 bg-background p-2 rounded-lg border shadow-sm">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer del Carrito */}
        <div className="border-t bg-muted/10 p-4 space-y-4">
          <div className="flex justify-between font-bold text-xl">
            <span>Total</span>
            <span className="text-primary">${total.toLocaleString()}</span>
          </div>
          
          <Button 
            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
            size="lg" 
            disabled={cart.length === 0}
            onClick={handleSendOrder}
          >
            <Send className="mr-2 h-5 w-5" /> Enviar a Cocina
          </Button>
        </div>
      </Card>
    </div>
  );
}