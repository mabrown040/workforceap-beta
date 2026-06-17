"use client";

import { useState, useEffect } from "react";
import PortalPageFrame from "@/components/portal/PortalPageFrame";
import PageHeader from "@/components/portal/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/portal/ui/DataTable";

interface Member {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  assessmentCompleted: boolean;
  interviewEligible: boolean;
  placementRecord: { placedAt: string; employerName: string } | null;
}

interface ChapterMemberRow {
  user: Member;
  joinedAt: string;
  status: string;
}

interface ChapterMeeting {
  id: string;
  scheduledAt: string;
  location: string | null;
  topic: string | null;
  attendanceCount: number | null;
}

interface CurriculumItem {
  id: string;
  orderIndex: number;
  notes: string | null;
  course: { id: string; name: string; programSlug: string };
}

interface Chapter {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  meetingSchedule: string | null;
  meetingLocation: string | null;
  members: ChapterMemberRow[];
  meetings: ChapterMeeting[];
  curriculumItems: CurriculumItem[];
}

export default function LeaderDashboardPage() {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // For now, fetch the first chapter the user leads
    // In production, this would be /api/leader/chapters/me or similar
    fetch("/api/leader/chapters")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        // If array, take first; if single object, use it
        const ch = Array.isArray(data) ? data[0] : data;
        if (!ch) throw new Error("No chapter found");
        setChapter(ch);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = chapter ? {
    total: chapter.members.length,
    active: chapter.members.filter((m) => m.status === "active").length,
    assessed: chapter.members.filter((m) => m.user.assessmentCompleted).length,
    interviewReady: chapter.members.filter((m) => m.user.interviewEligible).length,
    placed: chapter.members.filter((m) => m.user.placementRecord).length,
  } : null;

  const memberColumns: DataTableColumn<ChapterMemberRow>[] = [
    { key: "name", header: "Name", cell: (m) => m.user.fullName },
    { key: "program", header: "Program", cell: (m) => m.user.enrolledProgram || "—" },
    {
      key: "status",
      header: "Status",
      cell: (m) => (
        <span className={`px-2 py-0.5 rounded text-xs ${
          m.user.placementRecord ? "bg-green-100 text-green-800" :
          m.user.interviewEligible ? "bg-blue-100 text-blue-800" :
          m.user.assessmentCompleted ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100"
        }`}>
          {m.user.placementRecord ? "Placed" :
           m.user.interviewEligible ? "Interview Ready" :
           m.user.assessmentCompleted ? "Assessed" : "New"}
        </span>
      ),
    },
  ];

  return (
    <PortalPageFrame>
      <PageHeader
        title={chapter?.name || "Leader Dashboard"}
        subtitle={chapter ? `${chapter.city}${chapter.state ? `, ${chapter.state}` : ""} — ${chapter.meetingSchedule || ""}` : "Launchpad Job Club"}
      />

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Members</div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{stats.assessed}</div>
            <div className="text-sm text-gray-500">Assessed</div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{stats.interviewReady}</div>
            <div className="text-sm text-gray-500">Interview Ready</div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <div className="text-2xl font-bold">{stats.placed}</div>
            <div className="text-sm text-gray-500">Placed</div>
          </div>
        </div>
      )}

      {chapter && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Members</h3>
            <DataTable columns={memberColumns} rows={chapter.members} rowKey={(m) => m.user.id} />
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Meetings</h3>
            {chapter.meetings.length === 0 ? (
              <p className="text-gray-500 text-sm">No meetings scheduled yet.</p>
            ) : (
              <ul className="space-y-2">
                {chapter.meetings.map((mtg) => (
                  <li key={mtg.id} className="border p-2 rounded text-sm">
                    <div className="font-medium">{new Date(mtg.scheduledAt).toLocaleDateString()}</div>
                    <div className="text-gray-500">{mtg.topic || "General meeting"}</div>
                    <div className="text-gray-500">{mtg.location || chapter.meetingLocation || "TBD"}</div>
                    {mtg.attendanceCount !== null && (
                      <div className="text-xs text-gray-400">Attendance: {mtg.attendanceCount}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-4 rounded shadow col-span-2">
            <h3 className="font-semibold mb-3">Curriculum</h3>
            {chapter.curriculumItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No curriculum items assigned yet.</p>
            ) : (
              <ol className="space-y-2">
                {chapter.curriculumItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border p-2 rounded">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">
                      {item.orderIndex + 1}
                    </span>
                    <div>
                      <div className="font-medium">{item.course.name}</div>
                      <div className="text-xs text-gray-500">{item.course.programSlug}</div>
                    </div>
                    {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </PortalPageFrame>
  );
}
