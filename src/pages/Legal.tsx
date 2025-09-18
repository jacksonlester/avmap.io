import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

export function Legal() {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">
            Legal Notice & Privacy Policy
          </h1>

          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Legal Notice & Disclaimer
          </h2>

          <p className="mb-4">
            This website and the information it provides are offered strictly{" "}
            <strong>"as is"</strong> and <strong>"as available,"</strong>{" "}
            without any representations or warranties of any kind, express or
            implied.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            No Guarantee of Accuracy
          </h3>
          <p className="mb-4">
            The data, maps, and information presented on this website are
            compiled from various sources for informational and research
            purposes only. They may contain errors, omissions, or inaccuracies,
            may be incomplete, and may not reflect the most current conditions.
            We make no guarantees about the accuracy, completeness, reliability,
            or timeliness of the information.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Not Official or Authoritative
          </h3>
          <p className="mb-4">
            This website is not affiliated with, endorsed by, or officially
            connected to any company, agency, or organization referenced.
            Nothing on this site should be taken as an official statement or
            authoritative source.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">No Liability</h3>
          <p className="mb-4">
            By accessing or using this website, you expressly agree that your
            use is at your own risk. To the fullest extent permitted by
            applicable law, the operators of this website disclaim all liability
            for any direct, indirect, incidental, consequential, special, or
            exemplary damages or losses arising out of or in connection with the
            use of, reliance on, or inability to use the website or its data.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            No Professional Advice
          </h3>
          <p className="mb-4">
            The content is provided for general informational purposes only and
            does not constitute professional, legal, technical, or business
            advice. Users should seek independent verification or consult
            appropriate professionals before making decisions based on this
            information.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">International Use</h3>
          <p className="mb-4">
            This website is controlled and operated from the State of
            California, United States. We make no representations that the
            content is appropriate or available for use in other locations. If
            you choose to access the website from outside the United States, you
            do so at your own initiative and are responsible for compliance with
            any applicable local laws.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            User Responsibility
          </h3>
          <p className="mb-4">
            You are solely responsible for evaluating the accuracy, usefulness,
            and appropriateness of the information. Any reliance you place on
            this data is strictly at your own risk.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Reservation of Rights
          </h3>
          <p className="mb-4">
            We reserve the right to modify, update, or remove any content on
            this website at any time without notice.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Governing Law</h3>
          <p className="mb-4">
            This Legal Notice and any disputes arising from the use of this
            website shall be governed by and construed in accordance with the
            laws of the State of California and the United States of America,
            without regard to conflict of law provisions.
          </p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold mt-8 mb-4">Privacy Policy</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">Data Collection</h3>
          <p className="mb-4">
            This website does not intentionally collect personally identifiable
            information unless you voluntarily provide it (e.g., through a
            contact form, email, or feedback submission). We may use standard
            web analytics tools (such as cookies or server logs) to measure
            traffic, performance, and usage patterns.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Use of Information
          </h3>
          <p className="mb-4">Any information collected is used solely for:</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Improving website performance and usability</li>
            <li>Understanding aggregate traffic and usage trends</li>
            <li>Responding to inquiries, if you choose to contact us</li>
          </ul>
          <p className="mb-4">
            We do not sell, rent, or share personal information with third
            parties for marketing purposes.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Cookies & Analytics
          </h3>
          <p className="mb-4">
            The website may use cookies or similar technologies to improve
            functionality and collect anonymous usage statistics. You can
            disable cookies in your browser settings, though some features may
            not function as intended.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Third-Party Links</h3>
          <p className="mb-4">
            This website may contain links to external websites. We are not
            responsible for the privacy practices, content, or accuracy of
            external sites.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Data Security</h3>
          <p className="mb-4">
            While reasonable steps are taken to protect information, no method
            of transmission over the internet or method of storage is completely
            secure. We cannot guarantee absolute security.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            International Visitors
          </h3>
          <p className="mb-4">
            If you access this website from outside the United States, please be
            aware that any information you provide may be transferred to and
            stored in servers located in the United States. By using the
            website, you consent to such transfer.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Your Rights</h3>
          <p className="mb-4">
            Depending on your jurisdiction, you may have rights under privacy
            laws such as the{" "}
            <strong>California Consumer Privacy Act (CCPA)</strong> or the{" "}
            <strong>EU General Data Protection Regulation (GDPR)</strong>. These
            may include the right to request access to, correction of, or
            deletion of your personal data. To make such a request, please
            contact us at support@avmap.io.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Updates</h3>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated "Last Revised" date.
          </p>

          <hr className="my-8 border-border" />

          <p className="text-sm text-muted-foreground text-center mt-8">
            <strong>Last Revised: {today}</strong>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
