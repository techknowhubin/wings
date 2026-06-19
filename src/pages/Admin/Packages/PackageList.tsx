import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TourPackage } from '@/types/tour-packages';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PackageList() {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data, error } = await supabase.from('tour_packages').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPackages(data as TourPackage[]);
    }
    setLoading(false);
  };

  const [packageToRemove, setPackageToRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [isCheckingBookings, setIsCheckingBookings] = useState(false);

  const handleInitiateDelete = async (pkgId: string) => {
    setPackageToRemove(pkgId);
    setIsCheckingBookings(true);
    setBookingCount(null);
    try {
      const { count, error } = await supabase
        .from('package_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', pkgId);
      
      if (error) throw error;
      setBookingCount(count || 0);
    } catch (err: any) {
      toast.error('Failed to check bookings: ' + err.message);
      setBookingCount(0); // fallback
    } finally {
      setIsCheckingBookings(false);
    }
  };

  const handleArchivePackage = async () => {
    if (!packageToRemove) return;
    setRemoving(true);
    try {
      const { error } = await supabase.from('tour_packages').update({ status: 'archived' }).eq('id', packageToRemove);
      if (error) throw error;
      
      toast.success('Package archived successfully');
      setPackages(packages.map(p => p.id === packageToRemove ? { ...p, status: 'archived' } : p));
      setPackageToRemove(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive package');
    } finally {
      setRemoving(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!packageToRemove) return;
    setRemoving(true);
    try {
      const { error } = await supabase.from('tour_packages').delete().eq('id', packageToRemove);
      if (error) throw error;
      
      toast.success('Package deleted successfully');
      setPackages(packages.filter(p => p.id !== packageToRemove));
      setPackageToRemove(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete package');
    } finally {
      setRemoving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'assigned': 'bg-blue-100 text-blue-800 border-blue-200',
      'published': 'bg-purple-100 text-purple-800 border-purple-200',
      'booking open': 'bg-green-100 text-green-800 border-green-200',
      'sold out': 'bg-red-100 text-red-800 border-red-200',
      'completed': 'bg-teal-100 text-teal-800 border-teal-200',
      'archived': 'bg-gray-200 text-gray-700 border-gray-300',
      'inactive': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    const style = statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All Experiences</h1>
        <Button asChild>
          <Link to="/admin/experiences/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Link>
        </Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No packages created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.destination}</TableCell>
                      <TableCell>{pkg.start_date} to {pkg.end_date}</TableCell>
                      <TableCell>{pkg.duration}</TableCell>
                      <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/experiences/assignments?packageId=${pkg.id}`}>Assign</Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/experiences/edit/${pkg.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleInitiateDelete(pkg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!packageToRemove} onOpenChange={(open) => !open && setPackageToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCheckingBookings ? 'Checking Package Status...' : (bookingCount && bookingCount > 0) ? 'Cannot Delete Package' : 'Delete Package?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingBookings ? (
                 <div className="flex items-center gap-2 mt-2">
                   <Loader2 className="h-4 w-4 animate-spin" /> Checking for existing bookings...
                 </div>
              ) : (bookingCount && bookingCount > 0) ? (
                 `This package cannot be deleted because it has ${bookingCount} existing bookings associated with it. You may archive the package instead to hide it from users while preserving booking records.`
              ) : (
                 'Are you sure you want to delete this package? This action cannot be undone and will remove it permanently from the system.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing || isCheckingBookings}>Cancel</AlertDialogCancel>
            {!isCheckingBookings && (bookingCount && bookingCount > 0) ? (
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleArchivePackage();
                }} 
                disabled={removing} 
                className="bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500"
              >
                {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Archive Package
              </AlertDialogAction>
            ) : !isCheckingBookings ? (
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleDeletePackage();
                }} 
                disabled={removing} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
