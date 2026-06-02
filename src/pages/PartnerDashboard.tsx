import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeCanvas } from 'qrcode.react';
import { buildReferralLink } from '@/lib/referral';
import { format } from 'date-fns';
import {
  TrendingUp, Users, IndianRupee, Clock, Copy, Download,
  QrCode, CheckCircle2, AlertCircle, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicLogo } from '@/components/DynamicLogo';

interface HubPartner {
  id: string;
  business_name: string;
  partner_name: string;
  partner_phone: string;
  partner_email: string;
  city: string;
  state: string;
  hub_type: string;
  commission_rate: number;
  referral_id: string;
  referral_link: string;
  total_referrals: number;
  total_revenue: number;
  total_commission: number;
  is_active: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  booking_amount: number;
  commission_amount: number;
  commission_percentage: number;
  payment_status: string;
  created_at: string;
  bookings: { listing_type: string; start_date: string } | null;
}

const TYPE_LABEL: Record<string, string> = {
  franchise:   'Franchise',
  hub:         'Hub',
  collaborator:'Hub',
  restaurant:  'Chai Point / Restaurant',
  cab_driver:  'Cab Driver',
};

const STATUS_STYLE: Record<string, { bg: string; icon: typeof CheckCircle2; label: string }> = {
  completed: { bg: 'bg-green-100 text-green-700',  icon: CheckCircle2, label: 'Paid' },
  pending:   { bg: 'bg-amber-100 text-amber-700',  icon: Clock,        label: 'Pending' },
  refunded:  { bg: 'bg-red-100 text-red-700',      icon: AlertCircle,  label: 'Refunded' },
};

function downloadQR(referralId: string) {
  const canvas = document.getElementById(`partner-qr-${referralId}`) as HTMLCanvasElement | null;
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `QR-${referralId}.png`;
  a.click();
}

