import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHostProfile, useMyListingTypeRequests, useRequestListingType } from '@/hooks/useListings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Home, Building, Palmtree, Car, Bike, Compass, CheckCircle2, Clock, Lock, Send } from 'lucide-react';

const ALL_LISTING_TYPES = [
  { key: 'stays',       icon: Home,    label: 'Home Stays' },
  { key: 'hotels',      icon: Building, label: 'Hotels' },
  { key: 'resorts',     icon: Palmtree, label: 'Resorts' },
  { key: 'cars',        icon: Car,     label: 'Car Rentals' },
  { key: 'bikes',       icon: Bike,    label: 'Bike Rentals' },
  { key: 'experiences', icon: Compass, label: 'Packages/Experiences' },
] as const;

export function FeatureAccessSettings() {
  const { user } = useAuth();
  const { data: hostProfile } = useHostProfile(user?.id);
  const { data: typeRequests = [] } = useMyListingTypeRequests(user?.id);
  const requestMut = useRequestListingType();

  const [requestDialog, setRequestDialog] = useState<{ open: boolean; type: string | null }>({ open: false, type: null });

  const approvedTypes: string[] = hostProfile?.approved_listing_types || [];
  const hasRestriction = approvedTypes.length > 0;

  const getRequestStatus = (key: string) => typeRequests.find((r) => r.feature_name === key)?.status ?? null;

  const requestedTypeLabel = requestDialog.type
    ? ALL_LISTING_TYPES.find((t) => t.key === requestDialog.type)?.label ?? ''
    : '';

  const handleSendRequest = () => {
    if (!user || !requestDialog.type) return;
    requestMut.mutate(
      { hostId: user.id, type: requestDialog.type, note: '' },
      { onSuccess: () => {
          setRequestDialog({ open: false, type: null });
          import('sonner').then(module => module.toast.success('Request submitted! Admin will review it shortly.'));
        } 
      }
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
          <CardDescription>Manage your access to different booking modules on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_LISTING_TYPES.map((item) => {
              // If there are no restrictions, everything is enabled (legacy fallback)
              // Otherwise, explicitly check if the key is in approvedTypes
              const isEnabled = !hasRestriction || approvedTypes.includes(item.key);
              const reqStatus = getRequestStatus(item.key);

              return (
                <div key={item.key} className="flex flex-col p-4 border rounded-xl bg-card shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-muted rounded-lg">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-semibold">{item.label}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t">
                    {isEnabled ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                      </span>
                    ) : reqStatus === 'pending' ? (
                      <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" /> Pending Approval
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-medium">
                        <Lock className="w-3.5 h-3.5" /> Not Enabled
                      </span>
                    )}

                    {!isEnabled && reqStatus !== 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRequestDialog({ open: true, type: item.key })}
                      >
                        Request Access
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={requestDialog.open} onOpenChange={(open) => setRequestDialog({ open, type: open ? requestDialog.type : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Request Feature Access
            </DialogTitle>
            <DialogDescription>
              Do you want to send an access request for the <strong>{requestedTypeLabel}</strong> module to the Admin?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setRequestDialog({ open: false, type: null })}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={requestMut.isPending}
              onClick={handleSendRequest}
            >
              {requestMut.isPending ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
