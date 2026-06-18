import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TourPackage, PackageAssignment } from '@/types/tour-packages';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function PackageAssignments() {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<PackageAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [pkgs, hbs, asts] = await Promise.all([
      supabase.from('tour_packages').select('*').order('created_at', { ascending: false }),
      supabase.from('hubs').select('id, hub_name'),
      supabase.from('package_assignments').select(`
        id, package_id, hub_id, status, created_at, updated_at,
        tour_packages(name),
        hubs(hub_name)
      `)
    ]);

    if (pkgs.data) setPackages(pkgs.data as TourPackage[]);
    if (hbs.data) setHubs(hbs.data);
    if (asts.data) setAssignments(asts.data as any[]);
    
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedPackage || !selectedHub) {
      toast.error('Please select a package and a hub');
      return;
    }
    
    setAssigning(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('package_assignments').insert({
        package_id: selectedPackage,
        hub_id: selectedHub,
        status: 'assigned',
        assigned_by: userData.user?.id
      });
      
      if (error) {
        if (error.code === '23505') throw new Error('Package is already assigned to this Hub');
        throw error;
      }
      
      toast.success('Assigned successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign package');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Package Assignments</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Package to Hub</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Select Package</label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
              <SelectContent>
                {packages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Select Hub</label>
            <Select value={selectedHub} onValueChange={setSelectedHub}>
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
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Hub Partner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((ast: any) => (
                    <TableRow key={ast.id}>
                      <TableCell className="font-medium">{ast.tour_packages?.name}</TableCell>
                      <TableCell>{ast.hubs?.hub_name}</TableCell>
                      <TableCell className="capitalize">{ast.status}</TableCell>
                      <TableCell>{new Date(ast.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
