import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

export default function AssignedPackages() {
  const { uuid } = useParams();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubId, setHubId] = useState<string | null>(null);

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
        id, status,
        tour_packages(*)
      `)
      .eq('hub_id', hubData.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setAssignments(data);
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
                        <Button 
                          variant={ast.status === 'published' ? "outline" : "default"} 
                          size="sm"
                          onClick={() => togglePublish(ast.id, ast.status)}
                        >
                          {ast.status === 'published' ? 'Unpublish' : 'Publish'}
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
