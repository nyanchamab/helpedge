import OrgRegisterWizard from '@/components/auth/RegisterForm';
import PublicRoute from '@/components/auth/PublicRoute';

export default function GetStartedPage() {
  return (
    <PublicRoute>
      <OrgRegisterWizard />
    </PublicRoute>
  );
}
