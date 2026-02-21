import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Users, Target, Shield } from "lucide-react";
const values = [{
  icon: Award,
  title: "Excellence",
  description: "Uncompromising quality in every interaction."
}, {
  icon: Users,
  title: "Client Focus",
  description: "Your goals drive our strategy and execution."
}, {
  icon: Target,
  title: "Results Driven",
  description: "Measurable outcomes that exceed expectations."
}, {
  icon: Shield,
  title: "Integrity",
  description: "Transparency and honesty in all dealings."
}];
const AboutSection = () => {
  return <section className="section-padding bg-primary text-primary-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <span className="text-sm font-medium text-gold uppercase tracking-wider">
              About Us
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mt-4 mb-6">
              Your Trusted Partner in Dubai Real Estate
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed mb-8">Dubai's luxury property market, Bull Star Realty has established itself as the go-to consultancy for discerning buyers, sellers, and investors seeking exceptional results.</p>
            <p className="text-primary-foreground/70 leading-relaxed mb-10">
              Our team of certified professionals combines deep market knowledge with 
              innovative marketing strategies to deliver unparalleled service. We don't 
              just close deals – we build lasting relationships founded on trust and 
              mutual success.
            </p>
            <Button variant="gold" size="lg" asChild>
              <Link to="/about">
                Learn More About Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-6">
            {values.map((value, index) => <div key={value.title} className="p-6 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-primary-foreground/60 text-sm">
                  {value.description}
                </p>
              </div>)}
          </div>
        </div>
      </div>
    </section>;
};
export default AboutSection;