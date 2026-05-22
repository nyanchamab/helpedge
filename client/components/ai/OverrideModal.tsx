'use client';

import { useState, useEffect, type FC } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { overrideTicketClassification } from '@/lib/api/ai';
import type { TicketAIDetails } from '@/lib/types/ai';
import type { UserRoleString } from '@/lib/api/users';

const overrideSchema = z.object({
  correctCategory: z.string().min(1, 'Please select a category'),
  correctPriority: z.string().optional(),
  correctAssignee: z.string().optional(),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
});

type OverrideFormData = z.infer<typeof overrideSchema>;

export interface AssigneeOption {
  id: string;
  name: string;
  role?: UserRoleString;
  department?: string;
  jobTitle?: string;
}

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ticketId: string;
  aiDetails: TicketAIDetails;
  availableCategories: { id: string; name: string }[];
  availablePriorities?: string[];
  availableAssignees?: AssigneeOption[];
}

const DEFAULT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const ASSIGNABLE_ROLES: UserRoleString[] = [
  'TeamLead',
  'SystemAdmin',
  'ServiceDeskAgent',
  'Technician',
  'SecurityAdmin',
];

function roleMatchesCategory(role: UserRoleString, categoryName: string): boolean {
  const name = categoryName.toLowerCase();

  switch (role) {
    case 'TeamLead':
    case 'Technician':
      return true;
    case 'SystemAdmin':
      return /network|hardware|infrastructure|server|system|connectivity/.test(name);
    case 'ServiceDeskAgent':
      return /software|account|access|general|help|support|service/.test(name);
    case 'SecurityAdmin':
      return /security|account|access/.test(name);
    default:
      return false;
  }
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export const OverrideModal: FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ticketId,
  aiDetails,
  availableCategories,
  availablePriorities = DEFAULT_PRIORITIES,
  availableAssignees = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      correctCategory: undefined,
      correctPriority: aiDetails.finalPriority || undefined,
      correctAssignee: undefined,
      reason: '',
    },
  });

  const watchedCategory = useWatch({ control: form.control, name: 'correctCategory' });
  const watchedAssignee = useWatch({ control: form.control, name: 'correctAssignee' });
  const watchedPriority = useWatch({ control: form.control, name: 'correctPriority' });

  useEffect(() => {
    if (!isOpen) { return; }
    const category = availableCategories.find(
      (c) => c.id === aiDetails.finalCategory || c.name === aiDetails.finalCategory,
    )?.name;
    const assignee = availableAssignees.find(
      (a) => a.id === aiDetails.finalAssignee || a.name === aiDetails.finalAssignee,
    )?.name;

    form.reset({
      correctCategory: category || undefined,
      correctPriority: aiDetails.finalPriority || undefined,
      correctAssignee: assignee || undefined,
      reason: '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, availableCategories, availableAssignees]);

  // Filter assignees: only assignable roles, filtered further by selected category
  const filteredAssignees = availableAssignees.filter((a) => {
    if (a.role && !ASSIGNABLE_ROLES.includes(a.role)) { return false; }
    if (!watchedCategory || !a.role) { return true; }

    return roleMatchesCategory(a.role, watchedCategory);
  });

  const handleSubmit = async (data: OverrideFormData) => {
    setIsSubmitting(true);
    try {
      const response = await overrideTicketClassification(ticketId, {
        category: data.correctCategory,
        priority: data.correctPriority,
        assignee: data.correctAssignee,
        reason: data.reason,
      });

      if (response.success) {
        toast.success('Classification corrected. Thank you for your feedback!', {
          description: 'This feedback will improve future classifications.',
        });
        onSuccess?.();
        onClose();
        form.reset();
      } else {
        toast.error('Failed to override classification', {
          description: response.error || 'Please try again.',
        });
      }
    } catch (_error) {
      toast.error('Failed to override classification', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  const resolveCategoryName = (idOrName: string | null | undefined) => {
    if (!idOrName) { return null; }

    return availableCategories.find((c) => c.id === idOrName || c.name === idOrName)?.name ?? idOrName;
  };

  const resolveAssigneeName = (idOrName: string | null | undefined) => {
    if (!idOrName) { return null; }

    return availableAssignees.find((a) => a.id === idOrName || a.name === idOrName)?.name ?? idOrName;
  };

  const aiCategory = resolveCategoryName(aiDetails.finalCategory);
  const aiAssignee = resolveAssigneeName(aiDetails.finalAssignee);
  const aiPriority = aiDetails.finalPriority;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Override AI Classification</DialogTitle>
          <DialogDescription>
            Correct the AI&rsquo;s classification with the accurate values. Your feedback helps
            improve future predictions.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The AI classified this ticket with{' '}
            <ConfidenceBadge
              confidence={aiDetails.finalConfidence || 0}
              method={aiDetails.method}
              needsReview={aiDetails.needsReview}
              size="sm"
              className="mx-1"
            />
            confidence.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

            {/* Category */}
            <FormField
              control={form.control}
              name="correctCategory"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    Category
                    {aiCategory && watchedCategory === aiCategory && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-600">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                  </FormLabel>
                  {aiCategory && (
                    <p className="text-xs text-muted-foreground">
                      AI suggested: <span className="font-medium text-foreground">{aiCategory}</span>
                    </p>
                  )}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <span className="truncate text-sm">
                          {field.value
                            ? field.value
                            : <span className="text-muted-foreground">Select correct category</span>
                          }
                        </span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent style={{ maxHeight: '320px' }}>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          <span className="font-medium">{category.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Priority */}
            <FormField
              control={form.control}
              name="correctPriority"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    Priority
                    {aiPriority && watchedPriority === aiPriority && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-600">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                  </FormLabel>
                  {aiPriority && (
                    <p className="text-xs text-muted-foreground">
                      AI suggested: <span className="font-medium text-foreground">{aiPriority}</span>
                    </p>
                  )}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <span className="truncate text-sm">
                          {field.value
                            ? field.value
                            : <span className="text-muted-foreground">Select correct priority</span>
                          }
                        </span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {availableAssignees.length > 0 && (
              <>
                <Separator />

                {/* Assignee */}
                <FormField
                  control={form.control}
                  name="correctAssignee"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="flex items-center gap-2">
                        Assignee
                        {aiAssignee && watchedAssignee === aiAssignee && (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-600">
                            <Sparkles className="h-3 w-3" /> AI
                          </span>
                        )}
                      </FormLabel>
                      {aiAssignee && (
                        <p className="text-xs text-muted-foreground">
                          AI suggested: <span className="font-medium text-foreground">{aiAssignee}</span>
                        </p>
                      )}
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <span className="truncate text-sm">
                              {field.value
                                ? field.value
                                : <span className="text-muted-foreground">Select correct assignee</span>
                              }
                            </span>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent style={{ maxHeight: '420px' }}>
                          {filteredAssignees.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              No staff match this category
                            </div>
                          ) : (
                            filteredAssignees.map((assignee) => (
                              <SelectItem key={assignee.id} value={assignee.name}>
                                <div className="flex items-center gap-3 py-1">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="text-xs bg-muted">
                                      {getInitials(assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium leading-tight">{assignee.name}</span>
                                    {(assignee.jobTitle || assignee.department) && (
                                      <span className="text-xs text-foreground/75 leading-tight">
                                        {[assignee.jobTitle, assignee.department].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                    {assignee.role && (
                                      <span className="text-muted-foreground text-xs leading-tight">
                                        {assignee.role}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Separator />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this correction necessary? (min. 10 characters)"
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 · minimum 10 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Correction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
