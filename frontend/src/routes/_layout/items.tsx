
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { productsService } from '../../services/productsService';
import { DataTable } from '@/components/Common/DataTable'
import { columns } from '@/components/Items/columns'
import AddItem from '@/components/Items/AddItem'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Package, Utensils } from 'lucide-react'

interface ItemsSearch {
  view?: string
}

export const Route = createFileRoute('/_layout/items')({
  validateSearch: (search: Record<string, unknown>): ItemsSearch => {
    return {
      view: (search.view as string) || 'all',
    }
  },
  component: ItemsPage,
})

function ItemsPage() {
  const { view } = Route.useSearch()
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await productsService.getProducts();
        // Map API format (nombre, precio) to legacy format (name, price)
        const mapped = data.map((p: any) => ({
          id: String(p.id),
          name: p.nombre,
          price: p.precio,
          category: p.notas || 'fuertes',
          recipe: (p.ingredientes || []).map((ing: any) => ({
            ingredientId: String(ing.insumo_id),
            quantity: ing.cantidad_requerida,
          })),
          stock: 0,
          status: 'Activo' as const,
        }));
        setItems(mapped);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    }
    load();
  }, [])

  // Si view es 'insumos', filtramos. Si no, mostramos todo.
  const filteredItems = view === 'insumos'
    ? items.filter(i => i.category === 'Insumos' || i.category === 'Ingredientes' || i.category === 'Bebidas')
    : items;

  // Sincronizamos el Tab activo con la URL
  const currentTab = view === 'insumos' ? 'insumos' : 'all';

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {view === 'insumos' ? 'Gestión de Insumos' : 'Inventario General'}
          </h1>
          <p className="text-slate-500">
            {view === 'insumos'
              ? 'Control de stock de ingredientes y materias primas.'
              : 'Vista completa de todos los productos y platos.'}
          </p>
        </div>
        <AddItem />
      </div>

      <Tabs value={currentTab} className="w-full" onValueChange={(val) => {
        // Cambiamos la URL sin recargar toda la app
        if (val === 'insumos') {
          window.history.pushState(null, '', '/items?view=insumos');
          window.location.reload(); // Recarga simple para aplicar el cambio
        } else {
          window.history.pushState(null, '', '/items?view=all');
          window.location.reload();
        }
      }}>
        <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">
            <Utensils className="mr-2 h-4 w-4" /> Todos / Platos
          </TabsTrigger>
          <TabsTrigger value="insumos" className="rounded-lg">
            <Package className="mr-2 h-4 w-4" /> Insumos (Stock)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DataTable columns={columns} data={items} />
        </TabsContent>

        <TabsContent value="insumos" className="space-y-4">
          {/* Aquí se muestra la tabla filtrada */}
          <DataTable columns={columns} data={filteredItems} />
        </TabsContent>
      </Tabs>
    </div>
  )
}