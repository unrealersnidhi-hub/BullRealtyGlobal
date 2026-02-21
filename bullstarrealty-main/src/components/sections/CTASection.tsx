import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";

const CTASection = () => {
  return (
    <section className="section-padding">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-charcoal p-12 md:p-16 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <span className="inline-block px-4 py-2 rounded-full bg-gold/10 text-gold text-sm font-medium mb-6">
              Ready to Start?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-primary-foreground mb-6">
              Let's Find Your Perfect Property
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-10">
              Whether you're looking to buy, sell, or invest, our team of experts 
              is ready to guide you through every step of the journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gold" size="xl" asChild>
                <Link to="/contact">
                  Schedule Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <a href="tel:+971545304304">
                  <Phone className="mr-2 h-5 w-5" />
                  +971 545304304
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
