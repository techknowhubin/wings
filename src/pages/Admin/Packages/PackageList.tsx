import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TourPackage } from '@/types/tour-packages';
import { Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

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
                      <TableCell className="capitalize">{pkg.status}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/experiences/assignments?packageId=${pkg.id}`}>Assign</Link>
                        </Button>
                      </TableCell>
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
