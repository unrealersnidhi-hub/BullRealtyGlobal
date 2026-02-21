import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  TrendingUp,
  Megaphone,
  Settings,
  Search,
  FileText,
  Users,
  Globe,
} from "lucide-react";

const services = [
  {
    icon: Building2,
    title: "Property Consultation",
    description:
      "Expert guidance for buyers and sellers navigating Dubai's luxury property market.",
    features: [
      "Personalized property search",
      "Market analysis and valuation",
      "Due diligence support",
      "Negotiation assistance",
    ],
  },
  {
    icon: TrendingUp,
    title: "Investment Advisory",
    description:
      "Strategic investment insights to maximize returns in Dubai's dynamic real estate market.",
    features: [
      "Portfolio diversification",
      "ROI analysis",
      "Off-plan opportunities",
      "Market trend forecasting",
    ],
  },
  {
    icon: Megaphone,
    title: "Real Estate Marketing",
    description:
      "Premium marketing campaigns that showcase your property to qualified global buyers.",
    features: [
      "Professional photography",
      "Virtual tours and 3D rendering",
      "Digital marketing campaigns",
      "International exposure",
    ],
  },
  {
    icon: Settings,
    title: "Property Management",
    description:
      "Comprehensive management services to protect and enhance your property investment.",
    features: [
      "Tenant screening",
      "Rent collection",
      "Maintenance coordination",
      "Financial reporting",
    ],
  },
];

const process = [
  {
    icon: Search,
    step: "01",
    title: "Discovery",
    description: "We understand your goals, preferences, and requirements through detailed consultation.",
  },
  {
    icon: FileText,
    step: "02",
    title: "Strategy",
    description: "We develop a tailored approach based on market analysis and your specific needs.",
  },
  {
    icon: Users,
    step: "03",
    title: "Execution",
    description: "Our team implements the strategy with precision, keeping you informed at every step.",
  },
  {
    icon: Globe,
    step: "04",
    title: "Success",
    description: "We ensure a smooth closing and provide ongoing support for your continued success.",
  },
];

const Services = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                Our Services
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mt-4 mb-6">
                Comprehensive Real Estate Solutions
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                From consultation to closing, we provide end-to-end services 
                tailored to your unique property needs in Dubai's luxury market.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="bg-background rounded-2xl p-8 md:p-10 card-hover"
                >
                  <div className="w-16 h-16 rounded-xl bg-accent-soft flex items-center justify-center mb-6">
                    <service.icon className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{service.title}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-3">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                Our Process
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4 mb-6">
                How We Work
              </h2>
              <p className="text-muted-foreground text-lg">
                A streamlined approach designed to deliver exceptional results 
                with transparency and efficiency.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {process.map((step, index) => (
                <div key={step.step} className="relative">
                  {index < process.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-1/2 w-full h-px bg-border" />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl font-semibold text-gold">{step.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Let's Discuss Your Needs
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-10">
              Every client is unique. Contact us for a personalized consultation 
              and discover how we can help you achieve your real estate goals.
            </p>
            <Button variant="gold" size="xl" asChild>
              <Link to="/contact">
                Schedule a Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
