import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PackageBookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [step, setStep] = useState(1);
  const [travellerCount, setTravellerCount] = useState(1);
  const [travellers, setTravellers] = useState([{ name: '', age: '', gender: '' }]);
  const [paymentMode, setPaymentMode] = useState('full');
  
  useEffect(() => {
    fetchPackage();
  }, [id]);

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

  const handleTravellerCountChange = (val: string) => {
    const count = parseInt(val);
    setTravellerCount(count);
    const newT = [...travellers];
    while (newT.length < count) newT.push({ name: '', age: '', gender: '' });
    while (newT.length > count) newT.pop();
    setTravellers(newT);
  };

  const handleBookingSubmit = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login to continue');
        navigate('/auth');
        return;
      }

      const totalAmount = pkg.adult_price * travellerCount;
      const refId = `XP-PKG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Booking
      const { data: booking, error: bErr } = await supabase.from('package_bookings').insert({
        booking_ref: refId,
        package_id: id,
        user_id: userData.user.id,
        total_amount: paymentMode === 'partial' ? totalAmount / 2 : totalAmount,
        payment_status: paymentMode === 'partial' ? 'partial' : 'completed',
        booking_status: 'confirmed'
      }).select().single();

      if (bErr) throw bErr;

      // 2. Add Travellers
      const tData = travellers.map(t => ({
        booking_id: booking.id,
        name: t.name,
        age: parseInt(t.age),
        gender: t.gender
      }));

      const { error: tErr } = await supabase.from('package_travellers').insert(tData);
      if (tErr) throw tErr;

      // 3. Add Payment record
      await supabase.from('package_payments').insert({
        booking_id: booking.id,
        amount: booking.total_amount,
        payment_method: 'UPI',
        transaction_id: `TXN-${Math.floor(Math.random() * 1000000)}`
      });

      toast.success('Booking confirmed!');
      setStep(4);
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
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Step 1: Select Travellers</h2>
              <div className="space-y-2">
                <Label>Number of Travellers</Label>
                <Select value={travellerCount.toString()} onValueChange={handleTravellerCountChange}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} Traveller(s)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(2)} className="w-full">Continue to Traveller Details</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold">Step 2: Traveller Information</h2>
              {travellers.map((t, i) => (
                <div key={i} className="p-4 border border-border rounded-xl space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Traveller {i + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={t.name} onChange={e => updateTraveller(i, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input type="number" value={t.age} onChange={e => updateTraveller(i, 'age', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
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
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Continue to Payment</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Step 3: Payment</h2>
              <div className="p-4 border border-border rounded-xl space-y-2 bg-muted/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adult Price x {travellerCount}</span>
                  <span>₹{pkg.adult_price * travellerCount}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span>₹{pkg.adult_price * travellerCount}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Option</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue placeholder="Select Payment Option" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Pay Full Amount (₹{pkg.adult_price * travellerCount})</SelectItem>
                    <SelectItem value="partial">Pay 50% Advance (₹{(pkg.adult_price * travellerCount) / 2})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleBookingSubmit} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm & Pay
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
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
