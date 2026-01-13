interface LogoProps {
  variant?: "full" | "icon"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const logoContent = (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {variant === "full" ? (
        <>
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-lg font-bold">Sistema Inventario</span>
        </>
      ) : (
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <span className="text-white font-bold text-lg">S</span>
        </div>
      )}
    </div>
  )

  if (asLink) {
    return (
      <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
        {logoContent}
      </a>
    )
  }

  return logoContent
}
