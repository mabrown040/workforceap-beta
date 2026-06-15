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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">
            Employer Partnership
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Join our employer network and hire pre-trained, certified talent at no cost.
          </p>
        </div>
        <EmployerLoiForm />
      </div>
    </div>
  );
}
