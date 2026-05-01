'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { createTicket } from '@/lib/api/tickets';
import { getAllCategories, Category } from '@/lib/api/categories';
import { UserTicketForm, UserTicketSubmitData } from '@/components/portal/UserTicketForm';
import { EmailTicketForm } from '@/components/tickets/EmailTicketForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const PROXY_ROLES = ['Admin', 'ITManager', 'TeamLead', 'ServiceDeskAgent'];

export default function SubmitTicketPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { navigateTo } = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    async function loadCategories() {
      const response = await getAllCategories();

      if (response.success && response.data) {
        setCategories(response.data.filter((c) => c.isActive));
      }
    }
    void loadCategories();
  }, []);

  async function handleQuickSubmit(data: UserTicketSubmitData) {
    if (!user?.id) {
      toast.error('You must be logged in to submit a ticket');

      return;
    }
    if (submittingRef.current) {return;}
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await createTicket(
        {
          subject: data.subject,
          description: data.description,
          createdById: user.id,
          priority: data.priority,
          categoryId: data.categoryId,
        },
        idempotencyKeyRef.current,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Failed to create ticket');
      }

      const ticket = response.data;

      if (ticket.triageStatus === 'AutoAssigned') {
        toast.success('Ticket submitted — our team is already on it!');
      } else if (ticket.triageStatus === 'AssignedWithReview') {
        toast.success('Ticket submitted and assigned for review.');
      } else {
        toast.success("Ticket submitted! We'll get back to you as soon as possible.");
      }

      if (user.role === 'EndUser') {
        navigateTo(`/portal/ticket/${ticket.id}`);
      } else {
        navigateTo(`/tickets/${ticket.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit ticket';

      toast.error(message);
      idempotencyKeyRef.current = crypto.randomUUID();
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return null;
  }

  const canUseProxy = PROXY_ROLES.includes(user.role);

  if (!canUseProxy) {
    return (
      <div className="container max-w-2xl mx-auto py-6">
        <UserTicketForm
          categories={categories}
          onSubmit={handleQuickSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Ticket</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new support ticket directly or on behalf of a user via email proxy
        </p>
      </div>

      <Tabs defaultValue="quick">
        <TabsList>
          <TabsTrigger value="quick">Quick Submit</TabsTrigger>
          <TabsTrigger value="proxy">Proxy Submit</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-6">
          <div className="max-w-2xl">
            <UserTicketForm
              categories={categories}
              onSubmit={handleQuickSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </TabsContent>

        <TabsContent value="proxy" className="mt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Create Ticket from Email</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Manually create a support ticket from email data. The system will automatically
              apply AI analysis to classify and suggest assignments.
            </p>
          </div>
          <EmailTicketForm
            defaultCreatorId={user.id}
            onSuccess={(ticketId) => navigateTo(`/tickets/${ticketId}`)}
            onCancel={() => navigateTo('/tickets')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
