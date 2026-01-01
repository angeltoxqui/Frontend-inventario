import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash, Pencil } from "lucide-react"

// Importaciones de Servicios y Tipos
import { type UserPublic, UsersService, ItemsService, type ItemPublic } from "@/client"

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/Common/DataTable"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// Componentes propios (Asegúrate de tenerlos o ajusta las rutas)
import AddUser from "@/components/Admin/AddUser"
import { columns as userColumns, type UserTableData } from "@/components/Admin/columns"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"

// --- CONFIGURACIÓN DE RUTAS Y QUERIES ---

export const Route = createFileRoute("/_layout/admin")({
  component: AdminPanel,
})

// --- 1. COMPONENTE TABLA DE RRHH (USUARIOS) ---
function UsersTab() {
  const { user: currentUser } = useAuth()
  // Usamos useSuspenseQuery para cargar datos reales
  const { data: users } = useSuspenseQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
  })

  const tableData: UserTableData[] = users.data.map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Equipo de Trabajo</h3>
        <AddUser />
      </div>
      <DataTable columns={userColumns} data={tableData} />
    </div>
  )
}

// --- 2. COMPONENTE TABLA DE INVENTARIO (PRODUCTOS) ---
function InventoryTab() {
  const queryClient = useQueryClient()
  
  // Carga REAL de productos desde el Backend
  const { data: items } = useSuspenseQuery({
    queryKey: ["items"],
    queryFn: () => ItemsService.readItems({ limit: 100 }),
  })

  // Mutación para eliminar (Ejemplo)
  const deleteMutation = useMutation({
    mutationFn: ItemsService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Producto eliminado correctamente")
    },
    onError: () => toast.error("Error al eliminar producto")
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Catálogo de Productos e Insumos</h3>
        {/* Aquí deberías importar tu componente <AddItem /> real */}
        <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Producto</Button> 
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción / Ingredientes</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.data.map((item: ItemPublic) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground">{item.description || "N/A"}</TableCell>
                <TableCell>${item.id * 1000} (Simulado)</TableCell> 
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4 text-blue-500"/></Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if(confirm("¿Eliminar este producto?")) deleteMutation.mutate(item.id)
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500"/>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// --- 3. COMPONENTE GESTIÓN DE MESAS (SIMPLE) ---
function TablesTab() {
  const [mesas, setMesas] = useState([
    { id: 1, nombre: "Mesa 1", capacidad: 4, estado: "Libre" },
    { id: 2, nombre: "Mesa 2", capacidad: 2, estado: "Ocupada" },
    { id: 3, nombre: "Mesa 3", capacidad: 6, estado: "Libre" },
  ])

  // Aquí conectarías con MesasService.createMesa()
  const agregarMesa = () => {
    const nuevaId = mesas.length + 1
    setMesas([...mesas, { id: nuevaId, nombre: `Mesa ${nuevaId}`, capacidad: 4, estado: "Libre" }])
    toast.success("Mesa creada (Simulación)")
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Distribución de Planta</h3>
        <Button onClick={agregarMesa} variant="outline"><Plus className="mr-2 h-4 w-4" /> Agregar Mesa</Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mesas.map((mesa) => (
          <div key={mesa.id} className="border p-4 rounded-lg flex flex-col items-center justify-center bg-card shadow-sm hover:shadow-md transition">
            <span className="font-bold text-xl">{mesa.nombre}</span>
            <Badge variant={mesa.estado === 'Libre' ? 'default' : 'destructive'} className="mt-2">
              {mesa.estado}
            </Badge>
            <span className="text-xs text-muted-foreground mt-1">Cap: {mesa.capacidad} pers.</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL (ADMIN PANEL) ---
function AdminPanel() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel Administrativo</h1>
        <p className="text-muted-foreground">
          Gestión centralizada de recursos humanos, inventario y planta física.
        </p>
      </div>

      <Tabs defaultValue="rrhh" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="rrhh">Recursos Humanos</TabsTrigger>
          <TabsTrigger value="inventario">Inventario / Menú</TabsTrigger>
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="rrhh">
            <Suspense fallback={<PendingUsers />}>
              <UsersTab />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="inventario">
            <Suspense fallback={<div className="p-4 text-center">Cargando inventario...</div>}>
              <InventoryTab />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="mesas">
            <TablesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}