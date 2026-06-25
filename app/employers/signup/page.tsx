'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function EmployerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [hearAbout, setHearAbout] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  function validatePassword(value: string): string[] {
    const errs: string[] = [];
    if (value.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(value)) errs.push('One uppercase letter');
    if (!/[a-z]/.test(value)) errs.push('One lowercase letter');
    if (!/[0-9]/.test(value)) errs.push('One number');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const pwErrs = validatePassword(password);
    if (pwErrs.length > 0) {
      setPasswordErrors(pwErrs);
      return;
    }
    setPasswordErrors([]);

    if (!consentTerms) {
      setError('You must agree to the terms and privacy policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/employer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          password,
          industry,
          companySize,
          hearAbout,
          consentTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      if (data.redirectTo) {
        router.push(data.redirectTo);
        return;
      }
      setSuccessMessage(typeof data.message === 'string' ? data.message : '');
      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="mdx min-h-screen bg-[#F5F4F0]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1B365D] rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1B365D] text-lg">WorkforceAP</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/employers" className="text-sm text-gray-600 hover:text-[#1B365D] font-medium">
              For Employers
            </Link>
            <Link href="/login" className="text-sm text-[#1B365D] font-medium hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {success && !loading ? (
          <div className="mdx-card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created</h1>
            <p className="text-gray-600 mb-6">
              {successMessage ||
                'Account created. Please check your email to verify your account before logging in.'}
            </p>
            <Link
              href="/login"
              className="mdx-btn mdx-btn--primary inline-flex items-center gap-2"
            >
              Go to Log In
            </Link>
          </div>
        ) : (
          <>
            <section className="mdx-stage text-center mb-8">
              <span className="mdx-pill">For Employers</span>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your <span className="mdx-grad-accent">Employer</span> Account
              </h1>
              <p className="text-gray-600">
                Start a pipeline subscription to access training-aligned candidates. $499/mo Growth tier. Cancel anytime.
              </p>
            </section>

            <form onSubmit={handleSubmit} className="mdx-card p-8 space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Company Info */}
              <div className="space-y-4">
                <h2 className="mdx-eyebrow">Company Information</h2>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <input
                      id="industry"
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                      placeholder="e.g. Healthcare, Tech"
                    />
                  </div>
                  <div>
                    <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size
                    </label>
                    <select
                      id="companySize"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h2 className="mdx-eyebrow">Contact Information</h2>
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                      placeholder="jane@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                      placeholder="(512) 555-1234"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h2 className="mdx-eyebrow">Account Security</h2>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordErrors(validatePassword(e.target.value));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent pr-12"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {passwordErrors.map((err) => (
                        <li key={err} className="text-xs text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* How they heard */}
              <div>
                <label htmlFor="hearAbout" className="block text-sm font-medium text-gray-700 mb-1">
                  How did you hear about WorkforceAP?
                </label>
                <input
                  id="hearAbout"
                  type="text"
                  value={hearAbout}
                  onChange={(e) => setHearAbout(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                  placeholder="Referral, search, event, etc."
                />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="consentTerms"
                  type="checkbox"
                  checked={consentTerms}
                  onChange={(e) => setConsentTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
                />
                <label htmlFor="consentTerms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#1B365D] font-medium hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#1B365D] font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mdx-btn mdx-btn--solid w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Employer Account'
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-[#1B365D] font-medium hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
