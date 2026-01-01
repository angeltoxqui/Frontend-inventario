import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { UserPublic } from "../../client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UsersService } from "../../client"
import { toast } from "sonner"
import { UserActionsMenu } from "./UserActionsMenu" // <--- ¡AQUÍ ESTABA EL ERROR, AHORA LLEVA LLAVES!

// Componente auxiliar para el Switch dentro de la celda
const TurnoSwitch = ({ user }: { user: UserPublic }) => {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (checked: boolean) => 
      UsersService.updateUser({ userId: user.id, requestBody: { ...user, is_active: checked } }), 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Estado de turno actualizado")
    },
    onError: () => toast.error("Error al actualizar turno")
  })

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        checked={user.is_active} 
        onCheckedChange={(checked) => mutation.mutate(checked)}
      />
      <span className="text-xs text-muted-foreground">{user.is_active ? "Activo" : "Fuera"}</span>
    </div>
  )
}

export const columns: ColumnDef<UserPublic>[] = [
  {
    accessorKey: "full_name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => <Badge>{row.original.role || "N/A"}</Badge>,
  },
  {
    id: "en_turno", 
    header: "Turno Activo",
    cell: ({ row }) => <TurnoSwitch user={row.original} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <div className="flex justify-end"><UserActionsMenu user={row.original} /></div>,
  },
]