import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, MessageCircle, ArrowUpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Since there is no support_tickets table defined yet in the schema, we use dummy data for UI scaffolding
const DUMMY_TICKETS = [
  { id: "TKT-001", user: "Rajesh Kumar", issue: "Booking cancellation refund not received", priority: "High", status: "Open", date: "2026-06-12" },
  { id: "TKT-002", user: "Sneha Reddy", issue: "Driver partner onboarding stuck", priority: "Critical", status: "Escalated", date: "2026-06-11" },
  { id: "TKT-003", user: "Amit Singh", issue: "App crashing on map screen", priority: "Medium", status: "Closed", date: "2026-06-10" },
  { id: "TKT-004", user: "Priya M", issue: "Host payout delayed", priority: "High", status: "Open", date: "2026-06-12" },
];

export default function HubSupport() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTickets = DUMMY_TICKETS.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.issue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support Center</h2>
        <p className="text-muted-foreground">Manage and resolve issues for users and partners in {profile?.assigned_state}.</p>
      </div>

      <div className="flex bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by Ticket ID, User, or Issue..." 
            className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>User / Reporter</TableHead>
              <TableHead>Issue Summary</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium font-mono text-xs">{ticket.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{ticket.user}</div>
                    <div className="text-xs text-muted-foreground">{ticket.date}</div>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate" title={ticket.issue}>{ticket.issue}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {ticket.priority === 'Critical' && <AlertCircle className="w-3 h-3 text-red-500 mr-1" />}
                      <span className={`text-xs font-semibold ${
                        ticket.priority === 'Critical' ? 'text-red-600' :
                        ticket.priority === 'High' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.status === 'Open' ? 'default' : ticket.status === 'Escalated' ? 'destructive' : 'secondary'}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <MessageCircle className="w-4 h-4 mr-1" /> Reply
                    </Button>
                    <Button size="sm" variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                      <ArrowUpCircle className="w-4 h-4 mr-1" /> Escalate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
