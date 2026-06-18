import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PackageBookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [travellers, setTravellers] = useState<{ name: string; age: string; gender: string; email?: string; mobile?: string }[]>([]);

  const selectedPackages = location.state?.selectedPackages || [];
  const totalTravellers = location.state?.totalTravellers || 1;
  const grandTotal = location.state?.grandTotal || 0;

  const [walletBalance, setWalletBalance] = useState(0);
  const [maxRedemptionPercentage, setMaxRedemptionPercentage] = useState(10);
  const [useWingCredits, setUseWingCredits] = useState(false);

  const bookingFee = grandTotal * 0.20;
  const maxRedeemableCredits = Math.min((grandTotal * maxRedemptionPercentage) / 100, walletBalance);
  const wingCreditsDiscountAmount = useWingCredits ? maxRedeemableCredits : 0;
  const finalPayable = Math.max(bookingFee - wingCreditsDiscountAmount, 0);

  useEffect(() => {
    if (!location.state) {
      navigate(`/experiences/${id}`);
      return;
    }
    
    fetchPackage();
    fetchWallet();
    
    // Initialize exactly the right number of traveller forms
    setTravellers(Array.from({ length: totalTravellers }, (_, i) => 
      i === 0 
        ? { name: '', age: '', gender: '', email: '', mobile: '' } 
        : { name: '', age: '', gender: '' }
    ));
  }, [id, location.state]);

  const fetchWallet = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const [walletRes, settingsRes] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', userData.user.id).maybeSingle(),
      supabase.from('wallet_settings').select('max_redemption_percentage').maybeSingle()
    ]);
    if (walletRes.data) setWalletBalance(Number(walletRes.data.balance || 0));
    if (settingsRes.data) setMaxRedemptionPercentage(Number(settingsRes.data.max_redemption_percentage || 10));
  };

  const fetchPackage = async () => {
    if (!id) return;
    const { data } = await supabase.from('tour_packages').select('*').eq('id', id).single();
    setPkg(data);
    setLoading(false);
  };

  const updateTraveller = (index: number, field: string, value: string) => {
    const newT = [...travellers];
    newT[index] = { ...newT[index], [field]: value };
    setTravellers(newT);
  };

  const handleBookingSubmit = async () => {
    // Validate that every form is filled out
    for (let i = 0; i < travellers.length; i++) {
      if (!travellers[i].name || !travellers[i].age || !travellers[i].gender) {
        toast.error(`Please complete all fields for Traveller ${i + 1}`);
        return;
      }
      if (i === 0 && (!travellers[i].email || !travellers[i].mobile)) {
        toast.error(`Please provide email and mobile number for Traveller 1`);
        return;
      }
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login to continue');
        navigate('/auth');
        return;
      }

      const refId = `XP-PKG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Booking
      const { data: booking, error: bErr } = await supabase.from('package_bookings').insert({
        booking_ref: refId,
        package_id: id,
        user_id: userData.user.id,
        total_amount: grandTotal,
        payment_status: 'partial',
        booking_status: 'confirmed'
      }).select().single();

      if (bErr) throw bErr;

      if (wingCreditsDiscountAmount > 0) {
        const { error: wErr } = await supabase.from('wallets').update({ balance: walletBalance - wingCreditsDiscountAmount }).eq('user_id', userData.user.id);
        if (!wErr) {
          await supabase.from('wallet_transactions').insert({
            user_id: userData.user.id,
            amount: -wingCreditsDiscountAmount,
            type: 'booking_redemption',
            description: `Used for package booking ${refId}`
          });
        }
      }

      // 2. Add Travellers
      const tData = travellers.map(t => ({
        booking_id: booking.id,
        name: t.name,
        age: parseInt(t.age),
        gender: t.gender,
        email: t.email || null,
        mobile: t.mobile || null
      }));

      const { error: tErr } = await supabase.from('package_travellers').insert(tData);
      if (tErr) throw tErr;

      // 3. Add Payment record
      await supabase.from('package_payments').insert({
        booking_id: booking.id,
        amount: finalPayable,
        payment_method: 'UPI',
        transaction_id: `TXN-${Math.floor(Math.random() * 1000000)}`
      });

      toast.success('Booking confirmed!');
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete booking');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !pkg) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-3xl flex-1">
        <h1 className="text-3xl font-bold mb-8">Book: {pkg?.name}</h1>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          {step === 1 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold">Step 1: Traveller Information</h2>
              {travellers.map((t, i) => (
                <div key={i} className="p-4 border border-border rounded-xl space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    {i === 0 ? 'Traveller 1 (Primary Contact)' : `Traveller ${i + 1}`}
                  </h3>
                  
                  {i === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                      <div className="space-y-2">
                        <Label>Email Address <span className="text-red-500">*</span></Label>
                        <Input type="email" value={t.email || ''} onChange={e => updateTraveller(i, 'email', e.target.value)} placeholder="Enter email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Number <span className="text-red-500">*</span></Label>
                        <Input type="tel" value={t.mobile || ''} onChange={e => updateTraveller(i, 'mobile', e.target.value)} placeholder="Enter mobile number" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name <span className="text-red-500">*</span></Label>
                      <Input value={t.name} onChange={e => updateTraveller(i, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Age <span className="text-red-500">*</span></Label>
                      <Input type="number" value={t.age} onChange={e => updateTraveller(i, 'age', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender <span className="text-red-500">*</span></Label>
                      <Select value={t.gender} onValueChange={v => updateTraveller(i, 'gender', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate(`/experiences/${id}`)}>Back to Package</Button>
                <Button onClick={() => setStep(2)} className="flex-1">Continue to Payment</Button>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold text-foreground">Checkout Summary</h2>
               
               {/* Wing Credits Block */}
               {walletBalance > 0 && (
                 <div className="bg-[#fcfdf7] border border-[#e8eed2] rounded-xl p-4 flex items-start justify-between">
                   <div className="flex items-start gap-3">
                     <Wallet className="h-5 w-5 text-[#c1d06e] mt-0.5" />
                     <div>
                       <p className="font-bold text-[#0c3b2e] text-lg mb-1">Wing Credits</p>
                       <p className="text-sm text-[#4a6b5d] mb-0.5">Available: ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                       <p className="text-sm text-[#4a6b5d]">You can use up to ₹{maxRedeemableCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })} for this booking.</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="use-wing-credits"
                       checked={useWingCredits}
                       onChange={(e) => setUseWingCredits(e.target.checked)}
                       className="h-4 w-4 rounded border-gray-300 text-[#0c3b2e] focus:ring-[#0c3b2e]"
                     />
                     <Label htmlFor="use-wing-credits" className="text-sm font-bold text-[#0c3b2e] cursor-pointer">
                       Apply
                     </Label>
                   </div>
                 </div>
               )}

               {/* Receipt Block */}
               <div className="bg-white p-4 border-b border-t border-gray-100 space-y-3">
                 <div className="flex justify-between text-[#4a6b5d]">
                   <span>Item total</span>
                   <span className="font-semibold text-foreground">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div className="flex justify-between text-[#4a6b5d]">
                   <span>Service fee</span>
                   <span className="font-semibold text-foreground">₹0.00</span>
                 </div>
                 
                 <div className="border-t border-dashed border-gray-300 my-2" />
                 
                 <div className="flex justify-between text-[#4a6b5d]">
                   <span>Booking Fee (20%)</span>
                   <span className="font-semibold text-foreground">₹{bookingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>

                 {useWingCredits && wingCreditsDiscountAmount > 0 && (
                   <div className="flex justify-between text-[#115f10]">
                     <span>Wing Credits Used</span>
                     <span className="font-semibold">-₹{wingCreditsDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                   </div>
                 )}

                 <div className="border-t border-gray-200 my-2" />

                 <div className="flex justify-between items-center text-[#0c3b2e] pt-2">
                   <div className="flex items-center gap-2">
                     <span className="bg-[#0c3b2e] text-white rounded p-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                     </span>
                     <span className="font-bold">Total payable (20% Booking Fee)</span>
                   </div>
                   <span className="text-2xl font-bold">₹{finalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>

               <div className="pt-4">
                 <Button onClick={handleBookingSubmit} disabled={loading} className="w-full h-14 text-lg font-bold bg-[#c1d06e] hover:bg-[#a8b85b] text-[#0c3b2e] rounded-xl shadow-md">
                   {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                   Confirm Booking
                 </Button>
               </div>
             </div>
          )}

          {step === 3 && (
            <div className="text-center py-12 space-y-6">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Your booking for {pkg?.name} has been confirmed. You can view your itinerary and upload required documents in your dashboard.
              </p>
              <Button onClick={() => navigate('/profile')} className="mt-8">Go to Dashboard</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
