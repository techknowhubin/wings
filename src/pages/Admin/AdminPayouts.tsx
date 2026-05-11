import { useState } from 'react';
import { useAdminPayouts, useUnpaidBookings, useMarkAsPaid } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPayouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [reference, setReference] = useState('');

  const { data: payouts, isLoading: pLoading } = useAdminPayouts();
  const { data: unpaid, isLoading: uLoading } = useUnpaidBookings();
  const markPaidMut = useMarkAsPaid();

  const handleMarkPaid = async () => {
    if (!selected || !user) return;
    const commission = Number(selected.commission_amount ?? 0);
    const amount = Number(selected.total_amount ?? 0);
    await markPaidMut.mutateAsync({
      bookingId: selected.id,
      providerId: selected.host_id,
      amount,
      commission,
      reference: reference || undefined,
      adminId: user.id,
    });
    toast({ title: 'Payout marked as paid!', className: 'border-green-200 bg-green-50 text-green-800' });
    setSelected(null);
    setReference('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Payouts</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage provider payouts for completed bookings.</p>
      </div>

      {/* Pending Payouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-500" />
            Pending Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {uLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Provider Share</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(unpaid ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    All payouts are up to date!
                  </TableCell></TableRow>
                )}
                {(unpaid ?? []).map((b: any) => {
                  const total = Number(b.total_amount ?? 0);
                  const commission = Number(b.commission_amount ?? 0);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm font-medium">{b.host?.full_name ?? '—'}</TableCell>
                      <TableCell><code className="text-xs font-mono text-muted-foreground">{b.id?.slice(0, 8)}</code></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{b.listing_type}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">₹{total.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-red-600">-₹{commission.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-sm font-bold text-green-700">₹{(total - commission).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.updated_at ? format(new Date(b.updated_at), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setSelected(b)}>
                          Mark as Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payout History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Net Payout</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Payment Ref</TableHead>
                  <TableHead>Paid On</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payouts ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payout history yet.</TableCell></TableRow>
                )}
                {(payouts ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.provider?.full_name ?? '—'}</TableCell>
                    <TableCell className="text-sm font-bold text-green-700">₹{Number(p.net_payout).toLocaleString('en-IN')}</TableCell>
                    <TableCell><code className="text-xs font-mono text-muted-foreground">{p.booking_id?.slice(0, 8) ?? '—'}</code></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.payment_reference ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.paid_at ? format(new Date(p.paid_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] capitalize">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Payout as Paid</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-4 rounded-xl border bg-muted/20 text-sm">
              <p><span className="text-muted-foreground">Provider:</span> <strong>{selected?.host?.full_name}</strong></p>
              <p><span className="text-muted-foreground">Net payout:</span> <strong className="text-green-700">₹{(Number(selected?.total_amount) - Number(selected?.commission_amount)).toLocaleString('en-IN')}</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Payment Reference / UTR (optional)</Label>
              <Input placeholder="UTR number or transaction ID" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid} disabled={markPaidMut.isPending}>
              {markPaidMut.isPending ? 'Processing…' : 'Confirm Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
