import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, Truck, User, Car, ShieldCheck, ShieldX,
  Plus, MoreHorizontal, Phone, Star, Calendar, FileText, AlertTriangle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const emptyDriver = { driver_name: '', mobile: '', license_number: '', vehicle_assigned: '', notes: '' };
const emptyVehicle = { vehicle_name: '', vehicle_type: 'Sedan', vehicle_number: '', seating_capacity: '4', insurance_number: '', permit_number: '', insurance_expiry: '', permit_expiry: '', fitness_expiry: '' };
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Tempo Traveller', 'Mini Bus', 'Luxury', 'Bike'];

export default function HubDrivers() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);

  // Drivers
  const { data: drivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ['hub-drivers', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase.from('hub_drivers').select('*').eq('hub_uuid', uuid).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Vehicles
  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['hub-vehicles', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase.from('hub_vehicles').select('*').eq('hub_uuid', uuid).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const addDriver = useMutation({
    mutationFn: async (data: typeof emptyDriver) => {
      const { error } = await supabase.from('hub_drivers').insert({ ...data, hub_uuid: uuid, status: 'active' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      toast({ title: 'Driver added' });
      setShowAdd(false);
      setDriverForm(emptyDriver);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addVehicle = useMutation({
    mutationFn: async (data: typeof emptyVehicle) => {
      const { error } = await supabase.from('hub_vehicles').insert({
        ...data,
        hub_uuid: uuid,
        seating_capacity: parseInt(data.seating_capacity) || 4,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] });
      toast({ title: 'Vehicle added' });
      setShowAdd(false);
      setVehicleForm(emptyVehicle);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDriverStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('hub_drivers').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      toast({ title: 'Driver status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filteredDrivers = (drivers || []).filter((d: any) =>
    !search || d.driver_name?.toLowerCase().includes(search.toLowerCase()) || d.mobile?.includes(search)
  );
  const filteredVehicles = (vehicles || []).filter((v: any) =>
    !search || v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) || v.vehicle_number?.includes(search)
  );

  const isExpiringSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  };

  const df = (k: keyof typeof driverForm) => (v: string) => setDriverForm(p => ({ ...p, [k]: v }));
  const vf = (k: keyof typeof emptyVehicle) => (v: string) => setVehicleForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Drivers & Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your hub fleet</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}
        </Button>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Drivers', value: drivers?.length || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Active Drivers', value: (drivers || []).filter((d: any) => d.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Vehicles', value: vehicles?.length || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Expiring Soon', value: (vehicles || []).filter((v: any) => isExpiringSoon(v.insurance_expiry) || isExpiringSoon(v.fitness_expiry) || isExpiringSoon(v.permit_expiry)).length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border border-border/30 ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('drivers')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === 'drivers' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <User className="h-4 w-4" /> Drivers ({drivers?.length || 0})
        </button>
        <button onClick={() => setTab('vehicles')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === 'vehicles' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Car className="h-4 w-4" /> Vehicles ({vehicles?.length || 0})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${tab}...`} className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Drivers Table */}
      {tab === 'drivers' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {['Driver', 'Mobile', 'License', 'Vehicle', 'Rating', 'Status', 'Actions'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDrivers ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No drivers added yet</p>
                  </TableCell></TableRow>
                ) : (
                  filteredDrivers.map((d: any) => (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600">
                            {d.driver_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <p className="font-semibold text-sm">{d.driver_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{d.mobile}</TableCell>
                      <TableCell className="text-xs">{d.license_number || '—'}</TableCell>
                      <TableCell className="text-xs">{d.vehicle_assigned || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-semibold">{d.rating || '5.0'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {d.status || 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a href={`tel:${d.mobile}`}><Phone className="h-4 w-4 mr-2" />Call Driver</a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {d.status !== 'active' ? (
                              <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'active' })}>
                                <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'suspended' })}>
                                <ShieldX className="h-4 w-4 mr-2 text-destructive" />Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Vehicles Table */}
      {tab === 'vehicles' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {['Vehicle', 'Type', 'Reg. Number', 'Seats', 'Insurance', 'Permit', 'Fitness', 'Status'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingVehicles ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Car className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No vehicles added yet</p>
                  </TableCell></TableRow>
                ) : (
                  filteredVehicles.map((v: any) => (
                    <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm">{v.vehicle_name}</TableCell>
                      <TableCell className="text-xs">{v.vehicle_type}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{v.vehicle_number}</TableCell>
                      <TableCell className="text-xs">{v.seating_capacity || '—'}</TableCell>
                      <TableCell>
                        {v.insurance_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.insurance_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.insurance_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.insurance_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {v.permit_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.permit_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.permit_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.permit_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {v.fitness_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.fitness_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.fitness_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.fitness_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {v.status || 'Active'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add Driver/Vehicle Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}
            </DialogTitle>
          </DialogHeader>

          {tab === 'drivers' ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { k: 'driver_name', label: 'Full Name *', placeholder: 'Driver full name' },
                  { k: 'mobile', label: 'Mobile *', placeholder: '10-digit number' },
                  { k: 'license_number', label: 'License Number', placeholder: 'DL number' },
                  { k: 'vehicle_assigned', label: 'Vehicle Assigned', placeholder: 'e.g. MH12AB1234' },
                ] as const).map(({ k, label, placeholder }) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{label}</Label>
                    <Input value={driverForm[k]} onChange={e => df(k)(e.target.value)} placeholder={placeholder} className="rounded-xl" />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => addDriver.mutate(driverForm)}
                  disabled={!driverForm.driver_name || !driverForm.mobile || addDriver.isPending}
                  className="rounded-xl"
                >
                  {addDriver.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Driver
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Name *</Label>
                  <Input value={vehicleForm.vehicle_name} onChange={e => vf('vehicle_name')(e.target.value)} placeholder="e.g. Toyota Innova" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Type *</Label>
                  <Select value={vehicleForm.vehicle_type} onValueChange={vf('vehicle_type')}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reg. Number *</Label>
                  <Input value={vehicleForm.vehicle_number} onChange={e => vf('vehicle_number')(e.target.value)} placeholder="MH12AB1234" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Seating Capacity</Label>
                  <Input value={vehicleForm.seating_capacity} onChange={e => vf('seating_capacity')(e.target.value)} type="number" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Insurance Expiry</Label>
                  <Input value={vehicleForm.insurance_expiry} onChange={e => vf('insurance_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Permit Expiry</Label>
                  <Input value={vehicleForm.permit_expiry} onChange={e => vf('permit_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fitness Expiry</Label>
                  <Input value={vehicleForm.fitness_expiry} onChange={e => vf('fitness_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => addVehicle.mutate(vehicleForm)}
                  disabled={!vehicleForm.vehicle_name || !vehicleForm.vehicle_number || addVehicle.isPending}
                  className="rounded-xl"
                >
                  {addVehicle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Vehicle
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
