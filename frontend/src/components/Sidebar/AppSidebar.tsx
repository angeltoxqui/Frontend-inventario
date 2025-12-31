// Asegúrate de importar los iconos que uses
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  UtensilsCrossed, // Para Cocina
  Store,           // Para POS/Mesero
  Wallet           // Para Caja
} from "lucide-react"

// ... dentro de tu componente o lista de items:

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Admin Usuarios",
    url: "/admin",
    icon: Users,
  },
  // --- NUEVOS ---
  {
    title: "Mesero (POS)",
    url: "/pos",
    icon: Store,
  },
  {
    title: "Cocina",
    url: "/cocina",
    icon: UtensilsCrossed,
  },
  {
    title: "Caja",
    url: "/caja",
    icon: Wallet,
  },
  // ----------------
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
]

// Ejemplo de uso de 'items' en el JSX del componente
export default function AppSidebar() {
  return (
    <nav>
      <ul>
        {items.map((item) => (
          <li key={item.url}>
            <a href={item.url} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <item.icon size={18} />
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}