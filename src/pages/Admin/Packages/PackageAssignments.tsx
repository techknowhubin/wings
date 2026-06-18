import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TourPackage } from '@/types/tour-packages';
import { Loader2, MapPin, Calendar, Users, IndianRupee, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function PackageAssignments() {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedHubId, setSelectedHubId] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [assignedHubs, setAssignedHubs] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPackageId) {
      fetchPackageDetails(selectedPackageId);
    } else {
      setPackageDetails(null);
      setAssignedHubs([]);
    }
  }, [selectedPackageId]);

  const fetchInitialData = async () => {
    const [pkgs, hbs] = await Promise.all([
      supabase.from('tour_packages').select('*').order('created_at', { ascending: false }),
      supabase.from('hubs').select(`
        id, hub_name, owner_name, email, mobile
      `)
    ]);

    if (pkgs.data) setPackages(pkgs.data as TourPackage[]);
    if (hbs.data) setHubs(hbs.data);
    
    setLoading(false);
  };

  const fetchPackageDetails = async (pkgId: string) => {
    // Fetch package info
    const { data: pkgData } = await supabase.from('tour_packages').select('*').eq('id', pkgId).single();
    if (pkgData) setPackageDetails(pkgData);

    // Fetch assigned hubs
    const { data: astsData } = await supabase.from('package_assignments').select(`
      id, status, created_at,
      hubs (
        id, hub_name, owner_name, email, mobile
      )
    `).eq('package_id', pkgId);
    
    if (astsData) setAssignedHubs(astsData);
  };

  const handleAssign = async () => {
    if (!selectedPackageId || !selectedHubId) {
      toast.error('Please select a package and a hub');
      return;
    }
    
    setAssigning(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('package_assignments').insert({
        package_id: selectedPackageId,
        hub_id: selectedHubId,
        status: 'assigned',
        assigned_by: userData.user?.id
      });
      
      if (error) {
        if (error.code === '23505') throw new Error('Package is already assigned to this Hub');
        throw error;
      }
      
      toast.success('Assigned successfully');
      setSelectedHubId(''); // reset hub selection
      fetchPackageDetails(selectedPackageId); // refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign package');
    } finally {
      setAssigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'assigned': 'bg-blue-100 text-blue-800 border-blue-200',
      'published': 'bg-purple-100 text-purple-800 border-purple-200',
      'booking open': 'bg-green-100 text-green-800 border-green-200',
      'sold out': 'bg-red-100 text-red-800 border-red-200',
      'completed': 'bg-teal-100 text-teal-800 border-teal-200'
    };
    
    const style = statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Package Assignments</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Package</CardTitle>
          <CardDescription>Choose a package to view its details and manage hub assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
              <SelectContent>
                {packages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {packageDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Information Card */}
          <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
            <div className="h-48 w-full relative">
              <img 
                src={packageDetails.cover_image || 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=800'} 
                alt={packageDetails.name} 
                className="w-full h-full object-cover rounded-t-xl"
              />
              <div className="absolute top-4 right-4">
                {getStatusBadge(packageDetails.status)}
              </div>
            </div>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">{packageDetails.name}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Destination: {packageDetails.destination}</p>
                    <p>Departure: {packageDetails.departure_city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-foreground">{packageDetails.duration}</span>
                </div>
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p><span className="font-medium text-foreground">Start:</span> {new Date(packageDetails.start_date).toLocaleDateString()}</p>
                    <p><span className="font-medium text-foreground">End:</span> {new Date(packageDetails.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <IndianRupee className="h-4 w-4 shrink-0" />
                  <div>
                    <p><span className="font-medium text-foreground">Adult:</span> ₹{packageDetails.adult_price}</p>
                    {packageDetails.child_price && <p><span className="font-medium text-foreground">Child:</span> ₹{packageDetails.child_price}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <div>
                    <p><span className="font-medium text-foreground">Capacity:</span> {packageDetails.max_capacity} Seats</p>
                    <p><span className="font-medium text-green-600">Available:</span> {packageDetails.max_capacity} Seats</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Hubs Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assign to Hub</CardTitle>
                <CardDescription>Assign this package to a new Hub Partner</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Select Hub</label>
                  <Select value={selectedHubId} onValueChange={setSelectedHubId}>
                    <SelectTrigger><SelectValue placeholder="Select a hub..." /></SelectTrigger>
                    <SelectContent>
                      {hubs.map(hub => (
                        <SelectItem key={hub.id} value={hub.id}>{hub.hub_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssign} disabled={assigning}>
                  {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign Package
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Hubs ({assignedHubs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hub Partner</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Assignment Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedHubs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Not assigned to any hubs yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignedHubs.map((ast: any) => {
                          return (
                            <TableRow key={ast.id}>
                              <TableCell>
                                <p className="font-medium">{ast.hubs?.hub_name}</p>
                                <p className="text-xs text-muted-foreground">{ast.hubs?.owner_name}</p>
                              </TableCell>
                              <TableCell className="text-sm">
                                <p>{ast.hubs?.mobile || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{ast.hubs?.email || 'N/A'}</p>
                              </TableCell>
                              <TableCell className="text-sm">{new Date(ast.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{getStatusBadge(ast.status)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
