import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | BlueSix",
  description: "Terms of service for BlueSix.",
};

const LAST_UPDATED = "February 28, 2026";
const SUPPORT_EMAIL = "support@nandcore.com";

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Use of Service</h2>
          <p className="text-sm text-muted-foreground">
            By using BlueSix, you agree to use the service lawfully and
            responsibly. You are responsible for activity under your account
            and for maintaining credential security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">User Content</h2>
          <p className="text-sm text-muted-foreground">
            You retain ownership of the content you submit. You grant BlueSix a
            limited license to host, process, and display that content solely
            to operate and improve the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Acceptable Use</h2>
          <p className="text-sm text-muted-foreground">
            Do not misuse the service, interfere with platform stability,
            attempt unauthorized access, or upload unlawful content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Availability and Changes</h2>
          <p className="text-sm text-muted-foreground">
            We may update, suspend, or discontinue features at any time. We may
            also update these terms; continued use after updates means you
            accept the revised terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Disclaimer and Liability</h2>
          <p className="text-sm text-muted-foreground">
            BlueSix is provided "as is" without warranties to the fullest
            extent permitted by law. We are not liable for indirect, incidental,
            or consequential damages arising from service use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Questions about these terms can be sent to{" "}
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
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
