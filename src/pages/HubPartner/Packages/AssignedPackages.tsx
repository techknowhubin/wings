import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { HubPackageDetailsModal } from './components/HubPackageDetailsModal';
import { PackageBookingsSheet } from './components/PackageBookingsSheet';
import { TourPackage } from '@/types/tour-packages';

export default function AssignedPackages() {
  const { uuid } = useParams();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubId, setHubId] = useState<string | null>(null);

  const [selectedPkg, setSelectedPkg] = useState<TourPackage | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [bookingsAst, setBookingsAst] = useState<any>(null);

  useEffect(() => {
    fetchAssignments();
  }, [uuid]);

  const fetchAssignments = async () => {
    if (!uuid) return;
    
    // First get hub ID from UUID
    const { data: hubData } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
    if (!hubData) {
      setLoading(false);
      return;
    }
    
    setHubId(hubData.id);
    
    const { data, error } = await supabase
      .from('package_assignments')
      .select(`
        id, status, created_at,
        tour_packages(
          *,
          package_gallery(*),
          package_itineraries(*),
          package_itinerary_days(*)
        )
      `)
      .eq('hub_id', hubData.id)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setAssignments(data);
      // update selected assignment if open
      if (selectedAssignment) {
        const updated = data.find(a => a.id === selectedAssignment.id);
        if (updated) setSelectedAssignment(updated);
      }
    }
    setLoading(false);
  };

  const togglePublish = async (assignmentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'unpublished' : 'published';
    
    const { error } = await supabase
      .from('package_assignments')
      .update({ status: newStatus })
      .eq('id', assignmentId);
      
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Package ${newStatus} successfully`);
      fetchAssignments();
    }
  };

  const openDetails = (ast: any) => {
    setSelectedPkg(ast.tour_packages);
    setSelectedAssignment(ast);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Assigned Experiences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Price (Adult)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No packages assigned to your Hub yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((ast) => (
                    <TableRow key={ast.id}>
                      <TableCell className="font-medium">{ast.tour_packages?.name}</TableCell>
                      <TableCell>{ast.tour_packages?.destination}</TableCell>
                      <TableCell>₹{ast.tour_packages?.adult_price}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ast.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {ast.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(ast)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingsAst(ast)}
                          >
                            Bookings
                          </Button>
                          <Button
                            variant={ast.status === 'published' ? "outline" : "default"}
                            size="sm"
                            onClick={() => togglePublish(ast.id, ast.status)}
                          >
                            {ast.status === 'published' ? 'Unpublish' : 'Publish'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <HubPackageDetailsModal
        pkg={selectedPkg}
        assignment={selectedAssignment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTogglePublish={togglePublish}
      />

      <PackageBookingsSheet
        open={!!bookingsAst}
        onClose={() => setBookingsAst(null)}
        packageId={bookingsAst?.tour_packages?.id ?? null}
        packageName={bookingsAst?.tour_packages?.name ?? ''}
        hubId={hubId ?? ''}
      />
    </div>
  );
}
