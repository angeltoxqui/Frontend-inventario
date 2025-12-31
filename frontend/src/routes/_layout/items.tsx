import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash, Filter } from "lucide-react";

// Datos simulados (iguales a los del POS para consistencia)
const initialProducts = [
  { id: 1, name: "Hamburguesa Clásica", category: "Comida", price: 12000, stock: 50, status: "Activo", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80" },
  { id: 2, name: "Cheeseburger Doble", category: "Comida", price: 18000, stock: 32, status: "Activo", image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=100&q=80" },
  { id: 3, name: "Coca Cola", category: "Bebidas", price: 4000, stock: 120, status: "Activo", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=100&q=80" },
  { id: 4, name: "Limonada Natural", category: "Bebidas", price: 5000, stock: 15, status: "Bajo Stock", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=100&q=80" },
  { id: 5, name: "Papas Fritas", category: "Acompañantes", price: 6000, stock: 0, status: "Sin Stock", image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=100&q=80" },
];

export const Route = createFileRoute("/_layout/items")({
  component: Items,
});

function Items() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = initialProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-muted/10 min-h-screen">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Menú e Inventario</h1>
          <p className="text-muted-foreground text-sm">Administra tus productos, precios y existencias.</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Agregar Producto
        </Button>
      </div>

      {/* Barra de Herramientas */}
      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            className="pl-9 border-none shadow-none focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="icon">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Tabla de Productos */}
      <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="h-10 w-10 rounded-md object-cover border" 
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={product.stock === 0 ? "destructive" : product.stock < 20 ? "secondary" : "default"}
                    className={product.stock === 0 ? "" : product.stock < 20 ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-green-600 hover:bg-green-700"}
                  >
                    {product.stock === 0 ? "Agotado" : product.stock < 20 ? "Bajo Stock" : "En Stock"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">${product.price.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{product.stock} u.</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {/* AQUÍ ESTABA EL ERROR: Ahora el Button se cierra correctamente */}
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}