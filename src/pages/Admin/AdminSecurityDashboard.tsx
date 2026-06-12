import { useState } from 'react';
import { Shield, Users, Lock, Activity, Ban, RefreshCw, ChevronDown,
         UserCheck, UserX, Key, Search, AlertTriangle, CheckCircle, Clock, Copy, Check, Info } from 'lucide-react';
import { Button }          from '@/components/ui/button';
import { Input }           from '@/components/ui/input';
import { Badge }           from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { safeDecrypt } from '@/lib/crypto';
import {
  useAdminUsers,
  useAuditLogs,
  useRateLimitBlocks,
  useChangeUserRole,
  useSuspendUser,
  useBanUser,
  useReactivateUser,
  useRevokeUserSessions,
  useAssignAdmin,
  useRemoveAdmin,
  useDeleteUser,
  useUnblockRateLimit,
  type AppRole,
  type AdminUser,
} from '@/hooks/useAdminSecurity';
import { useAuth } from '@/hooks/useAuth';

const ROLE_LABELS: Record<AppRole, string> = {
  user:           'Traveller',
  host:           'Host',
  admin:          'Super Admin',
  moderator:      'Moderator',
  hub_partner:    'Hub Partner',
  driver_partner: 'Driver Partner',
};

const ROLE_COLORS: Record<AppRole, string> = {
  user:           'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  host:           'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin:          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  moderator:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  hub_partner:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  driver_partner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  banned:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function formatDevice(userAgent: string | null | undefined) {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('linux')) return 'Linux';
  return 'Desktop';
}

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 group font-mono text-xs">
      <span className="text-muted-foreground">{text.slice(0, 8)}...</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100 text-muted-foreground hover:text-foreground"
        title="Copy full ID"
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

