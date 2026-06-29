import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ShieldCheck, XCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

type FeatureRequest = {
  id: string;
  host_id: string;
  feature_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  host_note: string | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

export default function AdminFeatureRequests() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error: queryError } = useQuery({
    queryKey: ['admin', 'feature_access_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_access_requests')
        .select(`
          id,
          host_id,
          feature_name,
          status,
          requested_at,
          host_note,
          profiles!feature_access_requests_host_id_fkey (
            full_name,
            phone
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FeatureRequest[];
    },
  });

  const updateRequestMut = useMutation({
    mutationFn: async ({ id, status, host_id, feature_name }: { id: string; status: 'approved' | 'rejected'; host_id: string; feature_name: string }) => {
      // Update request status
      const { error: updateError } = await supabase
        .from('feature_access_requests')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // If approved, update host's approved_listing_types
      if (status === 'approved') {
        const { data: profileData, error: profileError } = await supabase
          .from('host_profiles')
          .select('approved_listing_types')
          .eq('id', host_id)
          .single();

        if (!profileError) {
          const currentTypes = profileData.approved_listing_types || [];
          if (!currentTypes.includes(feature_name)) {
            await supabase
              .from('host_profiles')
              .update({ approved_listing_types: [...currentTypes, feature_name] })
              .eq('id', host_id);
          }
        }
      }
      
      // Attempt to send a notification (ignore if it fails)
      await supabase.from('notifications').insert({
        user_id: host_id,
        title: `Feature Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your request to access the ${feature_name} module has been ${status}.`,
        type: 'system'
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature_access_requests'] });
      toast.success(`Request ${variables.status} successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update request');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading requests...</div>;
  }

  if (queryError) {
    return <div className="p-8 text-center text-red-500">Error loading requests: {queryError.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Access Requests</h1>
        <p className="text-muted-foreground mt-1">Manage host requests to unlock modules like Resorts, Hotels, etc.</p>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Host Details</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{req.profiles?.full_name || 'Unknown Host'}</div>
                  <div className="text-xs text-muted-foreground">{req.profiles?.phone || 'No phone'}</div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold capitalize px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    {req.feature_name}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(req.requested_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate" title={req.host_note || ''}>
                  {req.host_note || <span className="text-muted-foreground italic">None</span>}
                </TableCell>
                <TableCell>
                  {req.status === 'pending' && (
                    <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                      <XCircle className="w-3.5 h-3.5" /> Rejected
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {req.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => updateRequestMut.mutate({ id: req.id, status: 'approved', host_id: req.host_id, feature_name: req.feature_name })}
                        disabled={updateRequestMut.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => updateRequestMut.mutate({ id: req.id, status: 'rejected', host_id: req.host_id, feature_name: req.feature_name })}
                        disabled={updateRequestMut.isPending}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!requests || requests.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No feature access requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
