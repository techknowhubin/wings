import { motion } from 'framer-motion';
import {
  User, Save, Camera, Bell, Shield, CreditCard, Loader2, X,
  Eye, EyeOff, CheckCircle, Copy, RefreshCw, Trash2, QrCode,
  Building, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile, useHostProfile, useHostBookings } from '@/hooks/useListings';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { calculateHostBookingAmounts, formatPrice } from '@/lib/supabase-helpers';
import { safeDecrypt } from '@/lib/crypto';
import { SecurityCard } from '@/components/SecurityCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  new_bookings: boolean;
  booking_updates: boolean;
  cancellations: boolean;
  payments: boolean;
  admin_updates: boolean;
  marketing: boolean;
}

interface TwoFAData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

// ─── Default notification preferences ─────────────────────────────────────────

const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  new_bookings: true,
  booking_updates: true,
  cancellations: true,
  payments: true,
  admin_updates: true,
  marketing: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HostSettings() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: hostProfile } = useHostProfile(user?.id);
  const { data: bookings = [] } = useHostBookings(user?.id);
  const updateProfile = useUpdateProfile();

  // ── Profile state ──
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Notification prefs state ──
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // ── Password state ──
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwStep, setPwStep] = useState<'form' | 'otp'>('form');
  const [pwOtpCode, setPwOtpCode] = useState('');
  const [pendingNewPass, setPendingNewPass] = useState('');

  // ── 2FA state ──
  const [twoFAStatus, setTwoFAStatus] = useState<'idle' | 'enrolling' | 'enabled'>('idle');
  const [twoFAData, setTwoFAData] = useState<TwoFAData | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [isTwoFALoading, setIsTwoFALoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  // ── Billing state ──
  const [bankForm, setBankForm] = useState({
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    pan_number: '',
    gst_number: '',
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // ─── Sync profile → form ───────────────────────────────────────────────────

  useEffect(() => {
    if (!profile) return;
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || 'India',
    });
    setAvatarPreview(profile.profile_image || '');

    const prefs = (profile.preferences as any)?.notifications;
    if (prefs) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...prefs });
  }, [profile]);

  useEffect(() => {
    if (!hostProfile) return;
    setBankForm({
      bank_account_holder: hostProfile.bank_account_holder || '',
      bank_account_number: hostProfile.bank_account_number || '',
      bank_ifsc: hostProfile.bank_ifsc || '',
      bank_name: hostProfile.bank_name || '',
      pan_number: hostProfile.pan_number || '',
      gst_number: hostProfile.gst_number || '',
    });
  }, [hostProfile]);

  // Check if 2FA is already enabled
  const checkTwoFAStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === 'verified');
    if (verified) {
      setTwoFAStatus('enabled');
      setTwoFAData({ factorId: verified.id, qrCode: '', secret: '', uri: '' });
    }
  }, [user]);

  useEffect(() => { checkTwoFAStatus(); }, [checkTwoFAStatus]);

  if (profileLoading) return null;

  // ─── Profile handlers ──────────────────────────────────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are accepted');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      const BUCKET = 'avatars';

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        if (
          uploadError.message.toLowerCase().includes('bucket not found') ||
          uploadError.message.toLowerCase().includes('not found')
        ) {
          toast.error(
            'Storage bucket "avatars" not found. Please create it in Supabase Dashboard → Storage → New Bucket (name: avatars, Public: ON).'
          );
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      // Append timestamp to bust CDN cache after re-upload
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile.mutateAsync({ userId: user.id, updates: { profile_image: publicUrl } });
      setAvatarPreview(publicUrl);
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({ userId: user.id, updates: { profile_image: null } });
      setAvatarPreview('');
      toast.success('Profile picture removed');
    } catch {
      toast.error('Failed to remove profile picture');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile.mutateAsync({ userId: user.id, updates: formData });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Notification prefs handler ────────────────────────────────────────────

  const handleSaveNotifPrefs = async () => {
    if (!user || !profile) return;
    setIsSavingNotif(true);
    try {
      const existingPrefs = (profile.preferences as any) || {};
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { preferences: { ...existingPrefs, notifications: notifPrefs } as any },
      });
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsSavingNotif(false);
    }
  };

  // ─── Password handlers (Step 1: verify + send OTP · Step 2: confirm + update) ──

  const handlePasswordStep1 = async () => {
    const { current, newPass, confirm } = pwForm;
    if (!current || !newPass || !confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPass.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPass !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPw(true);
    try {
      // Verify the current password is correct first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: current,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Send a 6-digit OTP to the user's email via signInWithOtp.
      // This OTP has a much longer expiry than reauthenticate() and can be
      // entered manually. Verifying it gives us a fresh session that satisfies
      // GoTrue's UpdatePasswordRequireReauthentication check.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: user!.email!,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;

      setPendingNewPass(newPass);
      setPwStep('otp');
      toast.success(`Verification code sent to ${user?.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handlePasswordStep2 = async () => {
    const code = pwOtpCode.replace(/\s/g, '');
    if (code.length < 6) {
      toast.error('Enter the 6-digit code from your email');
      return;
    }
    setIsChangingPw(true);
    try {
      // Verify OTP — this creates a fresh authenticated session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: user!.email!,
        token: code,
        type: 'email',
      });
      if (verifyError) throw verifyError;

      // Update password with the fresh session
      const { error: updateError } = await supabase.auth.updateUser({ password: pendingNewPass });
      if (updateError) throw updateError;

      toast.success('Password updated successfully!');
      setPwForm({ current: '', newPass: '', confirm: '' });
      setPwOtpCode('');
      setPendingNewPass('');
      setPwStep('form');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handlePwCancelOtp = () => {
    setPwStep('form');
    setPwOtpCode('');
    setPendingNewPass('');
  };

  // ─── 2FA handlers ─────────────────────────────────────────────────────────

  const generateRecoveryCodes = () =>
    Array.from({ length: 8 }, () =>
      Array.from({ length: 4 }, () =>
        Math.random().toString(36).substring(2, 6).toUpperCase()
      ).join('-')
    );

  const handleEnable2FA = async () => {
    setIsTwoFALoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Xplorwing',
        friendlyName: 'Authenticator App',
      });
      if (error) throw error;

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: data.id,
      });
      if (challengeErr) throw challengeErr;

      setTwoFAData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setChallengeId(challengeData.id);
      setTwoFAStatus('enrolling');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start 2FA setup');
    } finally {
      setIsTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFAData || twoFACode.replace(/\s/g, '').length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setIsTwoFALoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: twoFAData.factorId,
        challengeId,
        code: twoFACode.replace(/\s/g, ''),
      });
      if (error) throw error;

      const codes = generateRecoveryCodes();
      setRecoveryCodes(codes);
      setShowRecovery(true);
      setTwoFAStatus('enabled');
      setTwoFACode('');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Please try again.');
    } finally {
      setIsTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFAData?.factorId) return;
    setIsTwoFALoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: twoFAData.factorId });
      if (error) throw error;
      setTwoFAStatus('idle');
      setTwoFAData(null);
      setTwoFACode('');
      setRecoveryCodes([]);
      setShowRecovery(false);
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA');
    } finally {
      setIsTwoFALoading(false);
    }
  };

  const copySecret = () => {
    if (twoFAData?.secret) {
      navigator.clipboard.writeText(twoFAData.secret);
      toast.success('Secret copied to clipboard');
    }
  };

  // ─── Billing handler ───────────────────────────────────────────────────────

  const handleSaveBank = async () => {
    if (!user) return;
    setIsSavingBank(true);
    try {
      const { error } = await supabase
        .from('host_profiles')
        .upsert({ id: user.id, ...bankForm, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Payout details saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payout details');
    } finally {
      setIsSavingBank(false);
    }
  };

  // ─── Earnings calculations ─────────────────────────────────────────────────

  const completedBookings = bookings.filter((b) => b.payment_status === 'completed');
  const pendingBookings = bookings.filter(
    (b) => b.booking_status === 'confirmed' && b.payment_status !== 'completed'
  );
  const totalEarned = completedBookings.reduce((sum, b) => {
    const { hostEarnings } = calculateHostBookingAmounts(b);
    return sum + hostEarnings;
  }, 0);
  const pendingEarnings = pendingBookings.reduce((sum, b) => {
    const { hostEarnings } = calculateHostBookingAmounts(b);
    return sum + hostEarnings;
  }, 0);

  const hasBankDetails = !!(bankForm.bank_account_number && bankForm.bank_name);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="mt-6 space-y-6">

          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>JPG, PNG or GIF · Max 2 MB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {avatarPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={handleRemoveAvatar}
                        title="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to upload or drag & drop your photo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled className="bg-secondary" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell guests about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Your business address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full lg:w-auto">
            {isSavingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(
                [
                  { key: 'new_bookings', label: 'New Booking Requests', desc: 'Get notified when a guest books your listing' },
                  { key: 'booking_updates', label: 'Booking Updates', desc: 'Updates about confirmed bookings and changes' },
                  { key: 'cancellations', label: 'Cancellations', desc: 'When a guest cancels a booking' },
                  { key: 'payments', label: 'Payment Notifications', desc: 'When you receive a payment or payout' },
                  { key: 'admin_updates', label: 'Admin Listing Updates', desc: 'Listing approval, rejection, or modification by admin' },
                  { key: 'marketing', label: 'Marketing & Tips', desc: 'Tips and offers to grow your hosting business' },
                ] as const
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
              <Button onClick={handleSaveNotifPrefs} disabled={isSavingNotif} className="w-full lg:w-auto">
                {isSavingNotif ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security" className="mt-6 space-y-6">

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                {pwStep === 'form'
                  ? 'Enter your current password and choose a new one'
                  : 'Enter the verification code sent to your email'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwStep === 'form' ? (
                <>
                  <div>
                    <Label htmlFor="current_password">Current Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="current_password"
                        type={showPw.current ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                        placeholder="Your current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                      >
                        {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="new_password"
                        type={showPw.new ? 'text' : 'password'}
                        value={pwForm.newPass}
                        onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })}
                        placeholder="Min. 8 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                      >
                        {showPw.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwForm.newPass && pwForm.newPass.length < 8 && (
                      <p className="text-xs text-destructive mt-1">Password must be at least 8 characters</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirm_password"
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                        placeholder="Repeat your new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                      >
                        {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwForm.confirm && pwForm.newPass !== pwForm.confirm && (
                      <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <Button onClick={handlePasswordStep1} disabled={isChangingPw} className="w-full lg:w-auto">
                    {isChangingPw
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Shield className="h-4 w-4 mr-2" />}
                    {isChangingPw ? 'Sending code…' : 'Send Verification Code'}
                  </Button>
                </>
              ) : (
                /* OTP step */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                    <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Code sent to your email
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-500 mt-0.5">
                        We sent a 6-digit verification code to{' '}
                        <strong>{user?.email}</strong>. Check your inbox (and spam folder).
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pw_otp">Verification Code</Label>
                    <Input
                      id="pw_otp"
                      value={pwOtpCode}
                      onChange={(e) => setPwOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      className="text-center text-2xl tracking-[0.5em] font-mono mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasswordStep2}
                      disabled={isChangingPw || pwOtpCode.length < 6}
                      className="flex-1"
                    >
                      {isChangingPw
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <CheckCircle className="h-4 w-4 mr-2" />}
                      Update Password
                    </Button>
                    <Button variant="outline" onClick={handlePwCancelOtp} disabled={isChangingPw}>
                      Cancel
                    </Button>
                  </div>

                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                    onClick={async () => {
                      const { error } = await supabase.auth.signInWithOtp({
                        email: user!.email!,
                        options: { shouldCreateUser: false },
                      });
                      if (!error) toast.success('New code sent — check your inbox');
                      else toast.error('Could not resend. Please try again shortly.');
                    }}
                  >
                    Didn't receive it? Resend code
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <SecurityCard userId={user!.id} />
        </TabsContent>

        {/* ── Billing Tab ── */}
        <TabsContent value="billing" className="mt-6 space-y-6">

          {/* Earnings Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="p-4">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total Earned</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
                  {formatPrice(totalEarned)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">{completedBookings.length} completed bookings</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Pending Earnings</p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                  {formatPrice(pendingEarnings)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{pendingBookings.length} confirmed bookings</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">{bookings.length}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Payout Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Payout Method
              </CardTitle>
              <CardDescription>
                Add your bank account details to receive payouts
                {hasBankDetails && (
                  <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" /> Saved
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                  <Input
                    id="bank_account_holder"
                    value={bankForm.bank_account_holder}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_holder: e.target.value })}
                    placeholder="Name as on bank account"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    placeholder="e.g. State Bank of India"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={bankForm.bank_account_number}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_ifsc">IFSC Code</Label>
                  <Input
                    id="bank_ifsc"
                    value={bankForm.bank_ifsc}
                    onChange={(e) => setBankForm({ ...bankForm, bank_ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={bankForm.pan_number}
                    onChange={(e) => setBankForm({ ...bankForm, pan_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                  />
                </div>
                <div>
                  <Label htmlFor="gst_number">GST Number (optional)</Label>
                  <Input
                    id="gst_number"
                    value={bankForm.gst_number}
                    onChange={(e) => setBankForm({ ...bankForm, gst_number: e.target.value.toUpperCase() })}
                    placeholder="GST registration number"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBank} disabled={isSavingBank} className="w-full lg:w-auto">
                {isSavingBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Payout Details
              </Button>
            </CardContent>
          </Card>

          {/* Commission Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Structure</CardTitle>
              <CardDescription>Platform fees per booking channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium">Marketplace Bookings</p>
                  <p className="text-sm text-muted-foreground">Bookings via the Xplorwing marketplace</p>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">20%</Badge>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Link-in-Bio Bookings</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Bookings via your personal link-in-bio page
                  </p>
                </div>
                <Badge className="bg-green-600 hover:bg-green-600 text-white text-base px-3 py-1">10%</Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Commission is deducted from the total booking amount before payout. Payouts are processed within 3–5 business days after checkout.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
