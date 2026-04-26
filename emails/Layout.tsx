import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  previewText: string;
  children: React.ReactNode;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.workforceap.org";
const logoUrl = 'https://www.workforceap.org/images/logo-tight.png';

export default function Layout({ previewText, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Link href={baseUrl}>
              <Img
                src={logoUrl}
                width="180"
                alt="Workforce Advancement Project"
                style={logo}
              />
            </Link>
          </Section>
          
          <Section style={content}>
            {children}
            
            <Hr style={hr} />
            <Text style={footer}>
              Workforce Advancement Project &middot; Free Career Training &amp; Job Support
            </Text>
            <Text style={footerLink}>
              <Link href={baseUrl} style={{ color: "#ad2c4d" }}>
                workforceap.org
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

const header = {
  // Using the brand gradient from tailwind.config.ts but hardcoded colors
  // Primary: #1a1a1a, Accent Dark: #8b1f38
  background: "linear-gradient(135deg, #1a1a1a 0%, #2a0a14 50%, #8b1f38 100%)",
  padding: "24px 32px",
  borderRadius: "8px 8px 0 0",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
  display: "block",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "32px",
  border: "1px solid #e5e5e5",
  borderTop: "none",
  borderRadius: "0 0 8px 8px",
};

const hr = {
  borderColor: "#eeeeee",
  margin: "32px 0 16px",
};

const footer = {
  color: "#888888",
  fontSize: "14px",
  margin: "0",
  lineHeight: "24px",
};

const footerLink = {
  margin: "4px 0 0",
  fontSize: "13px",
};
