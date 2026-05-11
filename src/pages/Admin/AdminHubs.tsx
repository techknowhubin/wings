import { useState } from 'react';
import { useHubPartners, useCreateHubPartner, useToggleHubStatus } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Building2, QrCode, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const HUB_TYPE_COLORS: Record<string, string> = {
  franchise: 'bg-purple-100 text-purple-700',
  collaborator: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-amber-100 text-amber-700',
};

export default function AdminHubs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    business_name: '', partner_name: '', partner_phone: '', partner_email: '',
    address: '', city: '', state: '', pincode: '',
    hub_type: 'collaborator', commission_rate: '5',
  });

  const { data: hubs, isLoading } = useHubPartners();
  const createMut = useCreateHubPartner();
  const toggleMut = useToggleHubStatus();

  const filtered = tab === 'all' ? hubs : (hubs ?? []).filter((h: any) =>
    tab === 'restaurant' ? h.hub_type === 'restaurant' : h.hub_type !== 'restaurant'
  );

  const handleCreate = async () => {
    if (!form.business_name || !form.partner_name || !form.partner_phone || !form.city) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields.' });
      return;
    }
    await createMut.mutateAsync({ ...form, commission_rate: parseFloat(form.commission_rate), created_by: user?.id });
    toast({ title: 'Hub partner added successfully!' });
    setAddOpen(false);
    setForm({ business_name: '', partner_name: '', partner_phone: '', partner_email: '', address: '', city: '', state: '', pincode: '', hub_type: 'collaborator', commission_rate: '5' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Hub Partners</h1>
          <p className="text-muted-foreground text-sm mt-1">Physical partner locations that promote Xplorwing tourism via referral QR codes.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-[#013220] text-white hover:bg-[#013220]/90">
          <Plus className="h-4 w-4 mr-2" /> Add Hub Partner
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Hubs</TabsTrigger>
          <TabsTrigger value="franchise">Franchises & Collaborators</TabsTrigger>
          <TabsTrigger value="restaurant">Hub Restaurants</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>QR ID</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filtered ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No hub partners yet. Add one to get started.</TableCell></TableRow>
                    )}
                    {(filtered ?? []).map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[#013220]/10 text-[#013220] flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{h.business_name}</p>
                              <p className="text-xs text-muted-foreground">{h.address}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{h.partner_name}</p>
                          <p className="text-xs text-muted-foreground">{h.partner_phone}</p>
                        </TableCell>
                        <TableCell className="text-sm">{h.city}, {h.state}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] capitalize ${HUB_TYPE_COLORS[h.hub_type] ?? ''}`}>{h.hub_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                            <code className="text-xs font-mono text-muted-foreground">{h.qr_tracking_id}</code>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{h.commission_rate}%</TableCell>
                        <TableCell className="text-sm">{h.total_referrals}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={h.is_active ? 'bg-green-50 text-green-700 border-green-200 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                            {h.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={h.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                            onClick={() => toggleMut.mutate({ id: h.id, isActive: !h.is_active })}
                          >
                            {h.is_active ? 'Deactivate' : 'Reinstate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Hub Partner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Hub Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Business Name *</Label>
                <Input placeholder="e.g. The Green Café" value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partner Name *</Label>
                <Input placeholder="Owner / Contact" value={form.partner_name} onChange={(e) => setForm((f) => ({ ...f, partner_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partner Phone *</Label>
                <Input placeholder="+91 98765 43210" value={form.partner_phone} onChange={(e) => setForm((f) => ({ ...f, partner_phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Partner Email</Label>
                <Input placeholder="partner@example.com" value={form.partner_email} onChange={(e) => setForm((f) => ({ ...f, partner_email: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Input placeholder="Street address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>City *</Label>
                <Input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.hub_type} onValueChange={(v) => setForm((f) => ({ ...f, hub_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="collaborator">Collaborator</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" min="0" max="100" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A unique QR tracking ID will be generated automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-[#013220] text-white hover:bg-[#013220]/90">
              {createMut.isPending ? 'Adding…' : 'Add Hub Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
