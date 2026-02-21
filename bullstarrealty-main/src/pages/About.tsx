import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Users, Target, Shield, CheckCircle, Calendar, Clock, User } from "lucide-react";
const values = [{
  icon: Award,
  title: "Excellence",
  description: "We set the highest standards in everything we do, from client interactions to property presentations."
}, {
  icon: Users,
  title: "Client-Centric",
  description: "Your goals and preferences guide our every decision. We listen, understand, and deliver."
}, {
  icon: Target,
  title: "Results Driven",
  description: "We measure our success by yours. Tangible outcomes and exceeded expectations define us."
}, {
  icon: Shield,
  title: "Integrity",
  description: "Transparency and honesty form the foundation of every relationship we build."
}];
const teamMembers = [{
  name: "Ahmad Al-Rashid",
  role: "Founder & CEO",
  bio: "15+ years in Dubai real estate with expertise in luxury property investments.",
  image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face"
}, {
  name: "Sarah Mitchell",
  role: "Head of Sales",
  bio: "Specialist in waterfront and premium residential properties across Dubai.",
  image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face"
}, {
  name: "Omar Hassan",
  role: "Senior Property Consultant",
  bio: "Expert in off-plan investments and Dubai Marina developments.",
  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
}, {
  name: "Fatima Al-Maktoum",
  role: "Client Relations Manager",
  bio: "Dedicated to ensuring exceptional client experiences throughout the buying journey.",
  image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face"
}];
const blogPosts = [{
  title: "Dubai Real Estate: A Beacon of Investment in 2025",
  excerpt: "Dubai continues to solidify its position as a global hub for real estate investment. With its futuristic skyline, luxurious lifestyle, and robust economic growth, the emirate offers diverse property options from opulent beachfront villas to sleek urban apartments.",
  date: "January 15, 2025",
  readTime: "5 min read",
  category: "Market Insights"
}, {
  title: "Top Emerging Neighborhoods for Property Investment",
  excerpt: "Beyond the established hotspots of Palm Jumeirah and Downtown Dubai, emerging areas like Dubai South, JVC, and Dubai Creek Harbour are attracting savvy investors with competitive prices and strong appreciation potential.",
  date: "January 10, 2025",
  readTime: "4 min read",
  category: "Investment Tips"
}, {
  title: "Understanding Golden Visa Through Property Investment",
  excerpt: "The UAE's Golden Visa program offers long-term residency for property investors. Learn about the AED 2 million threshold, eligible property types, and the application process that makes Dubai an attractive destination for global citizens.",
  date: "January 5, 2025",
  readTime: "6 min read",
  category: "Guides"
}];
const About = () => {
  return <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                About Us
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mt-4 mb-6">
                Dubai's Most Trusted Real Estate Consultancy
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">Bull Star Realty has been guiding clients through Dubai's dynamic real estate landscape with expertise, integrity, and unparalleled service.</p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-sm font-medium text-gold uppercase tracking-wider">
                  Our Story
                </span>
                <h2 className="text-3xl md:text-4xl font-semibold mt-4 mb-6">Building Dreams Since 2025</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">Founded in the heart of Dubai, Bull Star Realty was born from a simple vision: to transform how people experience real estate. What started as a boutique consultancy has grown into one of the region's most respected property firms.</p>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Our growth has been driven by an unwavering commitment to our 
                  clients. We've navigated market cycles, embraced innovation, and 
                  consistently delivered exceptional results. Today, we serve a 
                  global clientele seeking the finest properties Dubai has to offer.
                </p>
                <ul className="space-y-3">
                  {["RERA Certified Professionals", "International Network of Partners", "Award-Winning Marketing Team", "Dedicated After-Sales Support"].map(item => <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-gold shrink-0" />
                      <span>{item}</span>
                    </li>)}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                  <img alt="Dubai cityscape" className="w-full h-full object-cover" src="/uploads/38ba0f06-ba38-4980-a85f-29e80ca552fc.jpg" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        

        {/* Values */}
        <section className="section-padding bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                Our Values
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4">
                Principles That Guide Us
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map(value => <div key={value.title} className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10">
                  <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-6">
                    <value.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-primary-foreground/70 leading-relaxed">
                    {value.description}
                  </p>
                </div>)}
            </div>
          </div>
        </section>

        {/* Blog/Insights Section */}
        <section className="section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-sm font-medium text-gold uppercase tracking-wider">
                Market Insights
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4 mb-4">
                Dubai Real Estate Blog
              </h2>
              <p className="text-muted-foreground">
                Stay informed with the latest trends, investment opportunities, and expert analysis of Dubai's thriving property market.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map(post => <article key={post.title} className="group bg-card rounded-2xl overflow-hidden border border-border card-hover">
                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-xs font-medium text-gold bg-gold/10 px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-gold transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </article>)}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-secondary/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Ready to Work With Us?
            </h2>
            <p className="text-muted-foreground text-lg mb-10">Experience the Bull Star Realty difference. Let's discuss your real estate goals and create a tailored strategy for success.</p>
            <Button variant="premium" size="xl" asChild>
              <Link to="/contact">
                Get in Touch
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>;
};
export default About;
