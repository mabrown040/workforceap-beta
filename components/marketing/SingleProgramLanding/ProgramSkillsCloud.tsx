interface Props {
  skills: string[];
}

export function ProgramSkillsCloud({ skills }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {skills.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}
