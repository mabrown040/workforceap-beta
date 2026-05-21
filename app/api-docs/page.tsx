import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import ApiDocsClient from '@/components/api-docs/ApiDocsClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'API Reference',
    description: 'Interactive documentation for all WorkforceAP API endpoints.',
    path: '/api-docs',
  });
}

export default function ApiDocsPage() {
  const dataPath = resolve(process.cwd(), 'public/api-docs-data.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  return <ApiDocsClient data={data} />;
}
