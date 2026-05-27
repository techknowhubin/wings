import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Lock, Eye, Database, UserCheck, Bell,
  ArrowLeft, BookOpen, Mail, MapPin, RefreshCw,
  AlertTriangle, Trash2, Globe, Cookie, Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DynamicLogo } from "@/components/DynamicLogo";
import Footer from "@/components/Footer";

const SECTIONS = [
  { id: "p1",  num: "01", label: "Overview",               icon: Shield },
  { id: "p2",  num: "02", label: "Information We Collect", icon: Database },
  { id: "p3",  num: "03", label: "How We Use Data",        icon: Eye },
  { id: "p4",  num: "04", label: "Legal Basis (DPDP)",     icon: UserCheck },
  { id: "p5",  num: "05", label: "Sharing of Data",        icon: Globe },
  { id: "p6",  num: "06", label: "Cookies & Tracking",     icon: Cookie },
  { id: "p7",  num: "07", label: "Data Retention",         icon: Server },
  { id: "p8",  num: "08", label: "Your Rights",            icon: Lock },
  { id: "p9",  num: "09", label: "Security",               icon: Shield },
  { id: "p10", num: "10", label: "Children's Privacy",     icon: AlertTriangle },
  { id: "p11", num: "11", label: "Policy Updates",         icon: Bell },
  { id: "p12", num: "12", label: "Data Deletion",          icon: Trash2 },
  { id: "p13", num: "13", label: "Contact Us",             icon: Mail },
];

