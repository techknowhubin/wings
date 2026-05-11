import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ananya S",
    rating: 5,
    text: "Booked a cozy homestay in Manali through Xplorwing — the place was exactly as shown. Seamless check-in and the host was wonderful!",
    avatar: "A",
  },
  {
    name: "Rohit M",
    rating: 5,
    text: "Rented a Royal Enfield for my Ladakh trip. The bike was in great condition and the pricing was super transparent. Will definitely use again!",
    avatar: "R",
  },
  {
    name: "Priya K",
    rating: 5,
    text: "The sunrise trek experience in Munnar was magical. Our guide was knowledgeable and made the whole group feel safe. Highly recommend!",
    avatar: "P",
  },
  {
    name: "Vikram D",
    rating: 5,
    text: "Finding a car rental in Goa has never been easier. Great selection, fair prices, and the car was delivered right to our hotel.",
    avatar: "V",
  },
  {
    name: "Meera J",
    rating: 5,
    text: "We stayed at a heritage haveli in Jaipur — an unforgettable experience. Xplorwing made the booking effortless and the support team was always responsive.",
    avatar: "M",
  },
  {
    name: "Arjun T",
    rating: 5,
    text: "Used Xplorwing for an outstation cab from Bangalore to Coorg. Punctual driver, clean car, and very reasonable fare. Perfect weekend getaway!",
    avatar: "A",
  },
];

const CustomerTestimonials = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Loved by Travelers Across India
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See what our customers have to say about their Xplorwing experiences
          </p>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="break-inside-avoid glass-effect rounded-2xl p-6 border border-border"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-primary-text text-primary-text" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed mb-4">
                {t.text}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary-text">
                  {t.avatar}
                </div>
                <span className="text-sm font-medium text-foreground">{t.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default CustomerTestimonials;