export default function PartnerDashboard() {
  const { referralId } = useParams<{ referralId: string }>();
  const [partner, setPartner] = useState<HubPartner | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const referralLink = partner
    ? (partner.referral_link || buildReferralLink(partner.referral_id))
    : '';

  useEffect(() => {
    if (!referralId) return;

    async function load() {
      setLoading(true);
      const code = referralId.toUpperCase();

      // Try referral_id first, then fall back to qr_tracking_id for older partners
      let hub: any = null;
      const { data: byReferralId } = await (supabase as any)
        .from('hub_partners')
        .select('*')
        .eq('referral_id', code)
        .maybeSingle();

      if (byReferralId) {
        hub = byReferralId;
      } else {
        const { data: byQrId } = await (supabase as any)
          .from('hub_partners')
          .select('*')
          .eq('qr_tracking_id', code)
          .maybeSingle();
        hub = byQrId;
      }

      if (!hub) { setNotFound(true); setLoading(false); return; }
      setPartner(hub);

      const { data: txns } = await (supabase as any)
        .from('referral_transactions')
        .select('id, booking_amount, commission_amount, commission_percentage, payment_status, created_at, bookings(listing_type, start_date)')
        .eq('partner_id', hub.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txns ?? []);
      setLoading(false);
    }

    load();
  }, [referralId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220]" />
      </div>
    );
  }

  if (notFound || !partner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <DynamicLogo lightHeightClass="h-10" className="mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Partner Not Found</h1>
        <p className="text-gray-500 text-center max-w-xs">
          The referral ID <span className="font-mono font-semibold">{referralId}</span> does not match any active partner.
        </p>
        <Link to="/" className="mt-6 text-sm text-[#013220] underline underline-offset-4">Go to Xplorwing</Link>
      </div>
    );
  }

  const totalEarned    = transactions.reduce((s, t) => s + Number(t.commission_amount ?? 0), 0);
  const pendingAmount  = transactions.filter(t => t.payment_status === 'pending').reduce((s, t) => s + Number(t.commission_amount ?? 0), 0);
  const paidAmount     = transactions.filter(t => t.payment_status === 'completed').reduce((s, t) => s + Number(t.commission_amount ?? 0), 0);
  const totalBookings  = transactions.length;

  const stats = [
    { label: 'Total Referrals', value: totalBookings, icon: Users,       color: 'text-blue-600 bg-blue-50',   suffix: '' },
    { label: 'Total Revenue',   value: Number(partner.total_revenue ?? 0).toFixed(0), icon: BarChart3, color: 'text-purple-600 bg-purple-50', prefix: '₹' },
    { label: 'Commission Earned', value: totalEarned.toFixed(0), icon: TrendingUp, color: 'text-green-700 bg-green-50', prefix: '₹' },
    { label: 'Pending Payout', value: pendingAmount.toFixed(0), icon: Clock,       color: 'text-amber-600 bg-amber-50', prefix: '₹' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-[#013220] text-white px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <DynamicLogo darkHeightClass="h-9" />
        </Link>
        <div className="text-right">
          <p className="text-xs text-white/60">Partner Portal</p>
          <p className="text-sm font-semibold">{partner.business_name}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Partner Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{partner.business_name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${partner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {partner.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{partner.partner_name} · {partner.city}{partner.state ? `, ${partner.state}` : ''}</p>
            <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABEL[partner.hub_type] ?? partner.hub_type} · {partner.commission_rate}% commission per booking</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Partner since {format(new Date(partner.created_at), 'MMM yyyy')}</p>
            <p className="font-mono text-xs mt-0.5 text-gray-400">{partner.referral_id}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {s.prefix ?? ''}{s.value}{s.suffix ?? ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
            <h2 className="text-base font-semibold text-gray-800 mb-4 self-start flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#013220]" /> Your QR Code
            </h2>
            <div className="p-4 bg-white rounded-xl border border-gray-200 mb-3">
              <QRCodeCanvas
                id={`partner-qr-${partner.referral_id}`}
                value={referralLink}
                size={200}
                bgColor="#ffffff"
                fgColor="#013220"
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs font-mono text-gray-400 mb-4">{partner.referral_id}</p>
            <p className="text-xs text-gray-500 text-center mb-4">
              Display this QR at your location. Every customer who scans it and books on Xplorwing earns you <span className="font-semibold text-[#013220]">{partner.commission_rate}% commission</span>.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => { downloadQR(partner.referral_id); toast.success('QR downloaded!'); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#013220] text-white text-sm font-medium rounded-xl hover:bg-[#013220]/90 transition"
              >
                <Download className="h-4 w-4" /> Download QR
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                <Copy className="h-4 w-4" /> Copy Link
              </button>
            </div>
          </div>

          {/* Commission breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-[#013220]" /> Commission Breakdown
            </h2>

            <div className="space-y-3 mb-6">
              {[
                { label: 'Total commission earned', value: totalEarned, color: 'text-gray-900' },
                { label: 'Paid out',                value: paidAmount,  color: 'text-green-600' },
                { label: 'Pending payment',         value: pendingAmount, color: 'text-amber-600' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className={`text-sm font-bold ${row.color}`}>₹{row.value.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#013220]/5 rounded-xl border border-[#013220]/10">
              <p className="text-xs text-[#013220] font-semibold mb-1">How it works</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                When a customer scans your QR code and completes a booking on Xplorwing, you earn <strong>{partner.commission_rate}%</strong> of the booking amount. Commissions are reviewed and paid out periodically by the Xplorwing team.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Booking History</h2>
            <p className="text-xs text-gray-400 mt-0.5">All bookings made through your referral link</p>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No bookings yet</p>
              <p className="text-xs text-gray-400 mt-1">Share your QR code to start earning commissions.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map(tx => {
                const st = STATUS_STYLE[tx.payment_status] ?? STATUS_STYLE['pending'];
                const Icon = st.icon;
                return (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#013220]/8 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-[#013220]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 capitalize">
                          {tx.bookings?.listing_type?.replace('_', ' ') ?? 'Booking'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(tx.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{Number(tx.booking_amount).toFixed(0)}</p>
                      <p className="text-xs text-green-600 font-medium">+₹{Number(tx.commission_amount).toFixed(2)} ({tx.commission_percentage}%)</p>
                    </div>

                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${st.bg}`}>
                      <Icon className="h-3 w-3" />{st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Questions about your commissions? Contact us at <a href="mailto:hello@xplorwing.com" className="underline">hello@xplorwing.com</a>
        </p>
      </main>
    </div>
  );
}
