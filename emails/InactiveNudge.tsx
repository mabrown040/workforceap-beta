import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface InactiveNudgeProps {
  memberName?: string;
  daysInactive?: number;
  currentCourse?: string;
  resumeUrl?: string;
}

export default function InactiveNudge({
  memberName = "Alex",
  daysInactive = 7,
  currentCourse = "Cybersecurity Fundamentals",
  resumeUrl = "https://www.workforceap.org/member/learning",
}: InactiveNudgeProps) {
  const previewText = "We miss you! Ready to jump back into your training?";

  return (
    <Layout previewText={previewText}>
      <Text style={h1}>Let's keep the momentum going!</Text>
      <Text style={text}>Hi {memberName},</Text>
      <Text style={text}>
        We noticed you haven't logged in for about {daysInactive} days. We know life gets busy, but consistent progress is the key to finishing your certification and landing your next big role.
      </Text>
      
      {currentCourse && (
        <Text style={text}>
          You were making great progress in <strong>{currentCourse}</strong>. Ready to pick up right where you left off?
        </Text>
      )}

      <Section style={btnContainer}>
        <Button style={button} href={resumeUrl}>
          Resume My Training
        </Button>
      </Section>

      <Text style={text}>
        If you're stuck or need help navigating the coursework, please reach out. Our counselors are here to support you!
      </Text>
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
