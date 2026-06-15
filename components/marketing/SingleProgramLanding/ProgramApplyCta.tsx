import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Props {
  programSlug: string;
  size?: 'default' | 'lg';
}

export function ProgramApplyCta({ programSlug, size = 'default' }: Props) {
  const sizeClasses = size === 'lg'
    ? 'px-8 py-4 text-lg'
    : 'px-6 py-3 text-base';

  return (
    <Link href={`/apply?program=${programSlug}`}>
      <Button className={`${sizeClasses} font-semibold bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg hover:shadow-xl transition-all`}>
        Apply Now — Free
      </Button>
    </Link>
  );
}
