'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { escalateTicket } from '@/lib/api/tickets';
import { getAssignableStaff, User, getUserDisplayName, UserRoleString } from '@/lib/api/users';

const ESCALATABLE_ROLES: UserRoleString[] = [
  'Admin',
  'ITManager',
  'TeamLead',
  'Technician',
  'SystemAdmin',
  'ServiceDeskAgent',
  'SecurityAdmin',
];

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

interface EscalateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess: () => void;
}

export function EscalateDialog({ isOpen, onClose, ticketId, onSuccess }: EscalateDialogProps) {
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoadingUsers(true);
    const response = await getAssignableStaff();

    if (response.success && response.data) {
      setUsers(
        response.data.filter((u) => u.isActive && ESCALATABLE_ROLES.includes(u.role)),
      );
    }
    setIsLoadingUsers(false);
  }

  useEffect(() => {
    if (!isOpen) { return; }

    async function load() {
      await loadUsers();
    }

    void load();

    return () => {
      setReason('');
      setTargetUserId('');
      setError(null);
    };
  }, [isOpen]);

  async function handleSubmit() {
    if (!reason.trim()) { return; }

    setIsSubmitting(true);
    setError(null);

    const response = await escalateTicket(ticketId, {
      reason: reason.trim(),
      targetUserId: targetUserId && targetUserId !== 'none' ? targetUserId : undefined,
    });

    if (response.success) {
      onSuccess();
      onClose();
    } else {
      setError(response.error || 'Failed to escalate ticket');
    }

    setIsSubmitting(false);
  }

  const selectedUser = users.find((u) => u.id === targetUserId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Escalate Ticket
          </DialogTitle>
          <DialogDescription>
            Escalating marks this ticket as high-priority and notifies senior agents. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="escalate-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="escalate-reason"
              placeholder="Explain why this ticket needs to be escalated..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalate-target">Assign to (optional)</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId} disabled={isLoadingUsers}>
              <SelectTrigger id="escalate-target" className="w-full">
                <span className="truncate text-sm">
                  {isLoadingUsers ? (
                    <span className="text-muted-foreground">Loading users...</span>
                  ) : selectedUser ? (
                    getUserDisplayName(selectedUser)
                  ) : targetUserId === 'none' ? (
                    'No specific assignee'
                  ) : (
                    <span className="text-muted-foreground">Select a staff member</span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent style={{ maxHeight: '420px' }}>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No specific assignee</span>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-3 py-1">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(getUserDisplayName(user))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium leading-tight">
                          {getUserDisplayName(user)}
                        </span>
                        {(user.jobTitle || user.department) && (
                          <span className="text-xs text-foreground/75 leading-tight">
                            {[user.jobTitle, user.department].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs leading-tight">
                          {user.role} · {user.email}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {targetUserId && targetUserId !== 'none'
                ? 'The selected staff member will be assigned to this escalated ticket.'
                : 'Without a target, the escalation will be routed to available senior agents.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Escalate Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
