import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface JobPostingStatusProps {
  employerName?: string;
  jobTitle?: string;
  status?: "approved" | "rejected" | "submitted";
  feedback?: string;
  actionUrl?: string;
}

export default function JobPostingStatus({
  employerName = "Hiring Manager",
  jobTitle = "Network Technician",
  status = "approved",
  feedback = "",
  actionUrl = "https://www.workforceap.org/employer/jobs",
}: JobPostingStatusProps) {
  const statusContent = {
    approved: {
      preview: `Your job posting for ${jobTitle} is now live!`,
      title: "Job Posting Live",
      message: `Your recent job posting for ${jobTitle} has been reviewed and approved. It is now visible to all our certified members and partners.`,
      button: "View Job Listing",
    },
    rejected: {
      preview: `Update required for your ${jobTitle} job posting.`,
      title: "Job Posting Update Required",
      message: `We reviewed your job posting for ${jobTitle}, but we need a few updates before it can go live.`,
      button: "Edit Job Posting",
    },
    submitted: {
      preview: `We received your job posting for ${jobTitle}.`,
      title: "Job Posting Received",
      message: `Thank you for submitting your job posting for ${jobTitle}. Our team is reviewing the details and will notify you as soon as it goes live.`,
      button: "View Dashboard",
    },
  };

  const content = statusContent[status];

  return (
    <Layout previewText={content.preview}>
      <Text style={h1}>{content.title}</Text>
      <Text style={text}>Hi {employerName},</Text>
      <Text style={text}>{content.message}</Text>
      
      {status === "rejected" && feedback && (
        <Section style={feedbackBox}>
          <Text style={feedbackText}><strong>Reviewer Feedback:</strong></Text>
          <Text style={feedbackText}>{feedback}</Text>
        </Section>
      )}

      <Section style={btnContainer}>
        <Button style={button} href={actionUrl}>
          {content.button}
        </Button>
      </Section>
    </Layout>
  );
}

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 24px",
};

const text = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const feedbackBox = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ad2c4d",
  padding: "16px",
  margin: "24px 0",
  borderRadius: "0 4px 4px 0",
};

const feedbackText = {
  color: "#991b1b",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 8px",
};

const btnContainer = {
  margin: "32px 0 24px",
};

const button = {
  backgroundColor: "#ad2c4d",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 24px",
  fontWeight: "500",
};
