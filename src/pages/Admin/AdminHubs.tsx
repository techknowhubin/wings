import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useHubPartners, useCreateHubPartner, useUpdateHubPartner, useToggleHubStatus,
  useReferralTransactions, useHubAnalytics,
} from '@/hooks/useAdmin';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, QrCode, Download, Copy, Pencil,
  ToggleLeft, ToggleRight, TrendingUp, Users, DollarSign, BarChart3,
  Eye, CheckCircle2, XCircle, Clock, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { generateHubReferralId, buildReferralLink } from '@/lib/referral';

const HUB_TYPE_COLORS: Record<string, string> = {
  franchise:   'bg-purple-100 text-purple-700 border-purple-200',
  hub:         'bg-blue-100 text-blue-700 border-blue-200',
  collaborator:'bg-blue-100 text-blue-700 border-blue-200',
  restaurant:  'bg-amber-100 text-amber-700 border-amber-200',
  cab_driver:  'bg-green-100 text-green-700 border-green-200',
};

const HUB_TYPE_LABELS: Record<string, string> = {
  franchise:   'Franchise',
  hub:         'Hub',
  collaborator:'Hub',
  restaurant:  'Chai Point / Restaurant',
  cab_driver:  'Cab Driver',
};

// ─── QR Download helper ──────────────────────────────────────────────────────
function downloadQR(canvasId: string, filename: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

// ─── Analytics Cards ──────────────────────────────────────────────────────────
function AnalyticsCards() {
  const { data: analytics, isLoading } = useHubAnalytics();

  const cards = [
    { label: 'Total Hub Partners', value: analytics?.totalPartners ?? 0, sub: `${analytics?.activePartners ?? 0} active`, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Referral Bookings', value: analytics?.totalReferralBookings ?? 0, sub: 'All time', icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
    { label: 'Referral Revenue', value: `₹${((analytics?.totalReferralRevenue ?? 0) / 100).toFixed(0)}`, sub: 'Completed payments', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Commission Paid', value: `₹${((analytics?.totalCommissionPaid ?? 0) / 100).toFixed(0)}`, sub: 'To partners', icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
  ];

  if (isLoading) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className="text-xl font-bold text-foreground">{c.value}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── QR Viewer Sheet ──────────────────────────────────────────────────────────
function QRSheet({ hub, open, onClose }: { hub: any; open: boolean; onClose: () => void }) {
  const canvasId = `qr-canvas-${hub?.id}`;
  // Prefer referral_id; fall back to qr_tracking_id for partners created before this system
  const refId = hub?.referral_id || hub?.qr_tracking_id || '';
  const referralLink = (hub?.referral_link && hub.referral_link.includes('=') && hub.referral_link.split('=')[1])
    ? hub.referral_link
    : buildReferralLink(refId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>QR Code — {hub?.business_name}</SheetTitle>
        </SheetHeader>
        {hub && (
          <div className="mt-6 space-y-6">
            {/* QR Code Display */}
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border">
              {refId ? (
                <QRCodeCanvas
                  id={canvasId}
                  value={referralLink}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#013220"
                  level="H"
                  includeMargin
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-muted rounded-xl text-xs text-muted-foreground text-center p-4">
                  No referral ID found. Re-create this partner to generate one.
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{hub.business_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{refId || '—'}</p>
              </div>
            </div>

            {/* Referral Link */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referral Link</Label>
              <div className="flex items-center gap-2">
                <Input value={referralLink} readOnly className="text-xs font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Referrals', value: hub.total_referrals ?? 0 },
                { label: 'Revenue', value: `₹${Number(hub.total_revenue ?? 0).toFixed(0)}` },
                { label: 'Commission', value: `₹${Number(hub.total_commission ?? 0).toFixed(0)}` },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-muted/40 text-center">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#013220] text-white hover:bg-[#013220]/90"
                onClick={() => { downloadQR(canvasId, `QR-${hub.referral_id}`); toast.success('QR downloaded!'); }}
              >
                <Download className="h-4 w-4 mr-2" /> Download QR
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copied!'); }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
            </div>

            <button
              onClick={() => {
                const dashboardUrl = `${window.location.origin}/partner-dashboard/${refId}`;
                navigator.clipboard.writeText(dashboardUrl);
                toast.success('Partner dashboard link copied! Share this with the partner.');
              }}
              className="w-full py-2 border border-dashed border-muted-foreground/30 rounded-xl text-xs text-muted-foreground hover:border-[#013220] hover:text-[#013220] transition flex items-center justify-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy partner dashboard link
            </button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Print and display this QR at your location. Customers who scan it will have your referral code automatically applied at checkout.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Referral History Sheet ───────────────────────────────────────────────────
function ReferralHistorySheet({ hub, open, onClose }: { hub: any; open: boolean; onClose: () => void }) {
  const { data: transactions, isLoading } = useReferralTransactions(hub?.id);

  const STATUS_STYLE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    pending:   'bg-amber-100 text-amber-700',
    refunded:  'bg-red-100 text-red-700',
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Referral History — {hub?.business_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : (transactions ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No referral transactions yet.</div>
          ) : (
            (transactions ?? []).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                <div>
                  <p className="text-sm font-semibold capitalize">{tx.bookings?.listing_type ?? 'Booking'}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">₹{Number(tx.booking_amount).toFixed(0)}</p>
                  <p className="text-xs text-green-600 font-medium">+₹{Number(tx.commission_amount).toFixed(0)} comm.</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ml-3 ${STATUS_STYLE[tx.payment_status] ?? ''}`}>
                  {tx.payment_status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminHubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'franchise' | 'restaurant' | 'cab_driver' | 'hub'>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [qrHub, setQrHub] = useState<any>(null);
  const [historyHub, setHistoryHub] = useState<any>(null);
  const [form, setForm] = useState({
    business_name: '', partner_name: '', partner_phone: '', partner_email: '',
    address: '', city: '', state: '', pincode: '',
    hub_type: 'hub', commission_rate: '5',
  });

  const [editHub, setEditHub] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data: hubs, isLoading } = useHubPartners(search);
  const createMut = useCreateHubPartner();
  const updateMut = useUpdateHubPartner();
  const toggleMut = useToggleHubStatus();

  const openEdit = (h: any) => {
    setEditHub(h);
    setEditForm({
      business_name: h.business_name ?? '',
      partner_name:  h.partner_name  ?? '',
      partner_phone: h.partner_phone ?? '',
      partner_email: h.partner_email ?? '',
      address:       h.address       ?? '',
      city:          h.city          ?? '',
      state:         h.state         ?? '',
      pincode:       h.pincode       ?? '',
      hub_type:      h.hub_type      ?? 'collaborator',
      commission_rate: String(h.commission_rate ?? '5'),
    });
  };

  const handleUpdate = async () => {
    if (!editHub) return;
    if (!editForm.business_name || !editForm.partner_name || !editForm.partner_phone || !editForm.city) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: editHub.id,
        ...editForm,
        commission_rate: parseFloat(editForm.commission_rate),
      });
      toast.success('Hub partner updated!');
      setEditHub(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update.');
    }
  };

  const filtered = tab === 'all'
    ? (hubs ?? [])
    : (hubs ?? []).filter((h: any) => {
        if (tab === 'hub') return h.hub_type === 'hub' || h.hub_type === 'collaborator';
        return h.hub_type === tab;
      });

  const handleCreate = async () => {
    if (!form.business_name || !form.partner_name || !form.partner_phone || !form.city) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const referral_id   = generateHubReferralId();
    const referral_link = buildReferralLink(referral_id);
    try {
      await createMut.mutateAsync({
        ...form,
        commission_rate: parseFloat(form.commission_rate),
        created_by: user?.id,
        referral_id,
        referral_link,
        qr_tracking_id: referral_id,
        total_referrals: 0,
        total_revenue: 0,
        total_commission: 0,
        is_active: true,
      });
      toast.success(`Hub partner added! Referral ID: ${referral_id}`);
      setAddOpen(false);
      setForm({ business_name: '', partner_name: '', partner_phone: '', partner_email: '', address: '', city: '', state: '', pincode: '', hub_type: 'hub', commission_rate: '5' });
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add hub partner.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Hub Partners</h1>
          <p className="text-muted-foreground text-sm mt-1">Physical partner locations that promote Xplorwing via referral QR codes.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-[#013220] text-white hover:bg-[#013220]/90">
          <Plus className="h-4 w-4 mr-2" /> Add Hub Partner
        </Button>
      </div>

      {/* Analytics */}
      <AnalyticsCards />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, city, or referral ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tabs + Table */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Hubs</TabsTrigger>
          <TabsTrigger value="franchise">Franchises</TabsTrigger>
          <TabsTrigger value="hub">Hubs</TabsTrigger>
          <TabsTrigger value="restaurant">Chai Points & Restaurants</TabsTrigger>
          <TabsTrigger value="cab_driver">Cab Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No hub partners yet. Add one to get started.</TableCell></TableRow>
                    )}
                    {filtered.map((h: any) => {
                      const refId = h.referral_id || h.qr_tracking_id || '';
                    const referralLink = (h.referral_link && h.referral_link.split('=')[1])
                      ? h.referral_link
                      : buildReferralLink(refId);
                      const qrId = `qr-thumb-${h.id}`;
                      return (
                        <TableRow key={h.id}>
                          {/* Business */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-[#013220]/10 text-[#013220] flex items-center justify-center shrink-0">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{h.business_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{refId || '—'}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* QR Thumbnail */}
                          <TableCell>
                            <button
                              onClick={() => setQrHub(h)}
                              className="p-1 rounded-lg border hover:border-[#013220] transition-colors group"
                              title="View QR Code"
                            >
                              <QRCodeSVG
                                value={referralLink}
                                size={40}
                                bgColor="#ffffff"
                                fgColor="#013220"
                                level="M"
                              />
                            </button>
                          </TableCell>

                          {/* Partner */}
                          <TableCell>
                            <p className="text-sm">{h.partner_name}</p>
                            <p className="text-xs text-muted-foreground">{h.partner_phone}</p>
                          </TableCell>

                          <TableCell className="text-sm">{h.city}{h.state ? `, ${h.state}` : ''}</TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${HUB_TYPE_COLORS[h.hub_type] ?? ''}`}>{HUB_TYPE_LABELS[h.hub_type] ?? h.hub_type}</Badge>
                          </TableCell>

                          <TableCell className="text-sm font-semibold">{h.commission_rate}%</TableCell>
                          <TableCell className="text-sm font-medium">{h.total_referrals ?? 0}</TableCell>
                          <TableCell className="text-sm">₹{Number(h.total_revenue ?? 0).toFixed(0)}</TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge variant="outline" className={h.is_active ? 'bg-green-50 text-green-700 border-green-200 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                              {h.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEdit(h)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="View QR" onClick={() => setQrHub(h)}>
                                <QrCode className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7" title="Download QR"
                                onClick={() => {
                                  setQrHub(h);
                                  setTimeout(() => downloadQR(`qr-canvas-${h.id}`, `QR-${h.referral_id ?? h.id}`), 300);
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7" title="Copy Link"
                                onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Referral History" onClick={() => setHistoryHub(h)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                title="Open Partner Dashboard"
                                onClick={() => navigate(`/partner-dashboard/${refId}`)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                className={`h-7 w-7 ${h.is_active ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                title={h.is_active ? 'Deactivate' : 'Activate'}
                                onClick={() => toggleMut.mutate({ id: h.id, isActive: !h.is_active })}
                              >
                                {h.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Viewer */}
      <QRSheet hub={qrHub} open={!!qrHub} onClose={() => setQrHub(null)} />

      {/* Referral History */}
      <ReferralHistorySheet hub={historyHub} open={!!historyHub} onClose={() => setHistoryHub(null)} />

      {/* Edit Hub Partner Dialog */}
      <Dialog open={!!editHub} onOpenChange={(o) => !o && setEditHub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Hub Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Business Name *</Label>
                <Input value={editForm.business_name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, business_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partner Name *</Label>
                <Input value={editForm.partner_name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, partner_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partner Phone *</Label>
                <Input value={editForm.partner_phone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, partner_phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Partner Email</Label>
                <Input value={editForm.partner_email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, partner_email: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Input value={editForm.address ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>City *</Label>
                <Input value={editForm.city ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input value={editForm.state ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Partner Type</Label>
                <Select value={editForm.hub_type ?? 'hub'} onValueChange={(v) => setEditForm((f) => ({ ...f, hub_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hub">Hub</SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="restaurant">Chai Point / Restaurant</SelectItem>
                    <SelectItem value="cab_driver">Cab Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" min="0" max="100" value={editForm.commission_rate ?? '5'} onChange={(e) => setEditForm((f) => ({ ...f, commission_rate: e.target.value }))} />
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
                <Label>Partner Type</Label>
                <Select value={form.hub_type} onValueChange={(v) => setForm((f) => ({ ...f, hub_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hub">Hub</SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="restaurant">Chai Point / Restaurant</SelectItem>
                    <SelectItem value="cab_driver">Cab Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" min="0" max="100" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Auto-generated on save:</p>
              <p>• Unique Referral ID (e.g. HUB-6DBFF5E1)</p>
              <p>• Referral Link (https://xplorwing.com?ref=HUB-…)</p>
              <p>• QR Code (downloadable PNG)</p>
            </div>
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
