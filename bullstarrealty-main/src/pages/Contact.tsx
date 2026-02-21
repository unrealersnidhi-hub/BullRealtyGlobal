import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LeadForm from "@/components/LeadForm";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const contactInfo = [
  {
    icon: MapPin,
    title: "Visit Us",
    lines: ["Business Bay, Dubai", "United Arab Emirates"],
  },
  {
    icon: Phone,
    title: "Call Us",
    lines: ["+971 545304304"],
  },
  {
    icon: Mail,
    title: "Email Us",
    lines: ["support@bullstarrealty.ae"],
  },
  {
    icon: Clock,
    title: "Working Hours",
    lines: ["Mon - Fri: 9:00 AM - 6:00 PM", "Sat: 10:00 AM - 4:00 PM"],
  },
];

const Contact = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-12 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                Contact Us
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mt-4 mb-6">
                Let's Start a Conversation
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Ready to explore Dubai's luxury real estate market? Get in touch 
                with our team for personalized guidance and expert advice.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Grid */}
        <section className="section-padding pt-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              {/* Contact Info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Whether you're looking to buy, sell, or invest, our team is 
                    here to help. Reach out through any of the channels below.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  {contactInfo.map((info) => (
                    <div
                      key={info.title}
                      className="flex gap-4 p-5 rounded-xl bg-secondary/50"
                    >
                      <div className="w-12 h-12 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                        <info.icon className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{info.title}</h3>
                        {info.lines.map((line) => (
                          <p key={line} className="text-sm text-muted-foreground">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-2xl p-8 md:p-10 shadow-lg border border-border">
                  <h2 className="text-2xl font-semibold mb-2">Send us a Message</h2>
                  <p className="text-muted-foreground mb-8">
                    Fill out the form below and we'll get back to you within 24 hours.
                  </p>
                  <LeadForm source="contact-page" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="section-padding bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl overflow-hidden aspect-[21/9] bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.178509046852!2d55.2597!3d25.1865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f682829c85c07%3A0xa5eda9fb3c93b69d!2sBusiness%20Bay%20-%20Dubai%20-%20United%20Arab%20Emirates!5e0!3m2!1sen!2sus!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Elite Properties Location"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
