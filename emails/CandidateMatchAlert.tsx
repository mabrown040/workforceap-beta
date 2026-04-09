import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface CandidateMatchAlertProps {
  employerName?: string;
  jobTitle?: string;
  matchCount?: number;
  viewMatchesUrl?: string;
}

export default function CandidateMatchAlert({
  employerName = "Hiring Manager",
  jobTitle = "Network Technician",
  matchCount = 3,
  viewMatchesUrl = "https://www.workforceap.org/employer/matches",
}: CandidateMatchAlertProps) {
  const previewText = `Great news! ${matchCount} new certified candidates match your ${jobTitle} role.`;

  return (
    <Layout previewText={previewText}>
      <Text style={h1}>New Candidates Match Your Role!</Text>
      <Text style={text}>Hi {employerName},</Text>
      <Text style={text}>
        Good news! We have <strong>{matchCount}</strong> newly certified candidates whose skills and credentials match your open <strong>{jobTitle}</strong> role.
      </Text>
      <Text style={text}>
        Log in to your employer dashboard to review their profiles, check their certifications, and reach out to schedule an interview.
      </Text>
      <Section style={btnContainer}>
        <Button style={button} href={viewMatchesUrl}>
          Review Candidates
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
