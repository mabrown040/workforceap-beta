import { ProgramCourse } from '@/lib/content/programs';

interface Props {
  courses: ProgramCourse[];
}

export function ProgramCourseList({ courses }: Props) {
  return (
    <div className="space-y-4">
      {courses.map((course, index) => (
        <div
          key={course.slug}
          className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {index + 1}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{course.name}</h3>
            <p className="text-sm text-slate-500">
              {course.estimatedHours} hours estimated
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
