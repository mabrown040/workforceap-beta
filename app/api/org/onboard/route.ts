import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getStripe } from '@/lib/stripe/client';
import { checkOrgOnboardRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

function generateUniqueSlug(base: string): Promise<string> {
  const attempt = async (suffix: number): Promise<string> => {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    return attempt(suffix + 1);
  };
  return attempt(0);
}

const onboardSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z
    .string()
    .max(253)
    .regex(/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i, 'Enter a valid domain like example.org')
    .optional()
    .nullable(),
  email: z.string().email(),
  tier: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
});export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinLimit } = await checkOrgOnboardRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid body' },
        { status: 400 }
      );
    }

    const { name, domain, email, tier } = parsed.data;
    const slug = await generateUniqueSlug(slugify(name));

    // Validate domain is not already claimed
    if (domain) {
      const existing = await prisma.organization.findUnique({
        where: { customDomain: domain },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'That custom domain is already in use.' },
          { status: 409 }
        );
      }
    }

    const stripe = getStripe();
    const priceId =
      tier === 'enterprise'
        ? process.env.STRIPE_ENTERPRISE_PRICE_ID
        : tier === 'growth'
          ? process.env.STRIPE_GROWTH_PRICE_ID
          : process.env.STRIPE_STARTER_PRICE_ID;

    let checkoutUrl: string | null = null;

    if (priceId) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${request.nextUrl.origin}/org/onboard?success=1&org=${slug}`,
        cancel_url: `${request.nextUrl.origin}/org/onboard?canceled=1`,
        customer_email: email,
        metadata: { orgSlug: slug, orgName: name },
      });
      checkoutUrl = session.url;
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        customDomain: domain ?? null,
        subscriptionTier: tier,
        subscriptionStatus: priceId ? 'pending_payment' : 'trial',
        active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        org,
        setupUrl: `${request.nextUrl.origin}/org/onboard?success=1&org=${slug}`,
        checkoutUrl,
        portalUrl: `https://${slug}.workforceap.org`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[org/onboard] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
