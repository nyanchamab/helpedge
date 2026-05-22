'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';

interface PlaceholderPageProps {
  title: string;
  description: string;
  features?: string[];
  comingSoon?: boolean;
}

export function PlaceholderPage({
  title,
  description,
  features = [],
  comingSoon = true,
}: PlaceholderPageProps) {
  const { navigateTo } = useNavigation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {comingSoon && (
              <Badge
                variant="outline"
                className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
              >
                Coming Soon
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        <Button variant="outline" onClick={() => navigateTo('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main content placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Construction className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Page Under Development</CardTitle>
              <CardDescription>
                This feature is currently being developed and will be available soon.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {features.length > 0 && (
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Planned Features:</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="min-w-[1.5rem] h-6 flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
