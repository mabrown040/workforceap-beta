#!/bin/bash

echo "🔍 WorkforceAP Security Verification Script"
echo "=============================================="

# Check if Next.js is running
if pgrep -f "next" > /dev/null; then
    echo "✅ Next.js process detected"
else
    echo "⚠️  Next.js not running - start with 'npm run dev'"
fi

echo ""
echo "📊 Security Header Check (API routes):"
echo "--------------------------------------"

# Test API endpoint for security headers
curl -s -I http://localhost:3000/api/member/resume/upload 2>/dev/null | grep -E "(X-Content-Type-Options|X-Frame-Options|X-Robots-Tag|Cache-Control)" || echo "⚠️  API headers not detected (server may not be running)"

echo ""
echo "🔒 Admin API Protection Check:"
echo "--------------------------------"

# Test admin API without authentication
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/members 2>/dev/null || echo "⚠️  Cannot reach admin API (server may not be running)"

echo ""
echo "🐛 Dependency Vulnerabilities:"
echo "------------------------------"
npm audit --audit-level=moderate 2>/dev/null | grep -E "(vulnerabilities|Severity)" || echo "⚠️  npm audit failed"

echo ""
echo "📦 Key Dependency Versions:"
echo "---------------------------"
echo "Next.js: $(npm list next 2>/dev/null | grep next@ | cut -d@ -f3 || echo 'not found')"
echo "Prisma: $(npm list prisma 2>/dev/null | grep prisma@ | cut -d@ -f3 || echo 'not found')"
echo "Supabase SSR: $(npm list @supabase/ssr 2>/dev/null | grep @supabase/ssr@ | cut -d@ -f3 || echo 'not found')"

echo ""
echo "✨ Verification Complete"
echo "Check SECURITY_HANDOFF_2026-04-29.md for detailed results"