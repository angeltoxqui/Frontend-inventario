import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Beaker } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingButton } from "@/components/ui/loading-button"
import { ScrollArea } from "@/components/ui/scroll-area"
import useCustomToast from "@/hooks/useCustomToast"
import { MockService } from "@/services/mockService"
import { ProductCategory, RecipeItem } from "@/types"

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category: z.nativeEnum(ProductCategory),
  price: z.coerce.number().min(0, "El precio debe ser positivo"),
  stock: z.coerce.number().min(0),
  image: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const AddItem = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [selectedIngId, setSelectedIngId] = useState<string>("")
  const [ingQuantity, setIngQuantity] = useState<number>(1)

  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: ingredientsList } = useQuery({
    queryKey: ["ingredients"],
    queryFn: MockService.getIngredients,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock: 10,
      category: ProductCategory.FUERTES,
      image: "https://placehold.co/100"
    },
  })

  const handleAddIngredient = () => {
    if (!selectedIngId || ingQuantity <= 0) return;
    setRecipeItems(prev => {
        const existing = prev.find(i => i.ingredientId === selectedIngId);
        if (existing) {
            return prev.map(i => i.ingredientId === selectedIngId ? { ...i, quantity: i.quantity + ingQuantity } : i)
        }
        return [...prev, { ingredientId: selectedIngId, quantity: ingQuantity }]
    });
    setSelectedIngId("");
    setIngQuantity(1);
  };

  const handleRemoveIngredient = (id: string) => {
    setRecipeItems(prev => prev.filter(i => i.ingredientId !== id));
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => MockService.createProduct({ 
        ...data, 
        // --- CAMBIO AQUÍ: Eliminada la línea de 'ingredients', solo enviamos 'recipe' ---
        recipe: recipeItems 
    }),
    onSuccess: () => {
      showSuccessToast("Producto con receta creado")
      form.reset()
      setRecipeItems([])
      setIsOpen(false)
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err) => {
        console.error(err);
        showErrorToast("Error al crear producto");
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="mr-2 h-4 w-4" /> Agregar Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
          <DialogDescription>Define el producto y sus ingredientes.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Hamburguesa Especial" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                    <FormLabel>Precio Venta ($)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />

                <FormField control={form.control} name="stock" render={({ field }) => (
                <FormItem>
                    <FormLabel>Stock Disponible</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.values(ProductCategory).map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="border rounded-md p-4 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <Beaker className="text-primary h-4 w-4" />
                    <h4 className="font-semibold text-sm text-slate-700">Composición / Receta</h4>
                </div>
                
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-medium mb-1 block text-slate-500">Ingrediente</label>
                        <Select value={selectedIngId} onValueChange={setSelectedIngId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {ingredientsList?.map(ing => (
                                    <SelectItem key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-24">
                        <label className="text-xs font-medium mb-1 block text-slate-500">Cantidad</label>
                        <Input 
                            type="number" 
                            className="bg-white" 
                            value={ingQuantity} 
                            onChange={(e) => setIngQuantity(parseFloat(e.target.value))} 
                        />
                    </div>
                    <Button type="button" size="icon" onClick={handleAddIngredient} className="shrink-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {recipeItems.length > 0 && (
                    <ScrollArea className="h-32 border rounded bg-white p-2">
                        <div className="space-y-2">
                            {recipeItems.map((item, index) => {
                                const ingName = ingredientsList?.find(i => i.id === item.ingredientId)?.name || "Desconocido";
                                const ingUnit = ingredientsList?.find(i => i.id === item.ingredientId)?.unit || "";
                                return (
                                    <div key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                        <span className="font-medium text-slate-700">{ingName}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-500 font-mono">{item.quantity} {ingUnit}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveIngredient(item.ingredientId)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>Guardar</LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddItem