import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Linkedin, Facebook } from "lucide-react";
const Footer = () => {
  return <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="inline-block">
              <img src="/assets/logo.png" alt="Bull Star Realty" className="h-12 w-auto brightness-0 invert" />
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Your trusted partner in Dubai's luxury real estate market. 
              Expert consultation and marketing services.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/bullstarrealty/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/bull-star-realty-7927413a8/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[{
              name: "About Us",
              path: "/about"
            }, {
              name: "Services",
              path: "/services"
            }, {
              name: "Contact",
              path: "/contact"
            }, {
              name: "Admin Portal",
              path: "/admin"
            }].map(link => <li key={link.path}>
                  <Link to={link.path} className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-6">
              Services
            </h4>
            <ul className="space-y-3">
              {["Property Consultation", "Real Estate Marketing", "Investment Advisory", "Property Management"].map(service => <li key={service}>
                  <span className="text-primary-foreground/70 text-sm">
                    {service}
                  </span>
                </li>)}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-6">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <span className="text-primary-foreground/70 text-sm">
                  Business Bay, Dubai, UAE
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gold shrink-0" />
                <a href="tel:+97142345678" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">+971 545304304</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gold shrink-0" />
                <a href="mailto:info@eliteproperties.ae" className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">support@bullstarrealty.ae</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-foreground/50 text-sm">
              © {new Date().getFullYear()} Bull Star Realty. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-primary-foreground/50 hover:text-primary-foreground text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-primary-foreground/50 hover:text-primary-foreground text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;