import { useState } from 'react';
import { useAdminProviders } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Store } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminProviders() {
  const [search, setSearch] = useState('');
  const { data: providers, isLoading } = useAdminProviders(search);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Providers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all service providers on the platform.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No providers found.</TableCell></TableRow>
                )}
                {(providers ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#013220]/10 text-[#013220] flex items-center justify-center font-bold text-sm shrink-0">
                          {p.full_name?.[0]?.toUpperCase() ?? <Store className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{p.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{p.phone ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.phone ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
