import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import Layout from "./Layout";

interface CourseCompletedProps {
  memberName?: string;
  courseName?: string;
  credentialName?: string;
  nextStepsUrl?: string;
}

export default function CourseCompleted({
  memberName = "Alex",
  courseName = "Cybersecurity Fundamentals",
  credentialName = "CompTIA Security+",
  nextStepsUrl = "https://www.workforceap.org/member/dashboard",
}: CourseCompletedProps) {
  const previewText = `Congratulations on completing ${courseName}!`;

  return (
    <Layout previewText={previewText}>
      <Text style={h1}>Congratulations, {memberName}! 🎉</Text>
      <Text style={text}>
        You have successfully completed <strong>{courseName}</strong>! All of your hard work has paid off, and you are one step closer to achieving your career goals.
      </Text>
      
      {credentialName && (
        <Section style={highlightBox}>
          <Text style={highlightTitle}>Credential Earned</Text>
          <Text style={highlightText}>{credentialName}</Text>
        </Section>
      )}

      <Text style={text}>
        Make sure to update your profile with your new skills. This will help us match you with employers who are actively looking for candidates with your qualifications.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href={nextStepsUrl}>
          Update My Profile
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

const highlightBox = {
  backgroundColor: "#fef8f9",
  border: "1px solid #f3d5dc",
  padding: "20px",
  margin: "24px 0",
  borderRadius: "6px",
  textAlign: "center" as const,
};

const highlightTitle = {
  color: "#ad2c4d",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
};

const highlightText = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: "700",
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
