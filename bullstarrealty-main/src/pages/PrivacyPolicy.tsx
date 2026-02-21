import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-primary-foreground/70">
              Last updated: {new Date().toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-6">
                Bull Star Realty ("Company", "we", "our", "us") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information in compliance with UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL) and other applicable data protection regulations in the United Arab Emirates and the Emirate of Dubai.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Data Controller</h2>
              <p className="text-muted-foreground mb-6">
                Bull Star Realty, located at Business Bay, Dubai, UAE, is the data controller responsible for your personal data. For any privacy-related inquiries, please contact us at support@bullstarrealty.ae or +971 545304304.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect the following categories of personal data:
              </p>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                <li>Full name and title</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Property preferences and requirements</li>
                <li>Investment budget and financial capacity (where applicable)</li>
                <li>Emirates ID or passport details (for KYC compliance in transactions)</li>
                <li>Communication records with our team</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3">3.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent on our website</li>
                <li>Referral source</li>
                <li>Cookie data (see Section 9)</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Legal Basis for Processing</h2>
              <p className="text-muted-foreground mb-4">
                Under UAE PDPL, we process your personal data based on the following legal grounds:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li><strong>Consent:</strong> When you submit inquiries or subscribe to our newsletter</li>
                <li><strong>Contractual Necessity:</strong> To provide real estate services you have requested</li>
                <li><strong>Legal Obligation:</strong> To comply with AML/KYC requirements and RERA regulations</li>
                <li><strong>Legitimate Interests:</strong> To improve our services and maintain business relationships</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">5. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                Your personal data is used for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>Responding to property inquiries and providing consultation services</li>
                <li>Matching you with suitable properties based on your requirements</li>
                <li>Processing real estate transactions in accordance with Dubai Land Department procedures</li>
                <li>Conducting due diligence and KYC checks as required by UAE regulations</li>
                <li>Sending property updates and market insights (with your consent)</li>
                <li>Improving our website and services</li>
                <li>Complying with legal and regulatory obligations</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Sharing & Disclosure</h2>
              <p className="text-muted-foreground mb-4">
                We may share your personal data with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li><strong>Dubai Land Department (DLD):</strong> For property registration and transfer purposes</li>
                <li><strong>Real Estate Regulatory Agency (RERA):</strong> For regulatory compliance</li>
                <li><strong>Financial Institutions:</strong> For mortgage processing (with your consent)</li>
                <li><strong>Legal Advisors:</strong> For transaction documentation and due diligence</li>
                <li><strong>Government Authorities:</strong> When required by UAE law or court order</li>
                <li><strong>Service Providers:</strong> Third-party vendors who assist in website hosting and analytics (under strict data processing agreements)</li>
              </ul>
              <p className="text-muted-foreground mb-6">
                We do not sell your personal data to third parties.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground mb-6">
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, or as required by UAE law. For completed real estate transactions, records are retained for a minimum of 5 years in accordance with RERA requirements. Contact inquiries and marketing data are retained for 2 years from the last interaction, unless you request deletion earlier.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Your Rights Under UAE PDPL</h2>
              <p className="text-muted-foreground mb-4">
                Under the UAE Personal Data Protection Law, you have the following rights:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing in certain circumstances</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or for marketing purposes</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time for processing based on consent</li>
              </ul>
              <p className="text-muted-foreground mb-6">
                To exercise these rights, please contact us at support@bullstarrealty.ae. We will respond to your request within 14 days as required by UAE PDPL.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Cookies & Tracking Technologies</h2>
              <p className="text-muted-foreground mb-4">
                Our website uses cookies and similar technologies to enhance your browsing experience. Types of cookies we use:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for website functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with consent)</li>
              </ul>
              <p className="text-muted-foreground mb-6">
                You can manage cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Data Security</h2>
              <p className="text-muted-foreground mb-6">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include encrypted data transmission (SSL/TLS), secure data storage, access controls, and regular security assessments. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">11. International Data Transfers</h2>
              <p className="text-muted-foreground mb-6">
                Your personal data is primarily processed and stored within the UAE. If we transfer data outside the UAE, we ensure appropriate safeguards are in place as required by UAE PDPL, including data processing agreements with adequate protection standards.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Children's Privacy</h2>
              <p className="text-muted-foreground mb-6">
                Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal data from children. If you become aware that a child has provided us with personal data, please contact us immediately.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to This Policy</h2>
              <p className="text-muted-foreground mb-6">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The updated policy will be posted on our website with a revised "Last updated" date. We encourage you to review this policy periodically.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">14. Complaints</h2>
              <p className="text-muted-foreground mb-6">
                If you have concerns about how we handle your personal data, please contact us first at support@bullstarrealty.ae. If you are not satisfied with our response, you have the right to lodge a complaint with the UAE Data Office or other relevant regulatory authority.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                For any questions or requests regarding this Privacy Policy or your personal data, please contact us:
              </p>
              <div className="bg-secondary/50 rounded-xl p-6 mb-6">
                <p className="text-foreground font-semibold mb-2">Bull Star Realty - Data Protection</p>
                <p className="text-muted-foreground">Business Bay, Dubai, UAE</p>
                <p className="text-muted-foreground">Phone: +971 545304304</p>
                <p className="text-muted-foreground">Email: support@bullstarrealty.ae</p>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
