import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, CheckCircle, QrCode, Copy, Trash2, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateTOTP, enable2FA, disable2FA, generateRecoveryCodes, verifyTOTP } from '@/lib/totp';
import { decryptField } from '@/lib/crypto';
import { QRCodeSVG } from 'qrcode.react';

interface SecurityCardProps {
  userId: string;
}

export function SecurityCard({ userId }: SecurityCardProps) {
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Setup State
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Recovery Codes State
  const [showCodes, setShowCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setIsEnabled(!!data.two_factor_enabled);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetupStart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error('Email is required for 2FA setup');
      return;
    }
    const totpData = generateTOTP(user.email);
    setSecret(totpData.secret);
    setUri(totpData.uri);
    setSetupMode(true);
  };

  const handleVerifySetup = async () => {
    if (otpInput.length < 6) return;
    setIsVerifying(true);
    try {
      const isValid = verifyTOTP(secret, otpInput);
      if (!isValid) {
        toast.error('Invalid verification code');
        return;
      }
      
      const codes = generateRecoveryCodes();
      const success = await enable2FA(userId, secret, codes);
      if (success) {
        setIsEnabled(true);
        setSetupMode(false);
        setOtpInput('');
        setRecoveryCodes(codes);
        setShowCodes(true);
        toast.success('Two-Factor Authentication enabled securely!');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleViewCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('recovery_codes_encrypted')
        .eq('id', userId)
        .single();
        
      if (error || !data.recovery_codes_encrypted) throw new Error('Could not fetch recovery codes');
      
      const decrypted = await decryptField(data.recovery_codes_encrypted, {
        table: 'profiles',
        column: 'recovery_codes_encrypted',
        recordId: userId
      });
      
      const codes = JSON.parse(decrypted);
      setRecoveryCodes(codes);
      setShowCodes(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve recovery codes.');
    }
  };

  const handleRegenerateCodes = async () => {
    setIsRegenerating(true);
    try {
      const newCodes = generateRecoveryCodes();
      // To regenerate, we just re-save the new codes encrypted
      const { encryptField } = await import('@/lib/crypto');
      const encryptedCodes = await encryptField(JSON.stringify(newCodes));
      
      const { error } = await supabase
        .from('profiles')
        .update({ recovery_codes_encrypted: encryptedCodes })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Log audit
      await supabase.rpc('log_audit_event', {
        p_user_id: userId,
        p_actor_id: userId,
        p_action: '2fa_recovery_codes_regenerated',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_ip_address: 'client'
      });

      setRecoveryCodes(newCodes);
      setShowCodes(true);
      toast.success('Recovery codes regenerated securely.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to regenerate recovery codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) return;
    const success = await disable2FA(userId);
    if (success) {
      setIsEnabled(false);
      setShowCodes(false);
      toast.success('Two-Factor Authentication disabled');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Shield className="h-40 w-40" />
      </div>
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account with a TOTP authenticator app.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6 relative z-10">
        {!isEnabled && !setupMode && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Authenticator App</h3>
              <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or Microsoft Authenticator.</p>
            </div>
            <Button onClick={handleSetupStart} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <QrCode className="h-4 w-4 mr-2" /> Setup Google Authenticator
            </Button>
          </div>
        )}

        {setupMode && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 border border-emerald-100 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl">
              <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-400 mb-2">Step 1: Scan QR Code</h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4">Open your authenticator app and scan the QR code below.</p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <QRCodeSVG value={uri} size={150} level="M" />
                </div>
                <div className="flex-1 w-full text-center sm:text-left">
                  <p className="text-xs text-muted-foreground mb-1">Can't scan the code? Use this setup key:</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <code className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider shadow-sm">
                      {secret}
                    </code>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(secret); toast.success('Copied!'); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border border-border bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-4">
              <h3 className="font-semibold text-lg">Step 2: Verify Code</h3>
              <p className="text-sm text-muted-foreground">Enter the 6-digit verification code generated by your app.</p>
              <div className="flex gap-3">
                <Input 
                  value={otpInput} 
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" 
                  className="font-mono text-xl tracking-widest text-center max-w-[150px] shadow-sm"
                />
                <Button onClick={handleVerifySetup} disabled={isVerifying || otpInput.length < 6} className="bg-emerald-600 hover:bg-emerald-700">
                  {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Verify & Enable
                </Button>
                <Button variant="ghost" onClick={() => setSetupMode(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between p-4 border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    2FA is Active <Badge className="bg-emerald-500 text-white border-0 hover:bg-emerald-600">Secure</Badge>
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500">Your account is protected by Google Authenticator.</p>
                </div>
              </div>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleDisable}>
                <Trash2 className="h-4 w-4 mr-2" /> Disable 2FA
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="outline" className="h-14 flex justify-start px-4 shadow-sm" onClick={handleViewCodes}>
                <Key className="h-5 w-5 mr-3 text-slate-500" /> 
                <div className="text-left">
                  <div className="font-semibold text-sm">View Recovery Codes</div>
                  <div className="text-xs text-muted-foreground">In case you lose your device</div>
                </div>
              </Button>
              <Button variant="outline" className="h-14 flex justify-start px-4 shadow-sm" onClick={handleRegenerateCodes} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="h-5 w-5 mr-3 animate-spin text-slate-500" /> : <RefreshCw className="h-5 w-5 mr-3 text-slate-500" />}
                <div className="text-left">
                  <div className="font-semibold text-sm">Regenerate Codes</div>
                  <div className="text-xs text-muted-foreground">Invalidates existing codes</div>
                </div>
              </Button>
            </div>

            {showCodes && recoveryCodes.length > 0 && (
              <div className="p-5 border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 rounded-xl space-y-4 animate-in slide-in-from-top-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-400">Save your recovery codes</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-500">Keep these codes in a secure location. Each code can only be used once.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {recoveryCodes.map(code => (
                    <div key={code} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 p-2 rounded text-center font-mono text-sm tracking-wider shadow-sm">
                      {code}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setShowCodes(false)}>
                    Hide Codes
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join('\n'));
                    toast.success('Codes copied to clipboard');
                  }}>
                    <Copy className="h-4 w-4 mr-2" /> Copy All
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
