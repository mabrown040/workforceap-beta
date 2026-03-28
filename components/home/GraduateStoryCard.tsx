import Image from 'next/image';

type GraduateStoryProps = {
  name: string;
  role: string;
  imageSrc: string;
  beforePay: string;
  afterPay: string;
};

export default function GraduateStoryCard({ name, role, imageSrc, beforePay, afterPay }: GraduateStoryProps) {
  return (
    <div className="wa-bg-white dark:wa-bg-[#201f1f] wa-p-8 wa-rounded-xl wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)] wa-transition-colors hover:wa-border-[#ad2c4d]/30">
      <div className="wa-flex wa-items-start wa-gap-6">
        <Image
          src={imageSrc}
          alt={`${name} - ${role}`}
          width={80}
          height={80}
          className="wa-rounded-lg wa-object-cover wa-grayscale"
          style={{ width: 80, height: 80 }}
        />
        <div>
          <h3 className="wa-text-2xl wa-font-bold wa-text-gray-900 dark:wa-text-[#e6e1e1]">{name}</h3>
          <div className="wa-text-[#ad2c4d] wa-font-bold wa-text-sm wa-mb-4">{role}</div>
          <div className="wa-grid wa-grid-cols-2 wa-gap-4">
            <div className="wa-bg-gray-100 dark:wa-bg-[#141313] wa-p-3 wa-rounded-lg">
              <div className="wa-text-[10px] wa-text-gray-500 dark:wa-text-[#debfc2] wa-uppercase wa-font-bold">Before</div>
              <div className="wa-text-lg wa-font-bold wa-text-gray-900 dark:wa-text-[#e6e1e1]">{beforePay}</div>
            </div>
            <div className="wa-bg-[rgba(173,44,77,0.1)] wa-p-3 wa-rounded-lg wa-border wa-border-[rgba(173,44,77,0.2)]">
              <div className="wa-text-[10px] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] wa-uppercase wa-font-bold">After</div>
              <div className="wa-text-lg wa-font-bold wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">{afterPay}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
