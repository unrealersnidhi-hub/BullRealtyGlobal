import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const AboutBriefSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-sm font-medium text-gold uppercase tracking-wider">
          About Bull Star Realty
        </span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mt-4 mb-6">
          Your Gateway to Dubai's Finest Properties
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
          With years of experience in Dubai's dynamic real estate market, Bull Star Realty 
          has established itself as a trusted partner for discerning buyers, sellers, and investors. 
          Our team of certified professionals combines deep market knowledge with personalized 
          service to deliver exceptional results.
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link to="/about">
            Learn More About Us
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default AboutBriefSection;
