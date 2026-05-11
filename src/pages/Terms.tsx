import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, Shield, Scale, Mail, MapPin,
  ArrowLeft, BookOpen, Lock, CreditCard, RefreshCw,
  Zap, Building2, Utensils, AlertCircle, Info,
  CheckCircle2, AlertTriangle, Gavel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DynamicLogo } from "@/components/DynamicLogo";
import Footer from "@/components/Footer";

const SECTIONS = [
  { id: "s1", num: "01", label: "Definitions", icon: BookOpen },
  { id: "s2", num: "02", label: "Acceptance", icon: Shield },
  { id: "s3", num: "03", label: "About Xplorwing", icon: Zap },
  { id: "s4", num: "04", label: "Eligibility", icon: AlertCircle },
  { id: "s5", num: "05", label: "Account Registration", icon: Lock },
  { id: "s6", num: "06", label: "WingID & KYC", icon: RefreshCw },
  { id: "s7", num: "07", label: "Services & Bookings", icon: FileText },
  { id: "s8", num: "08", label: "Payments & Refunds", icon: CreditCard },
  { id: "s9", num: "09", label: "Cancellation Policy", icon: RefreshCw },
  { id: "s10", num: "10", label: "QR Codes & Check-in", icon: Zap },
  { id: "s11", num: "11", label: "Rewards & Coupons", icon: CreditCard },
  { id: "s12", num: "12", label: "Service Providers", icon: Building2 },
  { id: "s13", num: "13", label: "Xplorwing Hubs", icon: Building2 },
  { id: "s14", num: "14", label: "Hub Restaurants", icon: Utensils },
  { id: "s15", num: "15", label: "Prohibited Conduct", icon: AlertCircle },
  { id: "s16", num: "16", label: "Intellectual Property", icon: Scale },
  { id: "s17", num: "17", label: "Data Privacy", icon: Lock },
  { id: "s18", num: "18", label: "Disclaimers", icon: Info },
  { id: "s19", num: "19", label: "Limitation of Liability", icon: AlertTriangle },
  { id: "s20", num: "20", label: "Indemnification", icon: Shield },
  { id: "s21", num: "21", label: "Governing Law", icon: Gavel },
  { id: "s22", num: "22", label: "Dispute Resolution", icon: Scale },
  { id: "s23", num: "23", label: "Modifications", icon: RefreshCw },
  { id: "s24", num: "24", label: "Termination", icon: AlertCircle },
  { id: "s25", num: "25", label: "Contact Us", icon: Mail },
];

