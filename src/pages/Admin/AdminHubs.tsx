import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Pencil, Trash2,
  ToggleLeft, ToggleRight, Users, MapPin, Eye, EyeOff, Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import indiaLocationsData from '@/constants/indiaLocations.json';

const indianStatesData = indiaLocationsData as { states: { state: string, districts: string[] }[] };
const INDIAN_STATES = indianStatesData.states.map(s => s.state);

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useHubPartnerProfiles(search?: string) {
  return useQuery({
    queryKey: ['admin', 'hub-partner-profiles', search],
    queryFn: async () => {
      // 1. Get all hub_partner user IDs from user_roles
      const { data: roleRows, error: roleErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'hub_partner');
      if (roleErr) throw roleErr;
      const hubIds = (roleRows ?? []).map((r: any) => r.user_id);
      if (hubIds.length === 0) return [];

      // 2. Fetch their profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, state, assigned_state, assigned_district, assigned_area, account_status, role, created_at')
        .in('id', hubIds)
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;

      let results = profiles ?? [];
      if (search) {
        const s = search.toLowerCase();
        results = results.filter((p: any) =>
          p.full_name?.toLowerCase().includes(s) ||
          p.phone?.includes(s) ||
          p.assigned_state?.toLowerCase().includes(s)
        );
      }
      return results;
    },
  });
}

function useCreateHubPartnerAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: {
      full_name: string;
      email: string;
      phone: string;
      password: string;
      assigned_state: string;
      assigned_district?: string;
      assigned_area?: string;
    }) => {
      // 1. Sign up a new user account via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            phone: form.phone,
            role: 'hub_partner',
          },
        },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to create user account.');

      // 2. Upsert profile with assigned_state & role
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: form.full_name,
          phone: form.phone,
          role: 'hub_partner',
          assigned_state: form.assigned_state,
          assigned_district: form.assigned_district,
          assigned_area: form.assigned_area,
          account_status: 'active',
        }, { onConflict: 'id' });
      if (profileErr) throw profileErr;

      // 3. Upsert into user_roles
      const { error: roleErr } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'hub_partner' }, { onConflict: 'user_id' } as any);
      if (roleErr) throw roleErr;

      return { userId, email: form.email };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hub-partner-profiles'] });
    },
  });
}

function useUpdateHubPartnerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; full_name?: string; phone?: string; assigned_state?: string; assigned_district?: string; assigned_area?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hub-partner-profiles'] });
    },
  });
}

function useToggleHubPartnerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hub-partner-profiles'] });
    },
  });
}

function useDeleteHubPartnerAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Remove the role (profile remains but is delinked)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id);
      if (error) throw error;
      // Reset role on profile
      await supabase
        .from('profiles')
        .update({ role: null, assigned_state: null, account_status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'hub-partner-profiles'] });
    },
  });
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminHubs() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom input states for 'Other' selections
  const [isOtherAddDistrict, setIsOtherAddDistrict] = useState(false);
  const [isOtherEditDistrict, setIsOtherEditDistrict] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', assigned_state: '', assigned_district: '', assigned_area: '',
  });

  const [editHub, setEditHub] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: hubs, isLoading } = useHubPartnerProfiles(search);
  const createMut = useCreateHubPartnerAccount();
  const updateMut = useUpdateHubPartnerProfile();
  const toggleMut = useToggleHubPartnerStatus();
  const deleteMut = useDeleteHubPartnerAccount();

  const openEdit = (h: any) => {
    setEditHub(h);
    setEditForm({
      full_name: h.full_name ?? '',
      phone: h.phone ?? '',
      assigned_state: h.assigned_state ?? '',
      assigned_district: h.assigned_district ?? '',
      assigned_area: h.assigned_area ?? '',
    });
    
    // Check if the current district/area is in our standard lists, if not, activate 'Other' mode
    const stateData = indianStatesData.states.find(s => s.state === h.assigned_state);
    const standardDistricts = stateData ? stateData.districts : [];
    if (h.assigned_district && !standardDistricts.includes(h.assigned_district)) {
      setIsOtherEditDistrict(true);
    } else {
      setIsOtherEditDistrict(false);
    }

    const matchingHubs = hubs?.filter((hub: any) => hub.assigned_district === h.assigned_district && hub.assigned_area) || [];
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password || !form.phone || !form.assigned_state || !form.assigned_district || !form.assigned_area) {
      toast.error('Please fill in all required fields including Mobile, District, and Area.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      const result = await createMut.mutateAsync(form);
      toast.success(`Hub Partner created! Email: ${result.email}`);
      setAddOpen(false);
      setForm({ full_name: '', email: '', phone: '', password: '', assigned_state: '', assigned_district: '', assigned_area: '' });
      setIsOtherAddDistrict(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create hub partner.');
    }
  };

  const handleUpdate = async () => {
    if (!editHub) return;
    if (!editForm.full_name || !editForm.phone || !editForm.assigned_state || !editForm.assigned_district || !editForm.assigned_area) {
      toast.error('Name, Mobile, State, District, and Area are required.');
      return;
    }
    try {
      await updateMut.mutateAsync({ id: editHub.id, ...editForm });
      toast.success('Hub Partner updated!');
      setEditHub(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update.');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMut.mutateAsync(deleteConfirmId);
      toast.success('Hub Partner account removed.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete.');
    }
  };

  // Helper selectors
  const addAvailableDistricts = indianStatesData.states.find(s => s.state === form.assigned_state)?.districts || [];
  const editAvailableDistricts = indianStatesData.states.find(s => s.state === editForm.assigned_state)?.districts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Hub Partners</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage state-level Hub Partner accounts. Each partner gets credentials to access their dedicated dashboard.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-[#013220] text-white hover:bg-[#013220]/90">
          <Plus className="h-4 w-4 mr-2" /> Create Hub Partner
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-blue-600 bg-blue-50">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Hub Partners</p>
              <p className="text-xl font-bold text-foreground">{hubs?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-green-600 bg-green-50">
              <ToggleRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Partners</p>
              <p className="text-xl font-bold text-foreground">{hubs?.filter((h: any) => h.account_status === 'active').length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-purple-600 bg-purple-50">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">States Covered</p>
              <p className="text-xl font-bold text-foreground">
                {new Set(hubs?.map((h: any) => h.assigned_state).filter(Boolean)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, or state…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hubs ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No hub partners yet. Click "Create Hub Partner" to get started.
                    </TableCell>
                  </TableRow>
                )}
                {(hubs ?? []).map((h: any) => (
                  <TableRow key={h.id}>
                    {/* Partner */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[#013220]/10 text-[#013220] flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{h.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{h.id.substring(0, 8)}…</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="text-sm">{h.phone || '—'}</TableCell>

                    {/* Assigned Location */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                          <MapPin className="h-3 w-3 mr-1" />
                          {h.assigned_state || 'Unassigned State'}
                        </Badge>
                        {h.assigned_district && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] ml-1">
                            {h.assigned_district}
                          </Badge>
                        )}
                        {h.assigned_area && (
                          <div className="text-[10px] text-muted-foreground mt-1 px-1">
                            Area: {h.assigned_area}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          h.account_status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                            : 'bg-gray-100 text-gray-500 text-[10px]'
                        }
                      >
                        {h.account_status === 'active' ? 'Active' : h.account_status || 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEdit(h)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className={`h-7 w-7 ${h.account_status === 'active' ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={h.account_status === 'active' ? 'Suspend' : 'Activate'}
                          onClick={() => toggleMut.mutate({ id: h.id, newStatus: h.account_status === 'active' ? 'suspended' : 'active' })}
                        >
                          {h.account_status === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Copy Dashboard URL"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/hubpartner`);
                            toast.success('Hub Partner dashboard link copied!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Remove Hub Partner"
                          onClick={() => setDeleteConfirmId(h.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create Hub Partner Dialog ──────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Hub Partner Account</DialogTitle>
            <DialogDescription>
              This will create a new user account with the <strong>hub_partner</strong> role. Share the credentials with the partner so they can log in at <code>/hubpartner</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Full Name *</Label>
                <Input placeholder="e.g. Rajesh Kumar" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" placeholder="partner@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Mobile *</Label>
                <Input type="tel" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Assigned State *</Label>
                <Select value={form.assigned_state} onValueChange={(v) => {
                  setForm((f) => ({ ...f, assigned_state: v, assigned_district: '', assigned_area: '' }));
                  setIsOtherAddDistrict(false);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>District *</Label>
                {!isOtherAddDistrict ? (
                  <Select value={form.assigned_district} onValueChange={(v) => {
                    if (v === 'other') setIsOtherAddDistrict(true);
                    else setForm((f) => ({ ...f, assigned_district: v, assigned_area: '' }));
                  }} disabled={!form.assigned_state}>
                    <SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger>
                    <SelectContent>
                      {addAvailableDistricts.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="other">Other (Type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input autoFocus placeholder="Type district" value={form.assigned_district} onChange={e => setForm(f => ({ ...f, assigned_district: e.target.value }))} />
                    <Button variant="ghost" size="sm" onClick={() => { setIsOtherAddDistrict(false); setForm(f => ({ ...f, assigned_district: '' })); }}>Cancel</Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Area *</Label>
                <Input placeholder="Type area" value={form.assigned_area} onChange={e => setForm(f => ({ ...f, assigned_area: e.target.value }))} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">What happens next:</p>
              <p>• A new user account is created with the <strong>hub_partner</strong> role.</p>
              <p>• The partner's dashboard is auto-filtered to show only data from their assigned state.</p>
              <p>• Share the email + password with the partner. They log in at <code>/hubpartner</code>.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-[#013220] text-white hover:bg-[#013220]/90">
              {createMut.isPending ? 'Creating…' : 'Create Hub Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Hub Partner Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!editHub} onOpenChange={(o) => !o && setEditHub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Hub Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Full Name *</Label>
                <Input value={editForm.full_name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Mobile *</Label>
                <Input type="tel" value={editForm.phone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Assigned State *</Label>
                <Select value={editForm.assigned_state ?? ''} onValueChange={(v) => {
                  setEditForm((f) => ({ ...f, assigned_state: v, assigned_district: '', assigned_area: '' }));
                  setIsOtherEditDistrict(false);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>District *</Label>
                {!isOtherEditDistrict ? (
                  <Select value={editForm.assigned_district ?? ''} onValueChange={(v) => {
                    if (v === 'other') setIsOtherEditDistrict(true);
                    else setEditForm((f) => ({ ...f, assigned_district: v, assigned_area: '' }));
                  }} disabled={!editForm.assigned_state}>
                    <SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger>
                    <SelectContent>
                      {editAvailableDistricts.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      {editForm.assigned_district && !editAvailableDistricts.includes(editForm.assigned_district) && (
                        <SelectItem value={editForm.assigned_district}>{editForm.assigned_district}</SelectItem>
                      )}
                      <SelectItem value="other">Other (Type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input autoFocus value={editForm.assigned_district ?? ''} onChange={e => setEditForm(f => ({ ...f, assigned_district: e.target.value }))} />
                    <Button variant="ghost" size="sm" onClick={() => { setIsOtherEditDistrict(false); setEditForm(f => ({ ...f, assigned_district: '' })); }}>Cancel</Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Area *</Label>
                <Input value={editForm.assigned_area ?? ''} onChange={e => setEditForm(f => ({ ...f, assigned_area: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHub(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending} className="bg-[#013220] text-white hover:bg-[#013220]/90">
              {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Hub Partner?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the hub_partner role from this user and suspend their account. They will no longer be able to access the Hub Partner dashboard.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Removing…' : 'Remove Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
