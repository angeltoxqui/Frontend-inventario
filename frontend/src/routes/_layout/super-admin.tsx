import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react';
import { MockService } from '../../services/mockService';
import { Store, SuperAdminUser, MigrationLog } from '../../types';
import { 
  Building2, MoreHorizontal, Plus, Search, 
  ShieldCheck, CheckCircle2, 
  Database, Download, Play, Trash2, Mail, Terminal, Lock,
  Activity, DollarSign, Server, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';

export const Route = createFileRoute('/_layout/super-admin')({
  component: SuperAdminDashboard,
})

function SuperAdminDashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [migrations, setMigrations] = useState<MigrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Modals State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreData, setNewStoreData] = useState({ name: '', adminName: '', adminEmail: '', plan: 'basic', owner_password: '' });
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newDevData, setNewDevData] = useState({ email: '', display: '', role: 'dev' as 'dev'|'admin' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const [storesData, saData, migData] = await Promise.all([
            MockService.getStores(),
            MockService.getSuperAdmins(),
            MockService.getMigrations()
        ]);
        setStores(storesData);
        setSuperAdmins(saData);
        setMigrations(migData);
    } catch(e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  // --- ACTIONS ---
  const toggleStatus = async (store: Store) => {
      try {
          const newStatus = store.status === 'active' ? 'suspended' : 'active';
          await MockService.toggleStoreStatus(store.tenant_id, newStatus);
          setStores(prev => prev.map(s => s.tenant_id === store.tenant_id ? { ...s, status: newStatus } : s));
          toast(newStatus === 'suspended' ? `Tienda "${store.name}" SUSPENDIDA.` : `Tienda "${store.name}" ACTIVADA.`, newStatus === 'suspended' ? "error" : "success");
      } catch (e) { toast("Error al cambiar estado", "error"); }
  };

  const handleCreateStore = async () => {
      if(!newStoreData.name || !newStoreData.adminEmail) return toast("Faltan datos", "error");
      try {
          await MockService.createStore(newStoreData);
          setIsStoreModalOpen(false);
          setNewStoreData({ name: '', adminName: '', adminEmail: '', plan: 'basic', owner_password: '' });
          loadData(); 
          toast("Provisioning completado exitosamente.", "success");
      } catch(e) { toast("Error al crear tienda", "error"); }
  };

  const handleMigrateStore = async (id: number) => {
      toast("Iniciando migración de esquema...", "info");
      await MockService.triggerMigration(id);
      toast("Migración completada.", "success");
  }

  const handleExportBackup = async (id: number) => {
      const url = await MockService.exportBackup(id);
      window.open(url, '_blank');
      toast("Backup descargado.", "success");
  }

  const handleDeleteStore = async (id: number) => {
      if(window.confirm("¿Esta acción es destructiva e irreversible. ¿Continuar?")) {
          await MockService.deleteStore(id);
          loadData();
          toast("Tenant eliminado permanentemente.", "default");
      }
  }

  const handleInviteDev = async () => {
      if(!newDevData.email) return;
      await MockService.inviteSuperAdmin(newDevData);
      setIsInviteModalOpen(false);
      setNewDevData({ email: '', display: '', role: 'dev' });
      loadData();
      toast("Invitación enviada.", "success");
  }

  const toggleDevStatus = async (user: SuperAdminUser) => {
      await MockService.toggleSuperAdmin(user.user_id, !user.is_active);
      loadData();
      toast("Permisos actualizados.", "success");
  }

  // --- METRICS & FILTERS ---
  const filteredStores = useMemo(() => stores.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.schema_name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [stores, searchTerm]);

  const stats = useMemo(() => {
    const activeTenants = stores.filter(s => s.status === 'active').length;
    const totalRevenue = stores.reduce((acc, s) => acc + s.revenue, 0);
    const pendingMigrations = migrations.filter(m => m.status !== 'success').length;
    return { activeTenants, totalRevenue, pendingMigrations };
  }, [stores, migrations]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-muted/40">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Cargando panel de control...</p>
            </div>
        </div>
    )
  }

  return (
    // [CORRECCIÓN] Fondo bg-muted/40
    <div className="p-6 md:p-8 min-h-screen bg-muted/40 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                    <ShieldCheck className="text-white h-6 w-6"/>
                </div>
                Super Admin
            </h1>
            <p className="text-muted-foreground mt-1">Gestión centralizada de infraestructura y tenants.</p>
          </div>
          <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30">
                  v1.2.0 Stable
              </Badge>
              <Button size="sm" variant="outline" onClick={loadData}>
                  Refrescar Datos
              </Button>
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tenants Activos</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTenants} <span className="text-sm text-muted-foreground font-normal">/ {stores.length}</span></div>
                  <p className="text-xs text-muted-foreground mt-1">+2 provisionados este mes</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Recurrentes (MRR)</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Proyección anual: ${(stats.totalRevenue * 12).toLocaleString()}</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Salud del Sistema</CardTitle>
                  {stats.pendingMigrations > 0 ? <AlertTriangle className="h-4 w-4 text-amber-500"/> : <Activity className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />}
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">99.9%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                      {stats.pendingMigrations > 0 ? `${stats.pendingMigrations} migraciones pendientes` : 'Todos los sistemas operativos'}
                  </p>
              </CardContent>
          </Card>
      </div>

      {/* MAIN CONTENT TABS */}
      <Tabs defaultValue="stores" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-card border border-border p-1 h-auto shadow-sm rounded-lg">
                <TabsTrigger value="stores" className="gap-2 px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
                    <Building2 size={16}/> Tenants
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2 px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
                    <ShieldCheck size={16}/> Equipo Admin
                </TabsTrigger>
                <TabsTrigger value="system" className="gap-2 px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
                    <Server size={16}/> Sistema
                </TabsTrigger>
            </TabsList>
            
            <div className="hidden md:block">
            </div>
          </div>

          {/* === TAB 1: TIENDAS === */}
          <TabsContent value="stores" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Buscar tenant..." 
                          className="pl-9 bg-card"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <Button onClick={() => setIsStoreModalOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="mr-2 h-4 w-4"/> Nuevo Tenant
                  </Button>
              </div>

              <Card>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="w-[100px]">ID</TableHead>
                                  <TableHead>Negocio</TableHead>
                                  <TableHead>Administrador</TableHead>
                                  <TableHead>Plan</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredStores.length === 0 ? (
                                  <TableRow>
                                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                          No se encontraron resultados.
                                      </TableCell>
                                  </TableRow>
                              ) : (
                                filteredStores.map(store => (
                                    <TableRow key={store.tenant_id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{store.tenant_id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{store.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{store.schema_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 text-[10px]">
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{store.adminName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-muted-foreground">{store.adminEmail}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={store.plan === 'enterprise' ? 'default' : 'secondary'} className="capitalize">
                                                {store.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch 
                                                    checked={store.status === 'active'}
                                                    onCheckedChange={() => toggleStatus(store)}
                                                    className="scale-75"
                                                />
                                                <span className={`text-xs font-medium ${store.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    {store.status === 'active' ? 'Activo' : 'Suspendido'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleMigrateStore(store.tenant_id)}>
                                                        <Database className="mr-2 h-4 w-4" /> Migrar Schema
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleExportBackup(store.tenant_id)}>
                                                        <Download className="mr-2 h-4 w-4" /> Exportar Backup
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteStore(store.tenant_id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar Tenant
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                              )}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>

          {/* === TAB 2: EQUIPO === */}
          <TabsContent value="team" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-medium text-foreground">Equipo de Desarrollo</h3>
                    <p className="text-sm text-muted-foreground">Usuarios con acceso al panel de control global.</p>
                </div>
                <Button onClick={() => setIsInviteModalOpen(true)} variant="outline">
                    <Mail className="mr-2 h-4 w-4"/> Invitar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {superAdmins.map(sa => (
                      <Card key={sa.user_id} className={!sa.is_active ? 'opacity-60 grayscale bg-muted/50' : ''}>
                          <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <Avatar>
                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">{sa.display.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                          <CardTitle className="text-base">{sa.display}</CardTitle>
                                          <CardDescription className="text-xs">{sa.role.toUpperCase()}</CardDescription>
                                      </div>
                                  </div>
                                  <Switch checked={sa.is_active} onCheckedChange={() => toggleDevStatus(sa)}/>
                              </div>
                          </CardHeader>
                          <CardContent>
                              <div className="text-sm text-muted-foreground space-y-1 mt-2">
                                  <p className="flex items-center gap-2"><Mail className="h-3 w-3"/> {sa.email}</p>
                                  <p className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3"/> Creado: {new Date(sa.created_at).toLocaleDateString()}</p>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </TabsContent>

          {/* === TAB 3: SISTEMA === */}
          <TabsContent value="system" className="space-y-4">
              <Card className="bg-slate-900 text-white border-slate-800 dark:border-slate-700">
                  <CardHeader>
                      <div className="flex justify-between items-center">
                          <div className="space-y-1">
                              <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Estado de Migraciones</CardTitle>
                              <CardDescription className="text-slate-400">Control de versionado de bases de datos para todos los tenants.</CardDescription>
                          </div>
                          <Button variant="secondary" size="sm">
                              <Play className="mr-2 h-3 w-3"/> Ejecutar Pendientes
                          </Button>
                      </div>
                  </CardHeader>
              </Card>

              <Card>
                  <CardHeader>
                    <CardTitle>Historial de Ejecución</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Migración</TableHead>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Tenants</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {migrations.map(m => (
                                  <TableRow key={m.id}>
                                      <TableCell className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">{m.migration_name}</TableCell>
                                      <TableCell className="text-muted-foreground">{new Date(m.applied_at).toLocaleString()}</TableCell>
                                      <TableCell>
                                          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 gap-1">
                                              <CheckCircle2 size={12}/> {m.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-mono">{m.tenants_applied}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>

      {/* --- MODALES --- */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border">
            <DialogHeader>
                <DialogTitle>Provisioning: Nuevo Tenant</DialogTitle>
                <DialogDescription>
                    Crea un nuevo esquema de base de datos y asigna un propietario.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre del Negocio</Label>
                        <Input className="bg-background" placeholder="Ej: Burguer King" value={newStoreData.name} onChange={e => setNewStoreData({...newStoreData, name: e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Plan</Label>
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                            value={newStoreData.plan}
                            onChange={e => setNewStoreData({...newStoreData, plan: e.target.value})}
                        >
                            <option value="basic">Básico</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Email del Admin</Label>
                    <Input className="bg-background" placeholder="admin@empresa.com" value={newStoreData.adminEmail} onChange={e => setNewStoreData({...newStoreData, adminEmail: e.target.value})}/>
                </div>
                <div className="space-y-2">
                    <Label>Nombre del Admin</Label>
                    <Input className="bg-background" placeholder="Juan Pérez" value={newStoreData.adminName} onChange={e => setNewStoreData({...newStoreData, adminName: e.target.value})}/>
                </div>
                <div className="space-y-2 relative">
                    <Label>Contraseña (Opcional)</Label>
                    <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            className="pl-9 bg-background" 
                            type="password" 
                            placeholder="Generar automáticamente si se deja vacío"
                            value={newStoreData.owner_password} 
                            onChange={e => setNewStoreData({...newStoreData, owner_password: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsStoreModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateStore} className="bg-indigo-600 hover:bg-indigo-700 text-white">Crear Tenant</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="bg-card text-card-foreground border-border">
              <DialogHeader>
                  <DialogTitle>Invitar Miembro del Equipo</DialogTitle>
                  <DialogDescription>Dará acceso a este panel de Super Admin.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label>Email</Label>
                      <Input className="bg-background" value={newDevData.email} onChange={e => setNewDevData({...newDevData, email: e.target.value})}/>
                  </div>
                  <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input className="bg-background" value={newDevData.display} onChange={e => setNewDevData({...newDevData, display: e.target.value})}/>
                  </div>
                  <div className="space-y-2">
                      <Label>Rol</Label>
                      <select 
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground"
                          value={newDevData.role}
                          onChange={e => setNewDevData({...newDevData, role: e.target.value as any})}
                      >
                          <option value="dev">Developer</option>
                          <option value="admin">Manager</option>
                      </select>
                  </div>
              </div>
              <DialogFooter>
                  <Button onClick={handleInviteDev} className="bg-primary text-primary-foreground">Enviar Invitación</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}