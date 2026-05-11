import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  LineChart,
  Link as LinkIcon,
  Store,
  CalendarCheck,
  CreditCard,
  MapPin,
  Car,
  Home,
  User,
  ShieldCheck,
  Medal,
  LayoutGrid
} from "lucide-react";

export default function LinkInBioLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Header />

      {/* ═══ HERO SECTION ═══ */}
      <section className="pt-32 pb-20 px-4 max-w-4xl mx-auto text-center">
        <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 mb-8 py-1.5 px-4 rounded-full text-sm font-medium">
          <LinkIcon className="w-4 h-4 mr-2" /> Wing Link
        </Badge>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
        >
          Your travel business,<br className="hidden md:block" /> one link away
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Wing Link is your free digital storefront on Xplorwing — share all your services, take direct bookings, and grow without paying commissions on every sale.
        </motion.p>
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section className="py-20 px-4 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">What You Get</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything a service provider needs</h2>
            <p className="text-muted-foreground">No code. No website. Just fill in your details and your Wing Link goes live in minutes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: User,
                title: "Branded profile page",
                desc: "Your name, photo, bio, and location... instantly professional."
              },
              {
                icon: LayoutGrid,
                title: "Up to 10 listings free",
                desc: "Add homestays, cab routes, tours, or any service you offer."
              },
              {
                icon: CalendarCheck,
                title: "Direct booking engine",
                desc: "Guests book and pay directly — no middleman, just 10% platform fee."
              },
              {
                icon: QrCode,
                title: "Wing Pass QR",
                desc: "One QR code guests scan at check-in. KYC-verified, no paperwork."
              },
              {
                icon: Medal,
                title: "WingPoints rewards",
                desc: "Guests earn points on every booking — keeps them coming back to you."
              },
              {
                icon: LineChart,
                title: "Booking analytics",
                desc: "See views, clicks, and conversions on your link in real time."
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE PREVIEW ═══ */}
      <section className="py-24 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Live Preview</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">This is what your Wing Link looks like</h2>
            <p className="text-muted-foreground">Share this URL anywhere — WhatsApp, Instagram bio, Google Maps, business card.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Phone Mockup */}
            <div className="relative mx-auto w-full max-w-[320px]">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <div className="relative rounded-[2.5rem] border-[8px] border-border bg-background overflow-hidden shadow-2xl h-[650px] flex flex-col">
                <div className="bg-primary/10 p-6 pt-10 text-center border-b border-primary/10">
                  <div className="w-16 h-16 rounded-full bg-card mx-auto mb-3 flex items-center justify-center border-2 border-primary/50">
                    <Home className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Suresh Reddy Stays</h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> Araku Valley
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3 border border-primary/20">
                    <QrCode className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Wing Pass QR</p>
                      <p className="text-xs text-muted-foreground">Scan for KYC verified check-in</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Home className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">Ayaka Forest Cottage</p>
                      <p className="text-xs text-muted-foreground">Homestay • 3 guests</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">₹1,500<span className="text-[10px] text-muted-foreground font-normal">/night</span></p>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">Wing 3 Ayaka Cab</p>
                      <p className="text-xs text-muted-foreground">Cab • Station drop</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">₹2,400</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card border-t border-border">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Book Now • Pay Securely
                  </Button>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-10">
              {[
                {
                  num: "1",
                  title: "Share your Wing Link",
                  desc: "Post it in your WhatsApp status, Instagram bio, or Google Maps listing. One link for everything."
                },
                {
                  num: "2",
                  title: "Guest browses your listings",
                  desc: "They see all your services — stays, cabs, tours — with photos, prices, and availability."
                },
                {
                  num: "3",
                  title: "Guest books and pays",
                  desc: "Razorpay handles UPI, card, and wallet payments. Money reaches you directly, minus a 10% fee."
                },
                {
                  num: "4",
                  title: "Wing Pass QR at check-in",
                  desc: "Guest scans your QR on arrival. KYC verified, no manual ID checks — smooth every time."
                }
              ].map((step, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                    <span className="font-bold text-foreground">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHO IS THIS FOR ═══ */}
      <section className="py-24 px-4 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Who is this for</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for every kind of travel provider</h2>
            <p className="text-muted-foreground">Pick your role to see exactly how Wing Link works for you.</p>
          </div>

          <Tabs defaultValue="homestay" className="w-full">
            <TabsList className="bg-muted/50 border border-border p-1 flex-wrap h-auto mb-8 justify-start">
              <TabsTrigger value="homestay" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Homestay host</TabsTrigger>
              <TabsTrigger value="cab" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Cab operator</TabsTrigger>
              <TabsTrigger value="resort" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Resort/Hotel</TabsTrigger>
              <TabsTrigger value="tour" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Tour guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="homestay" className="mt-0">
              <Card className="bg-card/50 border-border p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <Home className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Homestay host</h3>
                </div>
                <p className="text-muted-foreground mb-8 max-w-3xl leading-relaxed">
                  You rent out your home, a room, or a farm stay. Wing Link replaces the need to leave MakeMyTrip or Airbnb — list for free and keep more of what you earn.
                </p>
                <ul className="space-y-4">
                  {[
                    "List up to 10 rooms or properties",
                    "Show per-night pricing, amenities, and photos",
                    "Collect advance via UPI — no cash uncertainty",
                    "Wing Pass QR handles check-in ID verification",
                    "Opt into the Xplorwing marketplace for extra discovery (20% commission only on marketplace bookings)"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabsContent>
            {/* Additional TabsContent for Cab, Resort, Tour can be added similarly */}
            <TabsContent value="cab" className="mt-0 text-muted-foreground">Cab operator details...</TabsContent>
            <TabsContent value="resort" className="mt-0 text-muted-foreground">Resort/Hotel details...</TabsContent>
            <TabsContent value="tour" className="mt-0 text-muted-foreground">Tour guide details...</TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-24 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free. Pay only when you earn — no subscriptions, no hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-8">
                <p className="text-primary font-bold text-sm tracking-wider uppercase mb-2">Wing Starter</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-foreground">Free</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">Forever, no card required</p>
                <ul className="space-y-4">
                  {["Up to 10 listings", "Wing Link public page", "Wing Pass QR code", "10% fee on direct bookings", "Marketplace not included"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/80 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="bg-blue-950/20 dark:bg-[#0f172a] border-blue-200 dark:border-blue-900/50 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <CardContent className="p-8">
                <p className="text-blue-600 dark:text-blue-400 font-bold text-sm tracking-wider uppercase mb-2">Wing Pro</p>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">₹499</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-blue-600/70 dark:text-blue-200/60 mb-8">Best for active hosts</p>
                <ul className="space-y-4">
                  {["Unlimited listings", "Marketplace opt-in (20% only on marketplace bookings)", "Analytics dashboard", "Priority support", "10% fee on direct bookings"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-foreground/80 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Custom Tier */}
            <Card className="bg-orange-50 dark:bg-[#3f2b1a]/20 border-orange-200 dark:border-orange-900/30 shadow-sm">
              <CardContent className="p-8">
                <p className="text-orange-600 dark:text-orange-400 font-bold text-sm tracking-wider uppercase mb-2">Wing Franchise</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-foreground">Custom</span>
                </div>
                <p className="text-sm text-orange-600/70 dark:text-orange-200/60 mb-8">For large operators</p>
                <ul className="space-y-4">
                  {["Manage multiple provider accounts", "Offline hub branding", "Revenue share model", "Dedicated onboarding", "Whiteglove KYC support"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <span className="text-foreground/80 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══ LINK VS MARKETPLACE ═══ */}
      <section className="py-24 px-4 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Link vs Marketplace</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Wing Link and the Marketplace are different things</h2>
            <p className="text-muted-foreground">A common question — here's the clearest way to think about it.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <LinkIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Wing Link (always yours)</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your personal storefront. You control what's listed, the prices, and who sees it. You share the link — guests come directly to you. <span className="text-foreground font-semibold">Always free, always 10%.</span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Store className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Xplorwing Marketplace (opt-in)</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Like a travel OTA — your listing appears to thousands of explorers browsing the platform. Requires admin approval. <span className="text-foreground font-semibold">20% commission applies only on marketplace-originated bookings.</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══ KEY NUMBERS ═══ */}
      <section className="py-20 px-4 border-y border-border bg-muted/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="pt-8 md:pt-0 md:px-8 text-center md:text-left">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Key Numbers</p>
            <h3 className="text-5xl font-bold text-foreground mb-2">₹0</h3>
            <p className="text-muted-foreground">to set up Wing Link</p>
          </div>
          <div className="pt-8 md:pt-0 md:px-8 text-center md:text-left">
            <h3 className="text-5xl font-bold text-foreground mb-2 mt-7">10 min</h3>
            <p className="text-muted-foreground">average onboarding time</p>
          </div>
          <div className="pt-8 md:pt-0 md:px-8 text-center md:text-left">
            <h3 className="text-5xl font-bold text-foreground mb-2 mt-7">10%</h3>
            <p className="text-muted-foreground">only on direct bookings earned</p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <section className="py-24 px-4 bg-background text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to create your Wing Link?</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Join Xplorwing as a host — your storefront goes live in minutes, for free.</p>
        <Link to="/signup">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 gap-2">
            Get started as a host <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