// ─── Decrypted display cell ───────────────────────────────────
function EncryptedCell({ value }: { value: string | null }) {
  const [plain, setPlain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // No value at all
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;

  // If value is NOT encrypted (no gcm_ prefix), display as-is (legacy plaintext)
  const isEncrypted = value.startsWith('gcm_');
  if (!isEncrypted) return <span className="font-mono text-xs">{value}</span>;

  // Already decrypted
  if (plain) return <span className="font-mono text-xs">{plain}</span>;

  const reveal = async () => {
    setLoading(true);
    const dec = await safeDecrypt(value);
    setPlain(dec);
    setLoading(false);
  };

  return (
    <button
      onClick={reveal}
      disabled={loading}
      className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800"
    >
      {loading ? '…' : '🔒 reveal'}
    </button>
  );
}

// ─── Action modal ─────────────────────────────────────────────
interface ActionModalProps {
  user: AdminUser | null;
  action: 'role' | 'suspend' | 'ban' | 'revoke' | 'delete' | 'assign_admin' | 'remove_admin' | null;
  onClose: () => void;
}

function ActionModal({ user, action, onClose }: ActionModalProps) {
  const [reason, setReason]  = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');

  const changeRole     = useChangeUserRole();
  const suspendUser    = useSuspendUser();
  const banUser        = useBanUser();
  const revokeSessions = useRevokeUserSessions();
  const deleteUser     = useDeleteUser();
  const assignAdmin    = useAssignAdmin();
  const removeAdmin    = useRemoveAdmin();

  if (!user || !action) return null;

  const handleSubmit = async () => {
    if (action === 'role') {
      await changeRole.mutateAsync({ userId: user.id, newRole, reason });
    } else if (action === 'suspend') {
      await suspendUser.mutateAsync({ userId: user.id, reason });
    } else if (action === 'ban') {
      await banUser.mutateAsync({ userId: user.id, reason });
    } else if (action === 'revoke') {
      await revokeSessions.mutateAsync({ userId: user.id, reason });
    } else if (action === 'delete') {
      await deleteUser.mutateAsync({ userId: user.id, reason });
    } else if (action === 'assign_admin') {
      await assignAdmin.mutateAsync(user.id);
    } else if (action === 'remove_admin') {
      await removeAdmin.mutateAsync(user.id);
    }
    onClose();
  };

  const titles = {
    role:    `Change Role — ${user.full_name ?? user.id}`,
    suspend: `Suspend User — ${user.full_name ?? user.id}`,
    ban:     `Ban User — ${user.full_name ?? user.id}`,
    revoke:  `Revoke Sessions — ${user.full_name ?? user.id}`,
    delete:  `Delete User — ${user.full_name ?? user.id}`,
    assign_admin: `Grant Admin Access — ${user.full_name ?? user.id}`,
    remove_admin: `Revoke Admin Access — ${user.full_name ?? user.id}`,
  };

  const isPending =
    changeRole.isPending || 
    suspendUser.isPending || 
    banUser.isPending || 
    revokeSessions.isPending || 
    deleteUser.isPending ||
    assignAdmin.isPending ||
    removeAdmin.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {action === 'role' && (
            <div className="space-y-3">
              <p className="text-yellow-600 bg-yellow-50 p-2.5 rounded-lg text-xs font-medium border border-yellow-100">
                Are you sure you want to change this user's role? This will alter their permissions on the platform.
              </p>
              <label className="text-xs font-semibold text-muted-foreground">Select New Role</label>
              <Select
                value={newRole}
                onValueChange={v => setNewRole(v as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [AppRole, string][])
                    .filter(([k]) => k !== 'moderator')
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'assign_admin' && (
            <p className="text-red-600 bg-red-50 p-2.5 rounded-lg text-xs font-medium border border-red-100">
              WARNING: Are you sure you want to grant Super Admin access to this user? They will have full access to all admin tools and security settings.
            </p>
          )}

          {action === 'remove_admin' && (
            <p className="text-yellow-600 bg-yellow-50 p-2.5 rounded-lg text-xs font-medium border border-yellow-100">
              Are you sure you want to revoke Super Admin access from this user?
            </p>
          )}

          {action === 'delete' && (
            <div className="space-y-2">
              <p className="text-red-600 bg-red-50 p-3 rounded-lg text-xs font-bold border border-red-100 flex flex-col gap-1">
                <span>⚠️ CRITICAL WARNING:</span>
                <span>This action cannot be undone. This will permanently delete the user's account, profiles, listings, bookings, and files.</span>
              </p>
            </div>
          )}

          {action === 'suspend' && (
            <p className="text-yellow-600 bg-yellow-50 p-2.5 rounded-lg text-xs font-medium border border-yellow-100">
              User will be suspended and logged out immediately.
            </p>
          )}

          {action === 'ban' && (
            <p className="text-red-600 bg-red-50 p-2.5 rounded-lg text-xs font-medium border border-red-100">
              User will be permanently banned and logged out.
            </p>
          )}

          {action === 'revoke' && (
            <p className="text-muted-foreground bg-slate-50 p-2.5 rounded-lg text-xs font-medium border border-slate-100">
              All active sessions will be invalidated.
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Reason for action (required)</label>
            <Textarea
              placeholder="Provide a reason..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant={['delete', 'ban', 'assign_admin'].includes(action) ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Processing…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users table ─────────────────────────────────────────────
function UsersTable() {
  const [search, setSearch]            = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [roleTab, setRoleTab]           = useState<'all' | 'hosts' | 'travellers'>('all');
  const [roleFilter, setRoleFilter]     = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy]             = useState<string>('newest');

  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeAction, setActiveAction] = useState<ActionModalProps['action']>(null);

  const { user: currentUser }           = useAuth();
  const { data: users, isLoading }      = useAdminUsers(debouncedSearch || undefined);
  const reactivate                      = useReactivateUser();

  const handleTabChange = (val: 'all' | 'hosts' | 'travellers') => {
    setRoleTab(val);
    setCurrentPage(1);
  };

  const openAction = (u: AdminUser, a: typeof activeAction) => {
    setSelectedUser(u);
    setActiveAction(a);
  };

  // Filter & Sort logic
  const filteredUsers = (users ?? [])
    .filter(u => {
      // Sub-tabs filter
      if (roleTab === 'hosts' && u.role !== 'host') return false;
      if (roleTab === 'travellers' && u.role !== 'user') return false;

      // Dropdown role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'user' && u.role !== 'user') return false;
        if (roleFilter === 'host' && u.role !== 'host') return false;
        if (roleFilter === 'admin' && u.role !== 'admin') return false;
        if (roleFilter === 'other' && ['user', 'host', 'admin'].includes(u.role)) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && u.account_status !== statusFilter) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'last_active') {
        const tA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const tB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return tB - tA;
      }
      return 0;
    });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Sub-tabs & Search & Filters Bar */}
      <div className="bg-card p-4 rounded-xl border space-y-4 shadow-sm">
        {/* Sub-tabs buttons */}
        <div className="flex gap-1.5 border-b pb-3">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => handleTabChange('hosts')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleTab === 'hosts'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Hosts
          </button>
          <button
            onClick={() => handleTabChange('travellers')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleTab === 'travellers'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Travellers
          </button>
        </div>

        {/* Inputs bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs rounded-lg"
              placeholder="Search by name or Wing ID…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setTimeout(() => setDebounced(e.target.value), 400);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs rounded-lg">
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Traveller</SelectItem>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="admin">Super Admin</SelectItem>
                <SelectItem value="other">Other Roles</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Joined</SelectItem>
                <SelectItem value="oldest">Oldest Joined</SelectItem>
                <SelectItem value="last_active">Last Active</SelectItem>
              </SelectContent>
            </Select>

            {(roleFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'newest') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setSortBy('newest');
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-semibold px-2.5"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading users…</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Name / Wing ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">User ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">KYC</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Joined</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Last Login</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{u.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{u.wing_id ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <CopyableText text={u.id} />
                    </td>
                    <td className="px-4 py-3"><EncryptedCell value={u.email_encrypted} /></td>
                    <td className="px-4 py-3"><EncryptedCell value={u.phone_encrypted} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                        u.kyc_status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.account_status] ?? ''}`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {u.last_sign_in_at ? (
                        new Date(u.last_sign_in_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {u.id !== currentUser?.id && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium"
                              onClick={() => openAction(u, 'role')}>
                              Role
                            </Button>
                            {u.role !== 'admin' ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => openAction(u, 'assign_admin')}>
                                +Admin
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                onClick={() => openAction(u, 'remove_admin')}>
                                -Admin
                              </Button>
                            )}
                            {u.account_status === 'active' ? (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-200"
                                  onClick={() => openAction(u, 'suspend')}>
                                  Suspend
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                  onClick={() => openAction(u, 'ban')}>
                                  Ban
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                onClick={() => reactivate.mutate(u.id)}>
                                Reactivate
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 border-slate-200"
                              onClick={() => openAction(u, 'revoke')}>
                              Logout
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => openAction(u, 'delete')}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground font-medium text-xs">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Show</span>
              <Select value={String(pageSize)} onValueChange={val => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-16 h-8 text-xs rounded-lg">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>entries</span>
              <span className="ml-4 font-medium">
                Showing {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5 font-semibold rounded-lg"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={currentPage === p ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 text-xs p-0 font-semibold rounded-lg"
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5 font-semibold rounded-lg"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <ActionModal
        user={selectedUser}
        action={activeAction}
        onClose={() => { setSelectedUser(null); setActiveAction(null); }}
      />
    </div>
  );
}

// ─── Audit Logs Tab ───────────────────────────────────────────
function AuditLogsTab() {
  const { data: logs, isLoading } = useAuditLogs({ limit: 200 });

  const actionColors: Record<string, string> = {
    payment_completed:         'text-green-700 dark:text-green-400',
    payment_signature_invalid: 'text-red-700 dark:text-red-400',
    payment_mock_blocked:      'text-red-700 dark:text-red-400',
    user_suspended:            'text-yellow-700 dark:text-yellow-400',
    admin_user_suspended:      'text-yellow-700 dark:text-yellow-400',
    user_banned:               'text-red-700 dark:text-red-400',
    admin_user_banned:         'text-red-700 dark:text-red-400',
    role_changed:              'text-blue-700 dark:text-blue-400',
    admin_role_change:         'text-blue-700 dark:text-blue-400',
    admin_user_deleted:        'text-red-700 dark:text-red-400',
    kyc_status_changed:        'text-purple-700 dark:text-purple-400',
    otp_verified:              'text-green-700 dark:text-green-400',
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading audit logs…</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actor ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">IP / Device</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(logs ?? []).map(log => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className={`px-4 py-3 font-mono font-medium ${actionColors[log.action] ?? ''}`}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.entity_type && <span>{log.entity_type}/{log.entity_id?.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {log.user_id ? log.user_id.slice(0, 8) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {log.actor_id ? log.actor_id.slice(0, 8) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{log.ip_address ?? '—'}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5" title={log.metadata?.user_agent as string ?? 'Unknown'}>
                        <Info className="h-2.5 w-2.5 inline" /> {formatDevice(log.metadata?.user_agent as string)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(log.old_value || log.new_value || log.metadata) && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 font-semibold hover:underline">details</summary>
                          <pre className="text-xs mt-1 bg-muted p-2 rounded-lg max-w-xs overflow-auto border shadow-inner">
                            {JSON.stringify({ old: log.old_value, new: log.new_value, metadata: log.metadata }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
                {(logs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No audit logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rate Limit Blocks Tab ────────────────────────────────────
function RateLimitTab() {
  const { data: blocks, isLoading } = useRateLimitBlocks();
  const unblock = useUnblockRateLimit();

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bucket Key</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Blocked At</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Unblocks At</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Count</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(blocks ?? []).map((b: any) => (
                  <tr key={b.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{b.bucket_key}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-orange-600">{b.reason}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(b.blocked_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 font-medium">
                      {new Date(b.unblock_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{b.block_count}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg"
                        onClick={() => unblock.mutate(b.bucket_key)}>
                        Unblock
                      </Button>
                    </td>
                  </tr>
                ))}
                {(blocks ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-green-600 font-semibold text-xs">
                      No active blocks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function AdminSecurityDashboard() {
  const { data: users }  = useAdminUsers();
  const { data: blocks } = useRateLimitBlocks();
  const { data: logs }   = useAuditLogs({ limit: 100 });

  const totalHosts     = (users ?? []).filter(u => u.role === 'host').length;
  const totalTravellers = (users ?? []).filter(u => u.role === 'user').length;
  const suspendedCount = (users ?? []).filter(u => u.account_status === 'suspended').length;
  const bannedCount    = (users ?? []).filter(u => u.account_status === 'banned').length;
  const blocksCount    = (blocks ?? []).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-accent dark:text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            User management · Role control · Audit logs · Rate limits
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Total Users
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{(users ?? []).length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-purple-600 flex items-center gap-1">
              <Users className="h-3 w-3" /> Hosts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-purple-600">{totalHosts}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <Users className="h-3 w-3" /> Travellers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{totalTravellers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-yellow-600 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Suspended
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">{suspendedCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <Ban className="h-3 w-3" /> Banned
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{bannedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="users" className="rounded-lg text-xs font-semibold">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg text-xs font-semibold">
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Audit Logs
          </TabsTrigger>
          <TabsTrigger value="ratelimit" className="rounded-lg text-xs font-semibold">
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Rate Limits {blocksCount > 0 && <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0.5">{blocksCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersTable />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogsTab />
        </TabsContent>

        <TabsContent value="ratelimit" className="mt-4">
          <RateLimitTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
