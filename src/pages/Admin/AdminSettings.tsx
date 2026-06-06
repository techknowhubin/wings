import { useCallback, useEffect, useState } from 'react';
import { useAdminTeam } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Settings2, Shield, Save, UserPlus, Trash2, RefreshCw,
  AlertCircle, CreditCard, Bell, Lock, FileText, Tag,
  DollarSign, QrCode, CheckCircle2,
} from 'lucide-react';

// ─── Default settings (used when DB row doesn't exist yet) ───────────────────
const DEFAULTS = {
  marketplace_commission_pct: 20,
  linkinbio_commission_pct: 10,
  hub_commission_pct: 5,
  platform_name: 'Xplorwing',
  support_email: 'support@xplorwing.com',
  support_phone: '+91 9422799420',
  support_whatsapp: '',
  kyc_sla_hours: 2,
  max_kyc_attempts: 5,
  referral_commission_pct: 5,
  referral_expiry_days: 30,
  razorpay_enabled: true,
  minimum_payout_amount: 500,
  require_email_verification: false,
  session_timeout_hours: 24,
  email_notifications_enabled: true,
  whatsapp_notifications_enabled: true,
  blog_auto_publish: false,
  blog_moderation_enabled: true,
};

type Settings = typeof DEFAULTS;

// ─── Section wrapper ──────────────────────────────────────────────────────────
function SettingSection({
  icon: Icon, title, description, loading, children,
}: {
  icon: React.ElementType; title: string; description?: string;
  loading?: boolean; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#013220]" />{title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Skeleton className="h-28 w-full rounded-xl" /> : children}
      </CardContent>
    </Card>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { toast } = useToast();
  const { data: admins, isLoading: aLoading, refetch } = useAdminTeam();

  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [reviewMinorChanges, setReviewMinorChanges] = useState(() => {
    return localStorage.getItem('review_minor_changes') === 'true';
  });
  const [reviewMajorChanges, setReviewMajorChanges] = useState(() => {
    return localStorage.getItem('review_major_changes') !== 'false';
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const setSavingKey = (key: string, val: boolean) =>
    setSaving((p) => ({ ...p, [key]: val }));

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setSettings((p) => ({ ...p, [key]: val }));

  // ─── Load settings ──────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setTableMissing(false);

    const { data, error } = await supabase
      .from('platform_settings' as any)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('42P01')) {
        setTableMissing(true);
      } else {
        setLoadError(msg);
      }
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        marketplace_commission_pct:    Number(data.marketplace_commission_pct   ?? DEFAULTS.marketplace_commission_pct),
        linkinbio_commission_pct:      Number(data.linkinbio_commission_pct     ?? DEFAULTS.linkinbio_commission_pct),
        hub_commission_pct:            Number(data.hub_commission_pct           ?? DEFAULTS.hub_commission_pct),
        platform_name:                 data.platform_name                       ?? DEFAULTS.platform_name,
        support_email:                 data.support_email                       ?? DEFAULTS.support_email,
        support_phone:                 data.support_phone                       ?? DEFAULTS.support_phone,
        support_whatsapp:              data.support_whatsapp                    ?? DEFAULTS.support_whatsapp,
        kyc_sla_hours:                 Number(data.kyc_sla_hours                ?? DEFAULTS.kyc_sla_hours),
        max_kyc_attempts:              Number(data.max_kyc_attempts             ?? DEFAULTS.max_kyc_attempts),
        referral_commission_pct:       Number(data.referral_commission_pct      ?? DEFAULTS.referral_commission_pct),
        referral_expiry_days:          Number(data.referral_expiry_days         ?? DEFAULTS.referral_expiry_days),
        razorpay_enabled:              Boolean(data.razorpay_enabled            ?? DEFAULTS.razorpay_enabled),
        minimum_payout_amount:         Number(data.minimum_payout_amount        ?? DEFAULTS.minimum_payout_amount),
        require_email_verification:    Boolean(data.require_email_verification  ?? DEFAULTS.require_email_verification),
        session_timeout_hours:         Number(data.session_timeout_hours        ?? DEFAULTS.session_timeout_hours),
        email_notifications_enabled:   Boolean(data.email_notifications_enabled ?? DEFAULTS.email_notifications_enabled),
        whatsapp_notifications_enabled:Boolean(data.whatsapp_notifications_enabled ?? DEFAULTS.whatsapp_notifications_enabled),
        blog_auto_publish:             Boolean(data.blog_auto_publish           ?? DEFAULTS.blog_auto_publish),
        blog_moderation_enabled:       Boolean(data.blog_moderation_enabled     ?? DEFAULTS.blog_moderation_enabled),
      });
    }
    // data is null → table exists but no row yet; defaults are fine
    setLoading(false);
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  // ─── Upsert helper ──────────────────────────────────────────────────────────
  const upsert = async (partial: Partial<Settings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('platform_settings' as any).upsert({
      id: '00000000-0000-0000-0000-000000000001',
      ...partial,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) throw error;
  };

  // ─── Save helpers ───────────────────────────────────────────────────────────
  const save = async (key: string, partial: Partial<Settings>, successMsg: string) => {
    setSavingKey(key, true);
    try {
      await upsert(partial);
      toast({ title: successMsg, description: 'Changes saved successfully.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to save', description: e.message });
    } finally {
      setSavingKey(key, false);
    }
  };

  // ─── Admin team handlers ────────────────────────────────────────────────────
  const handleAddAdmin = async () => {
    if (!newAdminPhone.trim()) return;
    setAddingAdmin(true);
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('phone', newAdminPhone.trim())
        .maybeSingle();
      if (pErr || !profile) {
        toast({ variant: 'destructive', title: 'User not found', description: 'No account found with this phone number.' });
        return;
      }
      const { error } = await supabase.from('user_roles').upsert(
        { user_id: profile.id, role: 'admin' },
        { onConflict: 'user_id,role', ignoreDuplicates: true }
      );
      if (error) throw error;
      toast({ title: `Admin access granted to ${profile.full_name ?? newAdminPhone}.` });
      setNewAdminPhone('');
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

  // ─── Table missing banner ───────────────────────────────────────────────────
  if (tableMissing) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide configuration.</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>The <code className="bg-muted px-1 rounded text-xs font-mono">platform_settings</code> table doesn't exist in your Supabase database.</p>
            <p className="font-semibold">Run this migration in Supabase → SQL Editor:</p>
            <div className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre">
              {`-- Copy the file: supabase/migrations/20260605000000_create_platform_settings.sql
-- Or run the key part:

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  marketplace_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  linkinbio_commission_pct   NUMERIC(5,2) NOT NULL DEFAULT 10,
  hub_commission_pct         NUMERIC(5,2) NOT NULL DEFAULT 5,
  platform_name TEXT NOT NULL DEFAULT 'Xplorwing',
  support_email TEXT NOT NULL DEFAULT 'support@xplorwing.com',
  support_phone TEXT NOT NULL DEFAULT '+91 9422799420',
  kyc_sla_hours INTEGER NOT NULL DEFAULT 2,
  max_kyc_attempts INTEGER NOT NULL DEFAULT 5,
  referral_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  referral_expiry_days INTEGER NOT NULL DEFAULT 30,
  razorpay_enabled BOOLEAN NOT NULL DEFAULT true,
  minimum_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 500,
  require_email_verification BOOLEAN NOT NULL DEFAULT false,
  session_timeout_hours INTEGER NOT NULL DEFAULT 24,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  blog_auto_publish BOOLEAN NOT NULL DEFAULT false,
  blog_moderation_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;`}
            </div>
            <Button onClick={loadSettings} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />Retry after running migration
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ─── Generic load error ─────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load settings</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{loadError}</p>
            <Button onClick={loadSettings} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ─── Main settings UI ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure platform-wide settings and manage the admin team.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* ── 1. Commission Rates ──────────────────────────────────────────── */}
      <SettingSection icon={DollarSign} title="Commission Rates"
        description="Applied to all new bookings on the respective channels." loading={loading}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Marketplace (%)" hint="Default 20%">
            <Input type="number" min={0} max={100} value={settings.marketplace_commission_pct}
              onChange={(e) => set('marketplace_commission_pct', Number(e.target.value))} />
          </Field>
          <Field label="Link-in-Bio (%)" hint="Default 10%">
            <Input type="number" min={0} max={100} value={settings.linkinbio_commission_pct}
              onChange={(e) => set('linkinbio_commission_pct', Number(e.target.value))} />
          </Field>
          <Field label="Hub Booking (%)" hint="Default 5%">
            <Input type="number" min={0} max={100} value={settings.hub_commission_pct}
              onChange={(e) => set('hub_commission_pct', Number(e.target.value))} />
          </Field>
        </div>
        <Button disabled={saving.commission} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('commission', {
            marketplace_commission_pct: settings.marketplace_commission_pct,
            linkinbio_commission_pct: settings.linkinbio_commission_pct,
            hub_commission_pct: settings.hub_commission_pct,
          }, 'Commission rates saved')}>
          {saving.commission ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Commission Rates
        </Button>
      </SettingSection>

      {/* ── 2. Platform Config ───────────────────────────────────────────── */}
      <SettingSection icon={Settings2} title="Platform Configuration"
        description="General platform identity and support contact details." loading={loading}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Platform Name">
            <Input value={settings.platform_name} onChange={(e) => set('platform_name', e.target.value)} />
          </Field>
          <Field label="Support Email">
            <Input type="email" value={settings.support_email} onChange={(e) => set('support_email', e.target.value)} />
          </Field>
          <Field label="Support Phone">
            <Input value={settings.support_phone} onChange={(e) => set('support_phone', e.target.value)} />
          </Field>
          <Field label="Support WhatsApp">
            <Input value={settings.support_whatsapp} onChange={(e) => set('support_whatsapp', e.target.value)} placeholder="+91 9000000000" />
          </Field>
        </div>
        <Button disabled={saving.platform} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('platform', {
            platform_name: settings.platform_name,
            support_email: settings.support_email,
            support_phone: settings.support_phone,
            support_whatsapp: settings.support_whatsapp,
          }, 'Platform configuration saved')}>
          {saving.platform ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Platform Config
        </Button>
      </SettingSection>

      {/* ── 3. KYC & Verification ────────────────────────────────────────── */}
      <SettingSection icon={Shield} title="KYC & Verification"
        description="Control identity verification requirements and SLA targets." loading={loading}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="KYC Review SLA (hours)" hint="Target hours for admin review">
            <Input type="number" min={1} value={settings.kyc_sla_hours}
              onChange={(e) => set('kyc_sla_hours', Number(e.target.value))} />
          </Field>
          <Field label="Max KYC Attempts" hint="Before permanent rejection">
            <Input type="number" min={1} value={settings.max_kyc_attempts}
              onChange={(e) => set('max_kyc_attempts', Number(e.target.value))} />
          </Field>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-border">
          <div>
            <p className="text-sm font-medium">Require Email Verification</p>
            <p className="text-xs text-muted-foreground">Users must verify email before signing in</p>
          </div>
          <Switch checked={settings.require_email_verification}
            onCheckedChange={(v) => set('require_email_verification', v)} />
        </div>
        <Button disabled={saving.kyc} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('kyc', {
            kyc_sla_hours: settings.kyc_sla_hours,
            max_kyc_attempts: settings.max_kyc_attempts,
            require_email_verification: settings.require_email_verification,
          }, 'KYC settings saved')}>
          {saving.kyc ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save KYC Settings
        </Button>
      </SettingSection>

      {/* ── 3.5. Listing Approval Rules ───────────────────────────────────── */}
      <SettingSection icon={Shield} title="Listing Approval Rules"
        description="Configure rules for new listings and host updates.">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium">New Listings Require Approval</p>
              <p className="text-xs text-muted-foreground">Always require admin approval before new listings go live</p>
            </div>
            <Switch checked={true} disabled />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium">Review Major Updates</p>
              <p className="text-xs text-muted-foreground">Require approval when host changes location, property details, room types, or amenities</p>
            </div>
            <Switch 
              checked={reviewMajorChanges}
              onCheckedChange={(v) => {
                setReviewMajorChanges(v);
                localStorage.setItem('review_major_changes', String(v));
                toast({ title: 'Approval rule updated', description: `Major changes will ${v ? 'now' : 'no longer'} require admin approval.` });
              }}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium">Review Minor Updates</p>
              <p className="text-xs text-muted-foreground">Require approval when host changes pricing, availability status, or gallery photos</p>
            </div>
            <Switch 
              checked={reviewMinorChanges}
              onCheckedChange={(v) => {
                setReviewMinorChanges(v);
                localStorage.setItem('review_minor_changes', String(v));
                toast({ title: 'Approval rule updated', description: `Minor changes will ${v ? 'now' : 'no longer'} require admin approval.` });
              }}
            />
          </div>
        </div>
      </SettingSection>

      {/* ── 4. Payment & Payouts ─────────────────────────────────────────── */}
      <SettingSection icon={CreditCard} title="Payment & Payouts"
        description="Configure payment gateways and payout thresholds." loading={loading}>
        <div className="flex items-center justify-between p-3 rounded-xl border border-border">
          <div>
            <p className="text-sm font-medium">Razorpay Payments</p>
            <p className="text-xs text-muted-foreground">Enable Razorpay as the payment gateway</p>
          </div>
          <Switch checked={settings.razorpay_enabled}
            onCheckedChange={(v) => set('razorpay_enabled', v)} />
        </div>
        <Field label="Minimum Payout Amount (₹)" hint="Hosts must reach this threshold before payouts">
          <Input type="number" min={0} value={settings.minimum_payout_amount}
            onChange={(e) => set('minimum_payout_amount', Number(e.target.value))} />
        </Field>
        <Button disabled={saving.payment} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('payment', {
            razorpay_enabled: settings.razorpay_enabled,
            minimum_payout_amount: settings.minimum_payout_amount,
          }, 'Payment settings saved')}>
          {saving.payment ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Payment Settings
        </Button>
      </SettingSection>

      {/* ── 5. Referral Settings ─────────────────────────────────────────── */}
      <SettingSection icon={QrCode} title="Referral & Hub Partners"
        description="Configure referral commission rates and link expiry." loading={loading}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Referral Commission (%)" hint="Commission paid to hub partners">
            <Input type="number" min={0} max={100} value={settings.referral_commission_pct}
              onChange={(e) => set('referral_commission_pct', Number(e.target.value))} />
          </Field>
          <Field label="Referral Link Expiry (days)" hint="Days before referral code expires">
            <Input type="number" min={1} value={settings.referral_expiry_days}
              onChange={(e) => set('referral_expiry_days', Number(e.target.value))} />
          </Field>
        </div>
        <Button disabled={saving.referral} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('referral', {
            referral_commission_pct: settings.referral_commission_pct,
            referral_expiry_days: settings.referral_expiry_days,
          }, 'Referral settings saved')}>
          {saving.referral ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Referral Settings
        </Button>
      </SettingSection>

      {/* ── 6. Notification Settings ─────────────────────────────────────── */}
      <SettingSection icon={Bell} title="Notifications"
        description="Control which notification channels are active." loading={loading}>
        <div className="space-y-3">
          {[
            { key: 'email_notifications_enabled' as const, label: 'Email Notifications', desc: 'Send email alerts for bookings, KYC, and payouts' },
            { key: 'whatsapp_notifications_enabled' as const, label: 'WhatsApp Notifications', desc: 'Send WhatsApp messages for booking updates' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
        <Button disabled={saving.notifications} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('notifications', {
            email_notifications_enabled: settings.email_notifications_enabled,
            whatsapp_notifications_enabled: settings.whatsapp_notifications_enabled,
          }, 'Notification settings saved')}>
          {saving.notifications ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Notification Settings
        </Button>
      </SettingSection>

      {/* ── 7. Security Settings ─────────────────────────────────────────── */}
      <SettingSection icon={Lock} title="Security"
        description="Session and authentication security settings." loading={loading}>
        <Field label="Session Timeout (hours)" hint="How long before an inactive session expires">
          <Input type="number" min={1} value={settings.session_timeout_hours}
            onChange={(e) => set('session_timeout_hours', Number(e.target.value))} />
        </Field>
        <Button disabled={saving.security} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('security', { session_timeout_hours: settings.session_timeout_hours }, 'Security settings saved')}>
          {saving.security ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Security Settings
        </Button>
      </SettingSection>

      {/* ── 8. Blog Settings ─────────────────────────────────────────────── */}
      <SettingSection icon={FileText} title="Blog Settings"
        description="Control blog publishing and moderation behavior." loading={loading}>
        <div className="space-y-3">
          {[
            { key: 'blog_auto_publish' as const, label: 'Auto-publish New Posts', desc: 'New blog posts go live immediately without admin review' },
            { key: 'blog_moderation_enabled' as const, label: 'Content Moderation', desc: 'Require admin approval before publishing' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
        <Button disabled={saving.blog} className="bg-[#013220] text-white hover:bg-[#013220]/90"
          onClick={() => save('blog', {
            blog_auto_publish: settings.blog_auto_publish,
            blog_moderation_enabled: settings.blog_moderation_enabled,
          }, 'Blog settings saved')}>
          {saving.blog ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Blog Settings
        </Button>
      </SettingSection>

      {/* ── 9. Admin Team ────────────────────────────────────────────────── */}
      <SettingSection icon={Shield} title="Admin Team"
        description="Users with full admin access to this dashboard.">
        <div className="flex gap-3">
          <Input
            placeholder="Phone number to grant admin access…"
            value={newAdminPhone}
            onChange={(e) => setNewAdminPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
          />
          <Button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminPhone.trim()}
            className="bg-[#013220] text-white hover:bg-[#013220]/90 shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            {addingAdmin ? 'Adding…' : 'Add Admin'}
          </Button>
        </div>
        <Separator />
        {aLoading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(admins ?? []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No admins found.</TableCell></TableRow>
              )}
              {(admins ?? []).map((a: any) => (
                <TableRow key={a.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#013220] text-[#D4E034] flex items-center justify-center font-black text-xs shrink-0">
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
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                      disabled={removingId === a.user_id}
                      onClick={() => handleRemoveAdmin(a.user_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingSection>
    </div>
  );
}
