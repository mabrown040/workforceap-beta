import type { MetadataRoute } from 'next';
import { buildProductionRobots, buildStagingRobots } from '@/lib/seo/robotsPolicy';
import { isStagingDeployment } from '@/lib/seo/siteEnvironment';

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (await isStagingDeployment()) {
    return buildStagingRobots();
  }
  return buildProductionRobots();
}
