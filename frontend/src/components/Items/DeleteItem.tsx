import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { productsService } from "@/services/productsService"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"

interface DeleteItemProps {
  id: string
}

const DeleteItem = ({ id }: DeleteItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(Number(id)),
    onSuccess: () => {
      showSuccessToast("Producto eliminado")
      setIsOpen(false)
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err) => {
      console.error(err)
      showErrorToast("Error al eliminar")
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()} onClick={() => setIsOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Producto</DialogTitle>
          <DialogDescription>
            ¿Estás seguro? Esta acción no se puede deshacer y afectará el inventario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <LoadingButton
            variant="destructive"
            onClick={() => mutation.mutate(id)}
            loading={mutation.isPending}
          >
            Eliminar
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteItem