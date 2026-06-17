"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalPageFrame from "@/components/portal/PortalPageFrame";
import PageHeader from "@/components/portal/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/portal/ui/DataTable";

interface Chapter {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  status: string;
  leader: { id: string; fullName: string; email: string } | null;
  _count: { members: number };
  createdAt: string;
}

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    leaderId: "",
    meetingSchedule: "",
    meetingLocation: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/chapters")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setChapters(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setChapters((prev) => [data, ...prev]);
    setShowForm(false);
    setFormData({ name: "", slug: "", city: "", state: "", leaderId: "", meetingSchedule: "", meetingLocation: "" });
    router.refresh();
  };

  const columns: DataTableColumn<Chapter>[] = [
    {
      key: "name",
      header: "Name",
      cell: (ch) => (
        <Link href={`/admin/chapters/${ch.id}`} className="text-blue-600 hover:underline">
          {ch.name}
        </Link>
      ),
    },
    { key: "location", header: "Location", cell: (ch) => `${ch.city || ""}${ch.state ? `, ${ch.state}` : ""}` },
    { key: "leader", header: "Leader", cell: (ch) => ch.leader?.fullName || "—" },
    { key: "members", header: "Members", cell: (ch) => ch._count.members, align: "right" },
    {
      key: "status",
      header: "Status",
      cell: (ch) => (
        <span className={`px-2 py-1 rounded text-sm ${ch.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>
          {ch.status}
        </span>
      ),
    },
  ];

  return (
    <PortalPageFrame>
      <PageHeader title="Chapters" subtitle="Manage Launchpad Job Club chapters" />

      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ New Chapter"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Chapter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              placeholder="Slug (austin-launchpad)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="border p-2 rounded"
              required
            />
            <input
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              placeholder="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              placeholder="Leader User ID"
              value={formData.leaderId}
              onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              placeholder="Meeting schedule (Fridays 10am)"
              value={formData.meetingSchedule}
              onChange={(e) => setFormData({ ...formData, meetingSchedule: e.target.value })}
              className="border p-2 rounded"
            />
          </div>
          <input
            placeholder="Meeting location (ACC Highland, Room 301)"
            value={formData.meetingLocation}
            onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Create Chapter
          </button>
        </form>
      )}

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="bg-white rounded shadow overflow-hidden">
        <DataTable columns={columns} rows={chapters} rowKey={(ch) => ch.id} />
        {chapters.length === 0 && !loading && (
          <p className="p-4 text-gray-500">No chapters yet. Create one to get started.</p>
        )}
      </div>
    </PortalPageFrame>
  );
}
