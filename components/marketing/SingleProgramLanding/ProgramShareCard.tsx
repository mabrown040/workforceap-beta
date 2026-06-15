import { Program } from '@/lib/content/programs';
import { getProgramDisplayTitle } from '@/lib/content/programs';
import { ShareButton } from '@/components/ui/ShareButton';

interface Props {
  program: Program;
}

export function ProgramShareCard({ program }: Props) {
  const title = getProgramDisplayTitle(program);
  const shareUrl = `https://www.workforceap.org/programs/${program.slug}`;
  const shareText = `Check out the ${title} — free professional certificate program with career coaching!`;

  return (
    <ShareButton
      url={shareUrl}
      title={shareText}
      className="border-slate-300 hover:bg-slate-50"
    />
  );
}
