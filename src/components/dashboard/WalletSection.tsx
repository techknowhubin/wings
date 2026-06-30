import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, Gift, ArrowDownLeft, ArrowUpRight,
  History, Clock, CheckCircle2, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { INR } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function WalletSection() {
  const { user } = useAuth();

  // Fetch Wallet Data
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['user-wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch Wallet Settings
  const { data: walletSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['wallet-settings-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_settings')
        .select('*')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch Transactions
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!wallet?.id,
  });

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'signup_bonus': return 'Sign-Up Bonus';
      case 'referral_reward': return 'Referral Reward';
      case 'welcome_local_booking': return 'First Local/Airport Booking Bonus';
      case 'welcome_outstation_booking': return 'First Outstation Booking Bonus';
      case 'referral_local_booking': return "Referral: Friend's Local Booking";
      case 'referral_outstation_booking': return "Referral: Friend's Outstation Booking";
      case 'booking_redemption': return 'Booking Deduction';
      case 'expired_credits': return 'Expired Credits';
      case 'admin_credit': return 'Promotional Credit';
      case 'admin_deduction': return 'Admin Deduction';
      default: return 'Transaction';
    }
  };

  if (walletLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (walletSettings && !walletSettings.program_enabled) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wing Credits Disabled</h3>
          <p className="text-muted-foreground">Wing Credits program is currently disabled.</p>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Initialized</h3>
          <p className="text-muted-foreground">Your wallet will be active soon.</p>
        </CardContent>
      </Card>
    );
  }

  const expiringSoon = transactions.filter(t => 
    t.amount > 0 && 
    t.expiry_date && 
    new Date(t.expiry_date) > new Date() &&
    new Date(t.expiry_date) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Wing Credits</h1>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground flex flex-col gap-1">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <AlertCircle className="h-4 w-4 text-primary" />
          How Wing Credits Work
        </p>
        <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
          {walletSettings?.signup_bonus > 0 && (
            <li>New sign-ups receive <strong className="text-foreground">₹{Number(walletSettings.signup_bonus).toLocaleString()}</strong> Wing Credits.</li>
          )}
          {walletSettings?.referral_bonus > 0 && (
            <li>Earn <strong className="text-foreground">₹{Number(walletSettings.referral_bonus).toLocaleString()}</strong> for every successful referral.</li>
          )}
          {walletSettings?.max_redemption_percentage > 0 && (
            <li>You can use up to <strong className="text-foreground">{walletSettings.max_redemption_percentage}%</strong> of your booking value in credits per booking.</li>
          )}
          {walletSettings?.expiry_days > 0 && (
            <li>Credits automatically expire after <strong className="text-foreground">{walletSettings.expiry_days} days</strong>.</li>
          )}
        </ul>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{INR(wallet.balance)}</h2>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Lifetime Earned</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{INR(wallet.lifetime_earned)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <History className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Lifetime Redeemed</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{INR(wallet.lifetime_redeemed)}</h2>
          </CardContent>
        </Card>
      </div>

      {/* Transactions & Expiry */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon {expiringSoon.length > 0 && `(${expiringSoon.length})`}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
              ) : transactions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                          {getTransactionIcon(tx.type, tx.amount)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{getTransactionLabel(tx.type)}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{format(new Date(tx.created_at), 'MMM dd, yyyy h:mm a')}</span>
                            {tx.status === 'completed' ? (
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200">Completed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{tx.status}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                          {tx.amount > 0 ? '+' : ''}{INR(tx.amount)}
                        </p>
                        {tx.expiry_date && tx.amount > 0 && tx.status === 'completed' && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Exp. {format(new Date(tx.expiry_date), 'MMM dd')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {expiringSoon.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                  <p>No credits expiring in the next 15 days</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {expiringSoon.map((tx: any) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Credits from {getTransactionLabel(tx.type)}</p>
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            Expires on {format(new Date(tx.expiry_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-foreground">{INR(tx.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
