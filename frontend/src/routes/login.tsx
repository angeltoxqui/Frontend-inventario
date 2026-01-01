import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { LoginService, UsersService } from "../client"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import useAuth from "../hooks/useAuth"

// Mapa de redirección por rol
const roleRedirects: Record<string, string> = {
  superuser: "/admin",
  admin: "/admin",
  cocinero: "/cocina",
  cajero: "/caja",
  mesero: "/pos",
}

export const Route = createFileRoute("/login")({
  component: Login,
})

function Login() {
  const { login } = useAuth()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm()
  
  // Mutación para obtener datos del usuario DESPUÉS del login
  const userMutation = useMutation({
    mutationFn: UsersService.readUserMe,
    onSuccess: (user) => {
      // 1. Verificación de "Semáforo" (Turno)
      // Nota: Como el backend aún no envía 'en_turno', validamos si es superuser por ahora.
      // Cuando el backend esté listo, descomenta la línea de abajo:
      // const tieneTurnoActivo = user.en_turno || user.is_superuser;
      
      const tieneTurnoActivo = true // MOCK TEMPORAL: Asumimos true para que puedas entrar

      if (!tieneTurnoActivo) {
        localStorage.removeItem("access_token") // Logout forzado
        toast.error("⛔ ACCESO DENEGADO: Tu turno no ha iniciado.")
        return
      }

      // 2. Redirección Inteligente
      const targetPath = roleRedirects[user.role || "mesero"] || "/" // Default a dashboard si no tiene rol
      toast.success(`Bienvenido, ${user.full_name || "Usuario"}`)
      router.navigate({ to: targetPath })
    },
    onError: () => {
      toast.error("Error al verificar perfil de usuario")
    }
  })

  const onSubmit = async (data: any) => {
    try {
      await login(data)
      // Login exitoso, ahora verificamos el usuario
      userMutation.mutate()
    } catch (error) {
      toast.error("Credenciales incorrectas")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center">Gastro Pro V2</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("username", { required: true })} />
            {errors.username && <span className="text-red-500 text-sm">Requerido</span>}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...register("password", { required: true })} />
            {errors.password && <span className="text-red-500 text-sm">Requerido</span>}
          </div>
          <Button type="submit" className="w-full">
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}