import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah Al-Rashid",
    role: "Property Investor",
    content:
      "Elite Properties made our investment journey seamless. Their market insights and professional approach helped us secure a prime property in Downtown Dubai with exceptional ROI.",
  },
  {
    id: 2,
    name: "James Mitchell",
    role: "Homeowner",
    content:
      "The team's attention to detail and personalized service exceeded our expectations. They found us our dream home in Palm Jumeirah and handled every aspect of the transaction flawlessly.",
  },
  {
    id: 3,
    name: "Fatima Hassan",
    role: "Developer",
    content:
      "As a developer, I've worked with many agencies. Elite Properties stands out for their marketing expertise and ability to connect properties with qualified international buyers.",
  },
];

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-padding bg-secondary/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-gold uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mt-4">
            What Our Clients Say
          </h2>
        </div>

        {/* Testimonial Card */}
        <div className="relative">
          <div className="bg-background rounded-3xl p-8 md:p-12 shadow-xl text-center">
            <Quote className="w-12 h-12 text-gold/30 mb-6 mx-auto" />
            
            <div className="min-h-[120px]">
              <p className="text-xl md:text-2xl leading-relaxed text-foreground/90 font-light">
                "{testimonials[activeIndex].content}"
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="font-semibold text-lg">{testimonials[activeIndex].name}</p>
              <p className="text-sm text-muted-foreground">
                {testimonials[activeIndex].role}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="p-3 rounded-full bg-background border border-border hover:bg-secondary transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeIndex ? "bg-gold w-6" : "bg-border"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="p-3 rounded-full bg-background border border-border hover:bg-secondary transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
