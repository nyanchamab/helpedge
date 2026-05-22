'use client';

import { useState } from 'react';
import NavHeader from '@/app/onboarding/navsection';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft } from 'react-icons/fa';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { registerOrganization } from '@/lib/api/auth';

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  colorClass: string;
} {
  if (!password) return { score: 0, label: '', colorClass: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'Weak', colorClass: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Fair', colorClass: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Good', colorClass: 'bg-blue-500' };
  return { score, label: 'Strong', colorClass: 'bg-green-500' };
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type Step = 1 | 2 | 3 | 4;

export default function OrgRegisterWizard() {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — admin email
  const [adminEmail, setAdminEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2 — org details
  const [orgName, setOrgName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [orgErrors, setOrgErrors] = useState<{ orgName?: string; supportEmail?: string }>({});
  const [orgTouched, setOrgTouched] = useState<{ orgName?: boolean; supportEmail?: boolean }>({});

  // Step 3 — admin account
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [adminErrors, setAdminErrors] = useState<Partial<Record<string, string>>>({});
  const [adminTouched, setAdminTouched] = useState<Partial<Record<string, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // ── Step 1 ──────────────────────────────────────────────────────────
  const handleStep1Continue = () => {
    if (!adminEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!isValidEmail(adminEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setStep(2);
  };

  // ── Step 2 ──────────────────────────────────────────────────────────
  const validateOrgField = (name: 'orgName' | 'supportEmail', value: string) => {
    if (name === 'orgName') {
      if (!value.trim()) return 'Organization name is required';
      if (value.trim().length < 2) return 'Must be at least 2 characters';
      if (value.trim().length > 100) return 'Cannot exceed 100 characters';
    }
    if (name === 'supportEmail') {
      if (!value.trim()) return 'Support email is required';
      if (!isValidEmail(value)) return 'Invalid email format';
    }
    return undefined;
  };

  const handleStep2Continue = () => {
    const errors = {
      orgName: validateOrgField('orgName', orgName),
      supportEmail: validateOrgField('supportEmail', supportEmail),
    };
    setOrgErrors(errors);
    setOrgTouched({ orgName: true, supportEmail: true });
    if (!errors.orgName && !errors.supportEmail) setStep(3);
  };

  // ── Step 3 ──────────────────────────────────────────────────────────
  const validateAdminField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'Must be at least 2 characters';
        break;
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Must be at least 2 characters';
        break;
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
          return 'Must include uppercase, lowercase, and a number';
        break;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        break;
    }
    return undefined;
  };

  const handleAdminFieldChange = (name: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      firstName: setFirstName,
      lastName: setLastName,
      password: setPassword,
      confirmPassword: setConfirmPassword,
      jobTitle: setJobTitle,
      phoneNumber: setPhoneNumber,
    };
    setters[name]?.(value);
    if (adminTouched[name]) {
      setAdminErrors((prev) => ({ ...prev, [name]: validateAdminField(name, value) }));
    }
    if (name === 'password' && adminTouched.confirmPassword) {
      setAdminErrors((prev) => ({
        ...prev,
        confirmPassword: confirmPassword !== value ? 'Passwords do not match' : undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['firstName', 'lastName', 'password', 'confirmPassword'];
    const values: Record<string, string> = {
      firstName, lastName, password, confirmPassword,
    };
    const errors: Record<string, string | undefined> = {};
    for (const key of required) {
      errors[key] = validateAdminField(key, values[key]);
    }
    setAdminErrors(errors);
    setAdminTouched({ firstName: true, lastName: true, password: true, confirmPassword: true });
    if (Object.values(errors).some(Boolean)) return;

    setIsLoading(true);
    setGeneralError('');
    try {
      const result = await registerOrganization({
        organizationName: orgName,
        supportEmail,
        adminFirstName: firstName,
        adminLastName: lastName,
        adminEmail,
        adminPassword: password,
        adminJobTitle: jobTitle || undefined,
        adminPhoneNumber: phoneNumber || undefined,
      });
      if (result.success) {
        setStep(4);
      } else {
        setGeneralError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthBarCount = Math.ceil((passwordStrength.score / 6) * 4);

  const StepProgress = ({ current, total }: { current: number; total: number }) => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 <= current ? 'bg-blue-600 w-8' : 'bg-gray-200 w-4'
          }`}
        />
      ))}
    </div>
  );

  return (
    <>
      <NavHeader />
      <Card className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 px-6 py-16 relative overflow-hidden">
        <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-md p-12 md:p-16 rounded-3xl shadow-2xl border border-blue-100 transition-transform hover:scale-[1.01]">

          {/* Logo */}
          <div className="mb-8 text-center flex justify-center">
            <Image
              src={siteConfig.logo}
              alt="HelpEdge Logo"
              width={64}
              height={64}
              style={{ width: 'auto', height: '4rem' }}
            />
          </div>

          {/* ── Step 1: Email entry (original GetStarted design) ── */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3 text-center">
                Enter your email to Sign up
              </h2>
              <p className="text-sm text-gray-500 mb-8 text-center">
                Or choose another option below.
              </p>

              <div className="space-y-4 flex flex-col items-center">
                <div className="w-1/2">
                  <Input
                    type="email"
                    placeholder="name@work-email.com"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
                    className="text-center w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-red-500 -mt-2 text-center">{emailError}</p>
                )}
                <Button
                  onClick={handleStep1Continue}
                  className="w-1/2 px-4 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition h-auto"
                >
                  Continue
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600 mt-4">
                <p>
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 font-medium hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <div className="text-center text-sm text-gray-600 mt-4">
                <p className="font-medium text-gray-700">OTHER OPTIONS</p>
              </div>

              <div className="my-8 border-t border-gray-200" />

              <div className="text-center text-sm text-gray-600">
                <div className="flex justify-center space-x-3 mt-4">
                  <Button variant="outline">
                    <FcGoogle className="mr-2 h-5 w-5" />
                    Continue with Google
                  </Button>
                  <Button variant="outline">
                    <FaMicrosoft className="mr-2 h-5 w-5" />
                    Continue with Microsoft
                  </Button>
                </div>
                <p className="mt-4 text-gray-600">
                  Already using HelpEdge?{' '}
                  <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
                    Sign in to an existing account
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: Organization Details ── */}
          {step === 2 && (
            <>
              <StepProgress current={1} total={3} />
              <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                Set up your organization
              </h2>
              <p className="text-sm text-gray-500 mb-8 text-center">
                Tell us about the organization you&apos;re onboarding onto HelpEdge
              </p>

              <div className="space-y-5 max-w-sm mx-auto">
                <div className="space-y-1">
                  <Label htmlFor="orgName" className="text-gray-700">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    placeholder="Acme Corp"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      if (orgTouched.orgName)
                        setOrgErrors((p) => ({ ...p, orgName: validateOrgField('orgName', e.target.value) }));
                    }}
                    onBlur={() => {
                      setOrgTouched((p) => ({ ...p, orgName: true }));
                      setOrgErrors((p) => ({ ...p, orgName: validateOrgField('orgName', orgName) }));
                    }}
                  />
                  {orgErrors.orgName && (
                    <p className="text-xs text-red-500">{orgErrors.orgName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="supportEmail" className="text-gray-700">
                    Support Inbox Email
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@yourcompany.com"
                    value={supportEmail}
                    onChange={(e) => {
                      setSupportEmail(e.target.value);
                      if (orgTouched.supportEmail)
                        setOrgErrors((p) => ({ ...p, supportEmail: validateOrgField('supportEmail', e.target.value) }));
                    }}
                    onBlur={() => {
                      setOrgTouched((p) => ({ ...p, supportEmail: true }));
                      setOrgErrors((p) => ({ ...p, supportEmail: validateOrgField('supportEmail', supportEmail) }));
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    The shared email address your users send support requests to
                  </p>
                  {orgErrors.supportEmail && (
                    <p className="text-xs text-red-500">{orgErrors.supportEmail}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-none px-4"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleStep2Continue}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Admin Account ── */}
          {step === 3 && (
            <>
              <StepProgress current={2} total={3} />
              <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                Create your admin account
              </h2>
              <p className="text-sm text-gray-500 mb-8 text-center">
                You&apos;ll be the default administrator for{' '}
                <span className="font-medium text-gray-700">{orgName}</span>
              </p>

              {generalError && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4 max-w-sm mx-auto">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto" noValidate>
                {/* Email (pre-filled, read-only display) */}
                <div className="space-y-1">
                  <Label className="text-gray-700">Your Work Email</Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 flex justify-between items-center">
                    <span>{adminEmail}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 text-xs hover:underline ml-2 shrink-0"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* First / Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-gray-700">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => handleAdminFieldChange('firstName', e.target.value)}
                      onBlur={() => {
                        setAdminTouched((p) => ({ ...p, firstName: true }));
                        setAdminErrors((p) => ({ ...p, firstName: validateAdminField('firstName', firstName) }));
                      }}
                      disabled={isLoading}
                    />
                    {adminErrors.firstName && (
                      <p className="text-xs text-red-500">{adminErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-gray-700">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => handleAdminFieldChange('lastName', e.target.value)}
                      onBlur={() => {
                        setAdminTouched((p) => ({ ...p, lastName: true }));
                        setAdminErrors((p) => ({ ...p, lastName: validateAdminField('lastName', lastName) }));
                      }}
                      disabled={isLoading}
                    />
                    {adminErrors.lastName && (
                      <p className="text-xs text-red-500">{adminErrors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handleAdminFieldChange('password', e.target.value)}
                      onBlur={() => {
                        setAdminTouched((p) => ({ ...p, password: true }));
                        setAdminErrors((p) => ({ ...p, password: validateAdminField('password', password) }));
                      }}
                      className="pr-10"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= strengthBarCount ? passwordStrength.colorClass : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <p
                          className={`text-xs ${
                            passwordStrength.score <= 2
                              ? 'text-red-500'
                              : passwordStrength.score <= 3
                              ? 'text-yellow-600'
                              : passwordStrength.score <= 4
                              ? 'text-blue-600'
                              : 'text-green-600'
                          }`}
                        >
                          {passwordStrength.label}
                        </p>
                      )}
                    </div>
                  )}
                  {adminErrors.password && (
                    <p className="text-xs text-red-500">{adminErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleAdminFieldChange('confirmPassword', e.target.value)}
                      onBlur={() => {
                        setAdminTouched((p) => ({ ...p, confirmPassword: true }));
                        setAdminErrors((p) => ({ ...p, confirmPassword: validateAdminField('confirmPassword', confirmPassword) }));
                      }}
                      className="pr-10"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {adminErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{adminErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Job Title / Phone (optional) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="jobTitle" className="text-gray-700">
                      Job Title{' '}
                      <span className="text-gray-400 text-xs font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => handleAdminFieldChange('jobTitle', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phoneNumber" className="text-gray-700">
                      Phone{' '}
                      <span className="text-gray-400 text-xs font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handleAdminFieldChange('phoneNumber', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                    className="flex-none px-4"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Organization'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 4: Email Verification Sent ── */}
          {step === 4 && (
            <div className="text-center space-y-6 py-4">
              <StepProgress current={3} total={3} />
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <MailCheck className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-800">Check your inbox</h2>
                <p className="text-sm text-gray-500">We sent a verification link to</p>
                <p className="text-sm font-medium text-gray-800">{adminEmail}</p>
                <p className="text-sm text-gray-500">
                  Click the link to activate your account and get started.
                </p>
              </div>
              <div className="space-y-3 max-w-xs mx-auto">
                <p className="text-xs text-gray-500">
                  Didn&apos;t receive it? Check your spam folder or{' '}
                  <button className="text-blue-600 hover:underline">resend the email</button>.
                </p>
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </Card>
    </>
  );
}
