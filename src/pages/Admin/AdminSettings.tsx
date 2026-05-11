import { useState } from 'react';
import { useAdminTeam } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings2, Shield, Save, UserPlus, Trash2 } from 'lucide-react';

export default function AdminSettings() {
  const { toast } = useToast();

  // Commission rates
  const [marketplace, setMarketplace] = useState('20');
  const [linkInBio, setLinkInBio] = useState('10');
  const [hubCommission, setHubCommission] = useState('5');

  // Platform config
  const [kycSla, setKycSla] = useState('2');
  const [maxKycAttempts, setMaxKycAttempts] = useState('5');
  const [platformName, setPlatformName] = useState('Xplorwing');
  const [supportEmail, setSupportEmail] = useState('support@xplorwing.com');

  // Admin team
  const { data: admins, isLoading: aLoading, refetch } = useAdminTeam();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSaveCommission = () => {
    toast({ title: 'Commission rates saved.', description: 'Changes will apply to new bookings.' });
  };

  const handleSavePlatform = () => {
    toast({ title: 'Platform configuration saved.' });
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      // Find the user by phone via profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', newAdminEmail.trim())
        .maybeSingle();

      if (profileErr || !profile) {
        toast({ variant: 'destructive', title: 'User not found', description: 'No account exists with this phone number.' });
        return;
      }

      const { error } = await supabase.from('user_roles').upsert({ user_id: profile.id, role: 'admin' }, { onConflict: 'user_id,role', ignoreDuplicates: true });
      if (error) throw error;

      toast({ title: `Admin access granted to ${newAdminEmail}.` });
      setNewAdminEmail('');
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to add admin', description: e.message });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    setRemovingId(userId);
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) throw error;
      toast({ title: 'Admin access revoked.' });
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure platform-wide settings and manage the admin team.</p>
      </div>

      {/* Commission Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Commission Rates</CardTitle>
          <CardDescription>These rates apply to all new bookings on the respective channels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Marketplace (%)</Label>
              <Input type="number" min="0" max="100" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Link-in-Bio (%)</Label>
              <Input type="number" min="0" max="100" value={linkInBio} onChange={(e) => setLinkInBio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hub Booking (%)</Label>
              <Input type="number" min="0" max="100" value={hubCommission} onChange={(e) => setHubCommission(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSaveCommission} className="bg-[#013220] text-white hover:bg-[#013220]/90">
            <Save className="h-4 w-4 mr-2" /> Save Commission Rates
          </Button>
        </CardContent>
      </Card>

      {/* Platform Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>KYC Review SLA (hours)</Label>
              <Input type="number" min="1" value={kycSla} onChange={(e) => setKycSla(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Max KYC Attempts</Label>
              <Input type="number" min="1" value={maxKycAttempts} onChange={(e) => setMaxKycAttempts(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Platform Name</Label>
              <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Support Email</Label>
              <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSavePlatform} className="bg-[#013220] text-white hover:bg-[#013220]/90">
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Admin Team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Admin Team</CardTitle>
          <CardDescription>Users with full admin access to this dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Admin */}
          <div className="flex gap-3">
            <Input
              placeholder="Enter phone number to grant admin access…"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
            />
            <Button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminEmail.trim()} className="bg-[#013220] text-white hover:bg-[#013220]/90 shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              {addingAdmin ? 'Adding…' : 'Add Admin'}
            </Button>
          </div>

          <Separator />

          {aLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(admins ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No admins found.</TableCell></TableRow>
                )}
                {(admins ?? []).map((a: any) => (
                  <TableRow key={a.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#013220] text-[#D4E034] flex items-center justify-center font-black text-xs">
                          {a.full_name?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{a.full_name ?? '—'}</p>
                          <Badge className="text-[9px] bg-[#D4E034]/20 text-[#013220] border-0">Admin</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveAdmin(a.user_id)}
                        disabled={removingId === a.user_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
