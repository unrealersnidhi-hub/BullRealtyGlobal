import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Terms & Conditions
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
                Welcome to Bull Star Realty ("Company", "we", "our", "us"). These Terms and Conditions govern your use of our website located at bullstarrealty.ae and our real estate services. By accessing our website or using our services, you agree to be bound by these Terms and Conditions in accordance with the laws of the United Arab Emirates and the Emirate of Dubai.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Company Information</h2>
              <p className="text-muted-foreground mb-6">
                Bull Star Realty is a licensed real estate brokerage operating in the Emirate of Dubai, United Arab Emirates. We are registered with the Dubai Land Department (DLD) and operate in compliance with the Real Estate Regulatory Agency (RERA) regulations. Our office is located in Business Bay, Dubai, UAE.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Services</h2>
              <p className="text-muted-foreground mb-4">
                Bull Star Realty provides the following real estate services:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>Property buying and selling consultation</li>
                <li>Real estate investment advisory</li>
                <li>Property marketing services</li>
                <li>Property valuation and market analysis</li>
                <li>Rental and leasing assistance</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">4. User Obligations</h2>
              <p className="text-muted-foreground mb-4">
                By using our website and services, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>Provide accurate and complete information when making inquiries or engaging our services</li>
                <li>Use our services only for lawful purposes</li>
                <li>Not engage in any fraudulent or deceptive activities</li>
                <li>Comply with all applicable UAE federal laws and Dubai local regulations</li>
                <li>Respect intellectual property rights of Bull Star Realty</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Property Listings & Information</h2>
              <p className="text-muted-foreground mb-6">
                While we strive to ensure the accuracy of all property information provided on our website, Bull Star Realty does not warrant or guarantee the completeness, accuracy, or reliability of any property listings, prices, or descriptions. Property details, availability, and pricing are subject to change without notice. All property transactions are subject to verification and due diligence in accordance with Dubai Land Department regulations.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Regulatory Compliance</h2>
              <p className="text-muted-foreground mb-4">
                All real estate transactions facilitated by Bull Star Realty are conducted in compliance with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>UAE Federal Law No. 5 of 1985 (Civil Transactions Law)</li>
                <li>Dubai Law No. 7 of 2006 concerning Land Registration</li>
                <li>Dubai Law No. 13 of 2008 regulating the Interim Property Register</li>
                <li>RERA regulations and guidelines</li>
                <li>Anti-Money Laundering (AML) requirements as per UAE Central Bank regulations</li>
                <li>Know Your Customer (KYC) requirements</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Commission & Fees</h2>
              <p className="text-muted-foreground mb-6">
                Real estate brokerage commission rates are subject to RERA guidelines. Standard commission rates in Dubai are typically 2% of the property value for sales and 5% of annual rent for leasing transactions. Specific fees and commissions will be disclosed and agreed upon in writing before any transaction is initiated. All fees are subject to applicable VAT as per UAE Federal Tax Authority regulations.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
              <p className="text-muted-foreground mb-6">
                All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Bull Star Realty and is protected by UAE intellectual property laws and international copyright treaties. Unauthorized reproduction, distribution, or use of any content is strictly prohibited.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-6">
                To the maximum extent permitted by UAE law, Bull Star Realty shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our website or services. Our total liability for any claim shall not exceed the amount of fees paid by you for our services.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Dispute Resolution</h2>
              <p className="text-muted-foreground mb-6">
                Any disputes arising from these Terms and Conditions or related to our services shall be resolved through the following process: (1) Amicable negotiation between parties; (2) Mediation through the Dubai Real Estate Disputes Centre (REDC) if applicable; (3) Arbitration or litigation in the courts of Dubai, UAE. These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates and the Emirate of Dubai.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Amendments</h2>
              <p className="text-muted-foreground mb-6">
                Bull Star Realty reserves the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. Continued use of our website or services after any modifications constitutes acceptance of the updated Terms.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground mb-4">
                For any questions regarding these Terms and Conditions, please contact us at:
              </p>
              <div className="bg-secondary/50 rounded-xl p-6 mb-6">
                <p className="text-foreground font-semibold mb-2">Bull Star Realty</p>
                <p className="text-muted-foreground">Business Bay, Dubai, UAE</p>
                <p className="text-muted-foreground">Phone: +971 545304304</p>
                <p className="text-muted-foreground">Email: support@bullstarrealty.ae</p>
              </div>

              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Language</h2>
              <p className="text-muted-foreground mb-6">
                These Terms and Conditions are drafted in English. In case of any discrepancy between the English version and any translated version, the English version shall prevail. However, for official legal proceedings in the UAE, an Arabic translation may be required.
              </p>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;