export default function Terms() {
  const [activeSection, setActiveSection] = useState("s1");
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="transition-transform hover:scale-105 active:scale-95">
            <DynamicLogo />
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex text-[10px] font-bold tracking-widest uppercase text-muted-foreground bg-muted px-3 py-1 rounded-full">Legal Document</span>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8">

        {/* Navigation Sidebar */}
        <aside className="hidden lg:block relative">
          <Card className="sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col border-border/60 shadow-sm">
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">Terms of Service</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Xplorwing v1.0</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <nav className="space-y-0.5">
                {SECTIONS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all text-left group",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className={cn("h-3.5 w-3.5 shrink-0", activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </Card>
        </aside>

        {/* Legal Content */}
        <main className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 [--primary:157_25%_35%] [--primary-foreground:0_0%_100%]">

          {/* Mobile TOC */}
          <div className="lg:hidden">
            <Card className="bg-muted/20 border-dashed">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> Navigation
                </p>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map(s => (
                    <Button
                      key={s.id}
                      variant={activeSection === s.id ? "default" : "outline"}
                      size="xs"
                      onClick={() => scrollToSection(s.id)}
                      className="text-[10px] h-7"
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Title Module */}
          <div className="bg-primary/5 rounded-2xl p-8 lg:p-12 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Scale className="h-32 w-32" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase mb-6">
                <Shield className="h-3 w-3" /> Compliance Document
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Terms of <span className="text-primary">Service</span></h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Effective: Nov 17, 2023</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Bangalore, India</span>
              </div>
            </div>
          </div>

          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-8 lg:p-16 space-y-20">

              {/* 01 Definitions */}
              <section id="s1" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">01</span>
                    <h2 className="text-2xl font-bold tracking-tight">Definitions</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed italic">In these Terms of Service, the following terms shall have the meanings ascribed to them below:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { t: "Xplorwing", m: "Refers to WINGSNNESTS ECO SOLUTIONS PVT LTD, a company incorporated under the Companies Act, 2013, having its registered office at #161, 1st Floor, 9th Cross, Somasandrapalya, Sector 2 HSR Layout, Bangalore - 560102, Karnataka, India, and its affiliates, directors, and employees." },
                      { t: "Platform", m: "Refers to the Xplorwing website, mobile-optimised web application, QR-based infrastructure, API services, and all associated digital tools provided by Xplorwing." },
                      { t: "Traveler", m: "A registered user who accesses the Platform to discover, search, and book travel-related services including but not limited to transportation, accommodation, and curated experiences." },
                      { t: "Service Provider", m: "Any third-party individual, licensed operator, or business entity that lists and provides services (such as cabs, bike rentals, hotels, or tours) on the Platform." },
                      { t: "WingID", m: "The unique digital identity token assigned to a Traveler upon successful completion of the KYC verification process." },
                      { t: "X-Pass QR", m: "The dynamic identity credential generated for a Traveler, used for contactless identity verification and check-in at Xplorwing-connected Service Providers." },
                      { t: "Hub Restaurant", m: "A partner dining establishment acting as an authorised access point for Traveler onboarding and Platform activity at a tourist destination." },
                      { t: "X-Points", m: "Virtual loyalty reward points earned through eligible transactions on the Platform, redeemable for discounts and cross-service benefits." }
                    ].map((row, i) => (
                      <div key={i} className="p-5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <p className="font-bold text-primary mb-1 text-sm">{row.t}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{row.m}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 02 Acceptance */}
              <section id="s2" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">02</span>
                    <h2 className="text-2xl font-bold tracking-tight">Acceptance of Terms</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>By accessing, browsing, or using the Platform, you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service, along with our Privacy Policy and any other guidelines published on the Platform.</p>
                    <p>These Terms constitute a binding legal agreement between you and Xplorwing. If you do not agree to these Terms, you must immediately discontinue use of the Platform.</p>
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" /> Compliance Notice
                      </p>
                      <p className="text-xs m-0 leading-relaxed font-medium">These Terms are published in accordance with the provisions of Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023.</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 03 About */}
              <section id="s3" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">03</span>
                    <h2 className="text-2xl font-bold tracking-tight">About Xplorwing</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>Xplorwing acts as an integrated travel marketplace and technology layer for India's travel and hospitality sector. We facilitate the discovery, booking, and identity verification process between Travelers and independent Service Providers.</p>
                    <p>Xplorwing operates as an intermediary under Section 2(1)(w) of the Information Technology Act, 2000. While we facilitate the transaction and identity layer, the actual contract for service is directly between the Traveler and the Service Provider.</p>
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                      <p className="font-bold text-primary text-sm mb-2">The Trust Protocol</p>
                      <p className="text-xs m-0">Our platform is built on the "Trust Protocol" — a standardized system for identity verification that enables paperless guest check-ins (WingID) and verified transactions across different service categories.</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 04 Eligibility */}
              <section id="s4" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">04</span>
                    <h2 className="text-2xl font-bold tracking-tight">Eligibility</h2>
                  </div>
                  <p className="text-muted-foreground mb-4">You represent and warrant that you satisfy the following eligibility criteria:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "You must be at least 18 years of age.",
                      "You must be a citizen or legal resident of the Republic of India.",
                      "You must possess a valid government-issued identity document (Aadhaar, DL, or Passport).",
                      "You have the legal authority to enter into a binding contract.",
                      "You have not been previously suspended or removed from the Platform."
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/5 group hover:border-primary/30 transition-all">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground leading-tight group-hover:text-foreground transition-colors">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 05 Account Registration */}
              <section id="s5" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">05</span>
                    <h2 className="text-2xl font-bold tracking-tight">Account Registration</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p><strong className="text-foreground">5.1 Registration Process:</strong> You may register an account using your mobile number (OTP-based), Google account, or Email. You agree to provide accurate, current, and complete information during the registration process.</p>
                    <p><strong className="text-foreground">5.2 One Account Policy:</strong> An individual user is permitted to maintain only one active account on the Platform. Duplicate accounts will be subject to suspension or termination.</p>
                    <p><strong className="text-foreground">5.3 Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify Xplorwing immediately at security@xplorwing.com of any unauthorized use of your account.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 06 WingID & KYC */}
              <section id="s6" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">06</span>
                    <h2 className="text-2xl font-bold tracking-tight">WingID & Verification</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p><strong className="text-foreground">6.1 Mandatory KYC:</strong> Completion of Know Your Customer (KYC) verification is required to make bookings on the Platform. We accept Aadhaar Card, Driving License, or Passport for this purpose.</p>
                    <p><strong className="text-foreground">6.2 WingID Generation:</strong> Upon successful verification, your account will be upgraded with a WingID — a unique digital token representing your verified identity within the Xplorwing ecosystem.</p>
                    <p><strong className="text-foreground">6.3 Review Period:</strong> KYC submissions are typically reviewed within 2 hours. Xplorwing reserves the right to request additional information or reject submissions if they appear fraudulent, incomplete, or tampered with.</p>
                    <div className="bg-primary/5 p-5 rounded-xl border border-primary/10 flex gap-4">
                      <Lock className="h-5 w-5 text-primary shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-primary text-xs uppercase tracking-wider mb-1">Data Minimization</p>
                        <p className="text-[11px] m-0">Xplorwing does not store raw biometrics or Aadhaar records. We store identity documents only until verification is complete, after which only a cryptographic hash is retained to prevent identity theft.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 07 Services & Bookings */}
              <section id="s7" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">07</span>
                    <h2 className="text-2xl font-bold tracking-tight">Services & Bookings</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p><strong className="text-foreground">7.1 Service Categories:</strong> Xplorwing facilitates bookings across various categories including Transportation (Cabs, Bike Rentals), Accommodation (Hotels, Homestays, Resorts), and Experiences (Tours, Sightseeing).</p>
                    <p><strong className="text-foreground">7.2 Booking Contract:</strong> A confirmed booking on the Platform constitutes a direct legal contract between the Traveler and the Service Provider. Xplorwing is not a party to this contract and does not guarantee the quality or fulfillment of the service, though we facilitate resolution through our Trust Protocol.</p>
                    <p><strong className="text-foreground">7.3 Communication:</strong> Booking confirmations, updates, and e-receipts are primarily delivered via WhatsApp and in-app notifications. You consent to receive these transaction-related messages.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 08 Payments */}
              <section id="s8" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">08</span>
                    <h2 className="text-2xl font-bold tracking-tight">Payments & Refunds</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p><strong className="text-foreground">8.1 Payment Gateway:</strong> All payments are processed through Razorpay. Accepted methods include UPI, Debit/Credit Cards, and Net Banking. Xplorwing does not store your card or banking credentials.</p>
                    <p><strong className="text-foreground">8.2 Pricing & GST:</strong> Prices are displayed in Indian Rupees (INR). Applicable GST (5% for transportation, 12-18% for other services) is charged as required by law. A GST-compliant invoice is generated for every completed transaction.</p>
                    <p><strong className="text-foreground">8.3 Split Settlement:</strong> Xplorwing uses automated split settlement. The Service Provider's share is typically credited within 2 business days of the service confirmation or QR check-in.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 09 Cancellation */}
              <section id="s9" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">09</span>
                    <h2 className="text-2xl font-bold tracking-tight">Cancellation Policy</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>The following standard policy applies unless more restrictive terms are specified on the service listing page:</p>
                    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                      <table className="w-full">
                        <thead className="bg-primary text-primary-foreground">
                          <tr>
                            <th className="px-5 py-3 text-left font-bold text-[10px] uppercase tracking-widest">Notice Period</th>
                            <th className="px-5 py-3 text-left font-bold text-[10px] uppercase tracking-widest">Refund Eligibility</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="bg-card hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 font-semibold text-foreground italic">Over 48 Hours</td>
                            <td className="px-5 py-4">Full Refund (excluding Platform Fee)</td>
                          </tr>
                          <tr className="bg-muted/20 hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 font-semibold text-foreground italic">24 to 48 Hours</td>
                            <td className="px-5 py-4">50% Refund</td>
                          </tr>
                          <tr className="bg-card hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 font-semibold text-foreground italic">Less than 24 Hours</td>
                            <td className="px-5 py-4 font-bold text-destructive underline decoration-dotted">No Refund</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 10 QR Codes */}
              <section id="s10" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">10</span>
                    <h2 className="text-2xl font-bold tracking-tight">QR Codes & Check-in</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm font-medium pr-4">
                    <p><strong className="text-foreground">10.1 X-Pass QR:</strong> Your personal identity QR derived from your WingID. It is your credential for check-in at any Xplorwing-connected provider.</p>
                    <p><strong className="text-foreground">10.2 Security:</strong> Your QR code is personal and non-transferable. Sharing, duplicating, or distributing screenshots of your QR code on public forums is strictly prohibited.</p>
                    <p><strong className="text-foreground">10.3 Validity:</strong> X-Pass QR codes are dynamically refreshed. Ensure you use the current QR code available in your account for successful check-in.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 11 Rewards */}
              <section id="s11" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">11</span>
                    <h2 className="text-2xl font-bold tracking-tight">Rewards & Coupons</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Xplorwing operates a loyalty programme where Travelers earn X-Points on eligible transactions. X-Points are a virtual currency with no monetary value outside the Platform. Cross-service coupons (e.g., dining transaction generating a rental coupon) are subject to specific validity periods and provider terms.</p>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 12 Service Providers */}
              <section id="s12" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">12</span>
                    <h2 className="text-2xl font-bold tracking-tight">Service Providers</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>Providers must register and agree to the Service Provider Agreement. They warrant that they hold all required licenses, permits (e.g., commercial vehicle permits, FSSAI), and registrations to provide the listed services.</p>
                    <p><strong className="text-foreground">Link-in-Bio Storefronts:</strong> Providers may create simplified storefront pages. Bookings made via these pages attract a reduced 10% Platform Fee compared to the 20% on the main marketplace.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 13-14 Hubs & Restaurants */}
              <section id="s13" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">13/14</span>
                    <h2 className="text-2xl font-bold tracking-tight">Hubs & Partner Establishments</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>Xplorwing Hubs are operated by independent franchise partners. Hub Restaurants act as authorised access points for registration and payment facilitation at tourist destinations. Interactive services at these locations are governed by these Terms.</p>
                    <p>Dining and F&B services at Hub Restaurants are provided independently and any quality-related complaints should be directed to the restaurant management.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 15 Prohibited Conduct */}
              <section id="s15" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">15</span>
                    <h2 className="text-2xl font-bold tracking-tight">Prohibited Conduct</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Submitting false or forged identity documents.",
                      "Creating multiple accounts to bypass suspensions.",
                      "Scraping or crawling platform data without permission.",
                      "Attempting to circumvent the payment or QR system.",
                      "Engaging in harassment or discriminatory conduct.",
                      "Posting defamatory or malicious reviews."
                    ].map((v, i) => (
                      <div key={i} className="flex gap-3 items-center p-3 rounded-lg border border-border/40 bg-muted/10">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span className="text-[11px] font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 16 IP Rights */}
              <section id="s16" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">16</span>
                    <h2 className="text-2xl font-bold tracking-tight">Intellectual Property</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">All intellectual property rights in the Platform — including logos, teal/chartreuse design system, software, QR infrastructure, and WingID system — are owned by Xplorwing Technologies. Your submission of reviews or photos grants Xplorwing a royalty-free license to use such content for platform promotion.</p>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 17 Data Privacy */}
              <section id="s17" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">17</span>
                    <h2 className="text-2xl font-bold tracking-tight">Data Privacy</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>Xplorwing processes data in accordance with the <strong>DPDP Act, 2023</strong> and the Information Technology Act. As a "Data Principal", you have the right to access, correct, and request erasure of your data.</p>
                    <p>Transaction records are retained for 7 years as required by financial laws. KYC images are deleted post-verification, with only cryptographic hashes retained for security verification.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 18-20 Legal Provisions */}
              <section id="s18" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">18+</span>
                    <h2 className="text-2xl font-bold tracking-tight">Legal Provisions</h2>
                  </div>
                  <div className="space-y-5 text-muted-foreground leading-relaxed text-sm">
                    <div className="p-5 rounded-xl border border-border bg-muted/40 font-medium">
                      <p className="text-foreground font-bold mb-2 flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Disclaimer</p>
                      <p className="m-0 leading-relaxed italic opacity-80">The Platform is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, Xplorwing disclaims all warranties of merchantability, fitness for a particular purpose, and uninterrupted availability.</p>
                    </div>
                    <div>
                      <h4 className="text-foreground font-bold mb-2">Limitation of Liability</h4>
                      <p>Xplorwing's total aggregate liability for all claims arising out of these Terms shall not exceed the amount paid for the specific transaction in the 3 months preceding the claim. We are not liable for indirect, incidental, or special damages.</p>
                    </div>
                    <div>
                      <h4 className="text-foreground font-bold mb-2">Indemnification</h4>
                      <p>You agree to indemnify and hold harmless Xplorwing from claims, liabilities, and costs arising from your violation of these Terms or infringement of third-party rights.</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 21-24 Governance & Dispute */}
              <section id="s21" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">21+</span>
                    <h2 className="text-2xl font-bold tracking-tight">Governance & Resolution</h2>
                  </div>
                  <div className="space-y-5 text-muted-foreground leading-relaxed text-sm font-medium">
                    <p><strong className="text-foreground">Governing Law:</strong> These Terms are governed by the laws of India. Exclusive jurisdiction lies with the courts of Bangalore, Karnataka.</p>
                    <p><strong className="text-foreground">Dispute Resolution:</strong> Disputes will first be attempted for informal resolution. Failing this, disputes will be resolved via Arbitration in Hyderabad in accordance with the Arbitration and Conciliation Act, 1996.</p>
                    <p><strong className="text-foreground">Modifications:</strong> Xplorwing reserves the right to modify these Terms. Material changes will be communicated via email/notification 15 days in advance.</p>
                    <p><strong className="text-foreground">Termination:</strong> You may terminate your account at any time. Xplorwing may suspend or terminate accounts for violations of conduct, fraud, or legal requirements.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 25 Contact */}
              <section id="s25" className="scroll-mt-24">
                <div className="flex flex-col gap-8">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">25</span>
                    <h2 className="text-2xl font-bold tracking-tight">Contact Us</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">General Support</p>
                        <p className="text-sm font-bold truncate">support@xplorwing.com</p>
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium">Response within 24 hours</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#43705f]/10 flex items-center justify-center text-[#43705f]">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Corporate Office</p>
                        <p className="text-sm font-bold">Bangalore, Karnataka</p>
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium">Headquarters</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Scale className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Grievance Officer</p>
                        <p className="text-sm font-bold truncate">grievance@xplorwing.com</p>
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium">Compliance & Legal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </CardContent>
          </Card>
        </main>
      </div>

      <Footer />
    </div>
  );
}
