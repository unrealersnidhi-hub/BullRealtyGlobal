import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/sections/HeroSection";
import AboutBriefSection from "@/components/sections/AboutBriefSection";
import ServicesSection from "@/components/sections/ServicesSection";
import TeamSection from "@/components/sections/TeamSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import CTASection from "@/components/sections/CTASection";
import SubscribeSection from "@/components/sections/SubscribeSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AboutBriefSection />
        <ServicesSection />
        <TeamSection />
        <TestimonialsSection />
        <SubscribeSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
