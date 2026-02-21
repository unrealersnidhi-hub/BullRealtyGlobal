import { Building2, TrendingUp, Megaphone, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
const services = [{
  icon: Building2,
  title: "Property Consultation",
  description: "Expert guidance through every step of buying or selling premium Dubai real estate."
}, {
  icon: TrendingUp,
  title: "Investment Advisory",
  description: "Strategic investment insights to maximize returns in Dubai's dynamic property market."
}, {
  icon: Megaphone,
  title: "Real Estate Marketing",
  description: "Premium marketing campaigns that showcase your property to qualified global buyers."
}, {
  icon: Settings,
  title: "Property Management",
  description: "Comprehensive management services to protect and enhance your property investment."
}];
const ServicesSection = () => {
  return <section className="section-padding bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-gold uppercase tracking-wider">
            Our Expertise
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mt-4 mb-6">
            Comprehensive Real Estate Solutions
          </h2>
          <p className="text-muted-foreground text-lg">
            From consultation to closing, we provide end-to-end services 
            tailored to your unique property needs.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => <div key={service.title} className="group bg-background rounded-2xl p-8 card-hover cursor-pointer text-center" style={{
          animationDelay: `${index * 0.1}s`
        }}>
              <div className="w-14 h-14 rounded-xl bg-accent-soft flex items-center justify-center mb-6 group-hover:bg-gold transition-colors duration-300 mx-auto">
                <service.icon className="w-7 h-7 text-gold group-hover:text-charcoal transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6 text-center">
                {service.description}
              </p>
              <Link to="/services" className="inline-flex items-center text-sm font-medium text-gold group-hover:gap-2 transition-all">
                Learn More
                <ArrowRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            </div>)}
        </div>
      </div>
    </section>;
};
export default ServicesSection;