import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import heroImage from "@/assets/hero-dubai.jpg";
const HeroSection = () => {
  return <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="Dubai luxury skyline" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
        <div className="max-w-2xl pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-soft mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              Dubai's Premier Real Estate Consultancy
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] mb-6 animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>
            Discover
            <br />
            <span className="text-gold-gradient">Exceptional</span>
            <br />
            Properties
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg animate-fade-in" style={{
          animationDelay: "0.2s"
        }}>
            Expert real estate consultation and marketing services in Dubai. 
            We transform your property journey into a seamless experience.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{
          animationDelay: "0.3s"
        }}>
            <Button variant="premium" size="xl" asChild>
              <Link to="/contact" className="group">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="premium-outline" size="xl" asChild>
              <a href="tel:+971545304304" className="group">
                <Phone className="mr-2 h-5 w-5" />
                Call Us 
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;