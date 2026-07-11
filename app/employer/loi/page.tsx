import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import EmployerLoiForm from '@/components/employer/EmployerLoiForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('loiTitle'),
    description: t('loiDescription'),
    path: '/employer/loi',
  });
}

export default function EmployerLoiPage() {
  return (
    <div className="wa-min-h-screen wa-bg-slate-50">
      <div className="wa-mx-auto wa-max-w-4xl wa-px-4 wa-py-16 sm:wa-px-6 lg:wa-px-8">
        <div className="wa-text-center wa-mb-12">
          <h1 className="wa-text-4xl wa-font-bold wa-text-slate-900">
            Employer Partnership
          </h1>
          <p className="wa-mt-4 wa-text-lg wa-text-slate-600">
            Join our employer network and hire pre-trained, certified talent at no cost.
          </p>
        </div>
        <EmployerLoiForm />
      </div>
    </div>
  );
}
