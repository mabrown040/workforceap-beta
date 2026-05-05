import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface NewApplicationAlertProps {
  counselorName?: string;
  applicantName?: string;
  applicantEmail?: string;
  submittedDate?: string;
  reviewUrl?: string;
}

export default function NewApplicationAlert({
  counselorName = "Admin",
  applicantName = "Jane Doe",
  applicantEmail = "jane.doe@example.com",
  submittedDate = new Date().toLocaleDateString('en-US'),
  reviewUrl = "https://www.workforceap.org/admin/applications",
}: NewApplicationAlertProps) {
  const previewText = `Action Required: New application received from ${applicantName}.`;

  return (
    <Layout previewText={previewText}>
      <Text style={h1}>New Member Application</Text>
      <Text style={text}>Hi {counselorName},</Text>
      <Text style={text}>
        A new candidate has just submitted their application to join the Workforce Advancement Project. Please review their profile to initiate the enrollment process.
      </Text>
      
      <Section style={detailsBox}>
        <Text style={detailsRow}><strong>Name:</strong> {applicantName}</Text>
        <Text style={detailsRow}><strong>Email:</strong> {applicantEmail}</Text>
        <Text style={detailsRow}><strong>Date Submitted:</strong> {submittedDate}</Text>
      </Section>

      <Section style={btnContainer}>
        <Button style={button} href={reviewUrl}>
          Review Application
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

const detailsBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  padding: "16px 20px",
  margin: "24px 0",
  borderRadius: "6px",
};

const detailsRow = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 8px",
};

const btnContainer = {
  margin: "32px 0 24px",
};

const button = {
  backgroundColor: "#C41E3A",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 24px",
  fontWeight: "500",
};
