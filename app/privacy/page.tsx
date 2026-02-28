import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BlueSix",
  description: "Privacy policy for BlueSix.",
};

const LAST_UPDATED = "February 28, 2026";
const SUPPORT_EMAIL = "support@nandcore.com";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What We Collect</h2>
          <p className="text-sm text-muted-foreground">
            We collect account details (such as email and username), content
            you create in the app (organizations, workspaces, categories, and
            resources), and operational data like request metadata and security
            logs needed to protect and run the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">How We Use Data</h2>
          <p className="text-sm text-muted-foreground">
            We use your data to provide core product functionality, authenticate
            users, prevent abuse, troubleshoot incidents, and improve product
            reliability and performance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Data Sharing</h2>
          <p className="text-sm text-muted-foreground">
            We do not sell personal data. We may share data with infrastructure
            and service providers only as needed to operate BlueSix (for
            example, hosting, email delivery, and monitoring services).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Retention</h2>
          <p className="text-sm text-muted-foreground">
            We retain data while your account is active and as needed for
            security, legal, and operational requirements. You can request
            account deletion by contacting support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">
            We apply reasonable technical and organizational safeguards, but no
            method of storage or transmission is fully guaranteed secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            For privacy requests or questions, contact{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Also review our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