export default function Privacy() {
  const [activeSection, setActiveSection] = useState("p1");
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10" style={{ '--primary': '156 25% 35%', '--primary-foreground': '0 0% 100%' } as React.CSSProperties}>
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="transition-transform hover:scale-105 active:scale-95">
            <DynamicLogo />
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex text-[10px] font-bold tracking-widest uppercase text-muted-foreground bg-muted px-3 py-1 rounded-full">Legal Document</span>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8">

        {/* Sidebar */}
        <aside className="hidden lg:block relative">
          <Card className="sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col border-border/60 shadow-sm">
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">Privacy Policy</p>
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

        {/* Main Content */}
        <main className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

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

          {/* Hero */}
          <div className="bg-primary/5 rounded-2xl p-8 lg:p-12 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Shield className="h-32 w-32" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase mb-6">
                <Lock className="h-3 w-3" /> Data Protection
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Privacy <span className="text-primary">Policy</span></h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Effective: May 1, 2025</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Bangalore, India</span>
              </div>
            </div>
          </div>

          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-8 lg:p-16 space-y-20">

              {/* 01 Overview */}
              <section id="p1" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">01</span>
                    <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>WINGSNNESTS ECO SOLUTIONS PVT LTD ("Xplorwing", "we", "us", or "our") operates the Xplorwing platform — including the website, mobile-optimised web application, and associated services. This Privacy Policy explains how we collect, use, store, share, and protect personal data when you use our platform.</p>
                    <p>By creating an account or using Xplorwing, you acknowledge that you have read and understood this policy. This policy is compliant with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>Information Technology Act, 2000</strong>.</p>
                    <div className="p-5 rounded-xl bg-primary/5 border border-primary/15">
                      <p className="text-xs font-medium text-foreground leading-relaxed">This policy applies to all users — Travelers, Service Providers, and visitors — who access the Xplorwing platform from India or anywhere in the world.</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 02 Information We Collect */}
              <section id="p2" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">02</span>
                    <h2 className="text-2xl font-bold tracking-tight">Information We Collect</h2>
                  </div>
                  <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
                    <p>We collect the following categories of personal data:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { t: "Account Information", m: "Full name, email address, mobile number, and profile photo provided during registration or onboarding." },
                        { t: "Identity & KYC Data", m: "Government-issued ID (Aadhaar, PAN, or passport) submitted for WingID verification. KYC images are deleted post-verification; only cryptographic hashes are retained." },
                        { t: "Booking & Transaction Data", m: "Details of services booked, travel dates, destinations, payment method, and transaction history." },
                        { t: "Device & Usage Data", m: "IP address, browser type, OS, device identifiers, pages visited, and clickstream data collected automatically when you use the platform." },
                        { t: "Location Data", m: "Approximate or precise location when you search for nearby services or allow location access in your browser." },
                        { t: "Communications", m: "Messages sent via in-app support, email, or WhatsApp; feedback, reviews, and survey responses you submit." },
                        { t: "Payment Data", m: "We do not store full card numbers. Payment processing is handled by PCI-DSS compliant gateways (Razorpay). We retain only tokenised references and UPI IDs." },
                        { t: "Provider Data", m: "For Service Providers: business name, GST/PAN, bank account details for payouts, listing content, and KYC documents." },
                      ].map((row, i) => (
                        <div key={i} className="p-5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <p className="font-bold text-primary mb-1 text-sm">{row.t}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{row.m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 03 How We Use Data */}
              <section id="p3" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">03</span>
                    <h2 className="text-2xl font-bold tracking-tight">How We Use Your Data</h2>
                  </div>
                  <div className="space-y-3 text-muted-foreground text-sm">
                    {[
                      "Create and manage your account, and issue your WingID.",
                      "Process bookings, payments, cancellations, and refunds.",
                      "Verify identity through KYC to comply with applicable law.",
                      "Send booking confirmations, receipts, and important service updates via email, SMS, or WhatsApp.",
                      "Provide customer support and resolve disputes.",
                      "Personalise your experience — surface relevant listings, offers, and destinations.",
                      "Improve platform features through aggregate usage analytics.",
                      "Detect and prevent fraud, abuse, and security incidents.",
                      "Comply with legal obligations, court orders, or regulatory requests.",
                      "Run loyalty programs (X-Points) and promotional campaigns where you have opted in.",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                        <p className="leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 04 Legal Basis */}
              <section id="p4" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">04</span>
                    <h2 className="text-2xl font-bold tracking-tight">Legal Basis for Processing (DPDP Act, 2023)</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>Under the Digital Personal Data Protection Act, 2023, we process your personal data on the following lawful bases:</p>
                    <div className="space-y-3">
                      {[
                        { t: "Consent", m: "Where you have given explicit consent — for example, to receive marketing communications or to share location data." },
                        { t: "Contractual Necessity", m: "Where processing is necessary to fulfil a booking or service agreement you have entered into with us." },
                        { t: "Legitimate Interests", m: "To improve platform security, prevent fraud, and enhance user experience, balanced against your privacy rights." },
                        { t: "Legal Obligation", m: "Where we are required to process data to comply with applicable laws, including KYC requirements, financial record-keeping (7 years), and tax regulations." },
                      ].map((row, i) => (
                        <div key={i} className="p-5 rounded-xl border border-border bg-muted/20 flex gap-4">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm mb-1">{row.t}</p>
                            <p className="text-xs leading-relaxed">{row.m}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 05 Sharing */}
              <section id="p5" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">05</span>
                    <h2 className="text-2xl font-bold tracking-tight">Sharing of Data</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>We do not sell your personal data. We share it only in the following circumstances:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { t: "Service Providers", m: "We share necessary booking details (name, contact, pickup point) with the Service Provider fulfilling your booking." },
                        { t: "Payment Processors", m: "Transaction data is shared with Razorpay or other PCI-DSS compliant gateways solely to process payments." },
                        { t: "Cloud & Infrastructure", m: "We use Supabase (hosted on AWS) for database storage. Data is encrypted in transit and at rest." },
                        { t: "Analytics & Marketing", m: "Aggregated, anonymised usage data may be shared with analytics partners. We do not share identifiable data for advertising." },
                        { t: "Legal & Regulatory", m: "We disclose data when required by a court order, government authority, or to protect the safety of users and the platform." },
                        { t: "Business Transfers", m: "In the event of a merger, acquisition, or asset sale, personal data may be transferred. We will notify you before your data becomes subject to a different privacy policy." },
                      ].map((row, i) => (
                        <div key={i} className="p-5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <p className="font-bold text-primary mb-1 text-sm">{row.t}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{row.m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 06 Cookies */}
              <section id="p6" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">06</span>
                    <h2 className="text-2xl font-bold tracking-tight">Cookies &amp; Tracking</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>We use cookies and similar technologies to keep you logged in, remember preferences, and understand how visitors use the platform.</p>
                    <div className="space-y-3">
                      {[
                        { t: "Essential Cookies", m: "Required for authentication, session management, and core platform functionality. Cannot be disabled." },
                        { t: "Analytics Cookies", m: "Used to measure page views, user flows, and feature engagement (e.g. Google Analytics). Data is anonymised." },
                        { t: "Preference Cookies", m: "Store your choices such as dark mode, language, and selected region." },
                      ].map((row, i) => (
                        <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 flex gap-3 items-start">
                          <Cookie className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground text-xs mb-0.5">{row.t}</p>
                            <p className="text-xs leading-relaxed">{row.m}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p>You may disable non-essential cookies via your browser settings. Note that doing so may affect some platform features.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 07 Retention */}
              <section id="p7" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">07</span>
                    <h2 className="text-2xl font-bold tracking-tight">Data Retention</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>We retain personal data only for as long as necessary for the purposes it was collected, or as required by law.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="text-left p-3 font-semibold text-foreground">Data Type</th>
                            <th className="text-left p-3 font-semibold text-foreground">Retention Period</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            ["Account & Profile Data", "Until account deletion, then 30 days grace period"],
                            ["Transaction & Booking Records", "7 years (statutory financial record requirement)"],
                            ["KYC / ID Images", "Deleted immediately after verification; cryptographic hash retained"],
                            ["Support Communications", "2 years from last interaction"],
                            ["Usage & Analytics Logs", "13 months (anonymised after 3 months)"],
                            ["Marketing Preferences", "Until you withdraw consent"],
                          ].map(([type, period], i) => (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-medium text-foreground">{type}</td>
                              <td className="p-3 text-muted-foreground">{period}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 08 Your Rights */}
              <section id="p8" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">08</span>
                    <h2 className="text-2xl font-bold tracking-tight">Your Rights</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>As a Data Principal under the DPDP Act, 2023, you have the following rights:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { t: "Right to Access", m: "Request a summary of the personal data we hold about you." },
                        { t: "Right to Correction", m: "Request correction of inaccurate or incomplete personal data." },
                        { t: "Right to Erasure", m: "Request deletion of your personal data where it is no longer required (subject to legal retention obligations)." },
                        { t: "Right to Grievance Redressal", m: "Lodge a grievance with our Data Protection Officer and receive a timely response." },
                        { t: "Right to Nominate", m: "Nominate an individual to exercise your rights in the event of your death or incapacity." },
                        { t: "Right to Withdraw Consent", m: "Withdraw consent for processing at any time. Withdrawal will not affect the legality of prior processing." },
                      ].map((row, i) => (
                        <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <p className="font-bold text-primary text-xs mb-1">{row.t}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{row.m}</p>
                        </div>
                      ))}
                    </div>
                    <p>To exercise any right, email <a href="mailto:privacy@xplorwing.com" className="text-primary underline underline-offset-2 hover:opacity-80">privacy@xplorwing.com</a>. We will respond within <strong>30 days</strong>.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 09 Security */}
              <section id="p9" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">09</span>
                    <h2 className="text-2xl font-bold tracking-tight">Security</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>We implement industry-standard technical and organisational measures to protect your data against unauthorised access, disclosure, alteration, or destruction:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { t: "TLS Encryption", m: "All data in transit is encrypted using TLS 1.2 or higher." },
                        { t: "At-Rest Encryption", m: "Database storage is AES-256 encrypted on Supabase / AWS infrastructure." },
                        { t: "Access Controls", m: "Role-based access ensures only authorised personnel can access sensitive data." },
                        { t: "Password Hashing", m: "Passwords are hashed using bcrypt and never stored in plaintext." },
                        { t: "Audit Logs", m: "All admin actions are logged with timestamps for accountability." },
                        { t: "Incident Response", m: "We maintain a breach notification process and will inform affected users within 72 hours of discovery." },
                      ].map((row, i) => (
                        <div key={i} className="p-4 rounded-xl border border-border bg-muted/20">
                          <p className="font-semibold text-foreground text-xs mb-1">{row.t}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{row.m}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs">No system is completely secure. If you believe your account has been compromised, contact us immediately at <a href="mailto:security@xplorwing.com" className="text-primary underline underline-offset-2">security@xplorwing.com</a>.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 10 Children */}
              <section id="p10" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">10</span>
                    <h2 className="text-2xl font-bold tracking-tight">Children's Privacy</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" /> Age Restriction
                      </p>
                      <p className="text-xs m-0 leading-relaxed font-medium">The Xplorwing platform is not directed to individuals under the age of 18. We do not knowingly collect personal data from minors. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately and we will delete it.</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 11 Policy Updates */}
              <section id="p11" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">11</span>
                    <h2 className="text-2xl font-bold tracking-tight">Policy Updates</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or applicable law. When we make material changes, we will:</p>
                    <ul className="space-y-2 list-none">
                      {[
                        "Update the 'Effective Date' at the top of this policy.",
                        "Send an email notification to your registered address.",
                        "Display a banner on the platform for 30 days after the update.",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p>Continued use of the platform after the effective date of an updated policy constitutes acceptance of the revised terms.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 12 Data Deletion */}
              <section id="p12" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">12</span>
                    <h2 className="text-2xl font-bold tracking-tight">Account &amp; Data Deletion</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>You may request deletion of your Xplorwing account and associated personal data at any time. To do so:</p>
                    <ol className="space-y-2 list-none">
                      {[
                        "Go to Profile → Settings → Delete Account, or",
                        "Email us at privacy@xplorwing.com with your registered email address and the subject line 'Account Deletion Request'.",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                          <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">{i + 1}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                    <p>We will process your request within <strong>30 days</strong>. Please note that data required for legal compliance (e.g. transaction records for 7 years under financial laws) will be retained even after deletion, in an anonymised or pseudonymised form where possible.</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-50" />

              {/* 13 Contact */}
              <section id="p13" className="scroll-mt-24">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20 shadow-sm">13</span>
                    <h2 className="text-2xl font-bold tracking-tight">Contact Us</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>For any questions, requests, or grievances related to this Privacy Policy, contact our Data Protection Officer:</p>
                    <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-3">
                      <p className="font-bold text-foreground">WINGSNNESTS ECO SOLUTIONS PVT LTD</p>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary shrink-0" />#161, 1st Floor, 9th Cross, Somasandrapalya, Sector 2 HSR Layout, Bangalore – 560102, Karnataka, India</p>
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary shrink-0" /><a href="mailto:privacy@xplorwing.com" className="text-primary underline underline-offset-2 hover:opacity-80">privacy@xplorwing.com</a></p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">We aim to respond to all privacy-related queries within <strong>30 business days</strong>. If you are unsatisfied with our response, you may escalate to the Data Protection Board of India once it is constituted under the DPDP Act, 2023.</p>
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
