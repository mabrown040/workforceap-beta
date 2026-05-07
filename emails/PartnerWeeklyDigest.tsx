import { Button, Text, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface PartnerWeeklyDigestProps {
  partnerName?: string;
  weekEndingDate?: string;
  stats?: {
    enrolled: number;
    inTraining: number;
    certified: number;
    hired: number;
  };
  dashboardUrl?: string;
}

export default function PartnerWeeklyDigest({
  partnerName = "Community Action Org",
  weekEndingDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  stats = {
    enrolled: 12,
    inTraining: 8,
    certified: 3,
    hired: 1,
  },
  dashboardUrl = "https://www.workforceap.org/partner/dashboard",
}: PartnerWeeklyDigestProps) {
  const previewText = `Your weekly cohort digest for the week ending ${weekEndingDate}.`;

  return (
    <Layout previewText={previewText}>
      <Text style={h1}>Weekly Cohort Digest</Text>
      <Text style={text}>Hi {partnerName},</Text>
      <Text style={text}>
        Here is a quick snapshot of how your referred candidates are progressing through the Workforce Advancement Project for the week ending <strong>{weekEndingDate}</strong>.
      </Text>
      
      <Section style={statsGrid}>
        <Row style={statRow}>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.enrolled}</Text>
            <Text style={statLabel}>Total Enrolled</Text>
          </Column>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.inTraining}</Text>
            <Text style={statLabel}>In Training</Text>
          </Column>
        </Row>
        <Row style={statRow}>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.certified}</Text>
            <Text style={statLabel}>Certified</Text>
          </Column>
          <Column style={statColumn}>
            <Text style={statNumber}>{stats.hired}</Text>
            <Text style={statLabel}>Hired</Text>
          </Column>
        </Row>
      </Section>

      <Text style={text}>
        For a full breakdown of individual progress, course completions, and current pipeline stages, log in to your partner dashboard.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href={dashboardUrl}>
          View Full Report
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

const statsGrid = {
  backgroundColor: "#fef8f9",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const statRow = {
  marginBottom: "16px",
};

const statColumn = {
  width: "50%",
  textAlign: "center" as const,
};

const statNumber = {
  color: "#ad2c4d",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0 0 4px",
};

const statLabel = {
  color: "#666666",
  fontSize: "14px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0",
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
