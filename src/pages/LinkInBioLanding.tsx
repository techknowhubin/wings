import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DynamicLogo } from "@/components/DynamicLogo";
import Footer from "@/components/Footer";
import { Home, Building, Palmtree, Compass, Bike, Car, MapPin, User, LayoutDashboard } from "lucide-react";

const globalStyles = `
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --g: #1a3d2b; --gm: #2a5c40; --g-light: #e8f2ec;
  --lime: #c8e64c; --lime-d: #a8c230; --lime-p: #f0f8d0; --lime-glow: rgba(200,230,76,.3);
  --bg: #f8f6f0; --white: #fff;
  --border: #e5e1d4; --muted: #6b7c72; --text: #1a3d2b;
  --radius-card: 22px;
  --shadow-sm: 0 2px 12px rgba(26,61,43,.07);
  --shadow-md: 0 8px 36px rgba(26,61,43,.13);
  --shadow-lg: 0 20px 72px rgba(26,61,43,.2);
}
html, body, #root { 
  background: var(--bg); 
  color: var(--text); 
  overflow-x: hidden; 
  width: 100%; 
  max-width: 100vw;
  margin: 0; 
  padding: 0; 
  position: relative;
}
html { scroll-behavior: smooth; }
#prog { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--lime), var(--gm)); width: 0; z-index: 300; transition: width .1s linear; }

/* NAV */
.nav { position: fixed; top: 0; left: 0; width: 100%; z-index: 200; height: 66px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; background: transparent; transition: background .4s, backdrop-filter .4s, box-shadow .4s; }
.nav.solid { background: rgba(248,246,240,.95); backdrop-filter: blur(14px); box-shadow: 0 1px 0 var(--border); }
.logo { font-size: 22px; font-weight: 800; color: #fff; text-decoration: none; display: flex; align-items: center; opacity: 0; animation: fadeD .6s .1s ease forwards; transition: color 0.4s; }
.nav.solid .logo { color: var(--g); }
.logo-o { color: var(--lime-d); }
.nav-links { display: flex; gap: 28px; list-style: none; opacity: 0; animation: fadeD .6s .2s ease forwards; }
.nav-links a { font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 500; text-decoration: none; transition: color .2s; position: relative; display: flex; align-items: center; gap: 6px; }
.nav.solid .nav-links a { color: var(--muted); }
.nav-links a::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 1.5px; background: var(--lime); transition: width .25s; }
.nav-links a:hover { color: #fff; }
.nav.solid .nav-links a:hover { color: var(--g); }
.nav-links a:hover::after { width: 100%; }
.nav-r { display: flex; gap: 10px; align-items: center; opacity: 0; animation: fadeD .6s .3s ease forwards; }
.btn-ghost { font-size: 13.5px; font-weight: 500; color: #fff; padding: 8px 18px; border: 1.5px solid rgba(255,255,255,0.4); border-radius: 100px; text-decoration: none; transition: all .22s; }
.btn-ghost:hover { background: #fff; color: var(--g); }
.nav.solid .btn-ghost { color: var(--g); border-color: var(--g); }
.nav.solid .btn-ghost:hover { background: var(--g); color: #fff; }
.btn-lime { font-size: 13.5px; font-weight: 700; color: var(--g); background: var(--lime); padding: 9px 20px; border-radius: 100px; text-decoration: none; border: none; cursor: pointer; transition: all .22s; }
.btn-lime:hover { background: var(--lime-d); transform: translateY(-1px); box-shadow: 0 6px 20px var(--lime-glow); }
.hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
.hamburger span { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; transition: all .3s; }
.nav.solid .hamburger span { background: var(--g); }
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.mobile-menu { display: none; position: fixed; top: 66px; left: 0; right: 0; background: rgba(248,246,240,.98); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 20px 24px 28px; z-index: 190; transform: translateY(-10px); opacity: 0; transition: transform .3s ease, opacity .3s ease; pointer-events: none; }
.mobile-menu.open { transform: translateY(0); opacity: 1; pointer-events: auto; display: block; }
.mobile-menu ul { list-style: none; display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }
.mobile-menu ul li a { display: flex; align-items: center; gap: 12px; padding: 12px 4px; font-size: 16px; font-weight: 500; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border); transition: color .2s, padding-left .2s; }
.m-nav-ic { width: 36px; height: 36px; border-radius: 10px; background: var(--g-light); color: var(--g); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mobile-menu ul li a:hover { color: var(--g); padding-left: 8px; }
.mobile-menu ul li a:hover .m-nav-ic { background: var(--g); color: #fff; }
.mobile-menu-btns { display: flex; gap: 10px; margin-top: 12px; }
.mobile-menu-btns a { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 100px; font-weight: 600; font-size: 14px; text-decoration: none; transition: all .2s; }
.mb-ghost { border: 1.5px solid var(--g); color: var(--g); }
.mb-lime { background: var(--lime); color: var(--g); }
.marquee-section { width: 100%; overflow: hidden; background: var(--g); padding: 14px 0; }
.trust-row { display: flex; gap: 24px; font-size: 14px; font-weight: 500; flex-wrap: wrap; }
@media(max-width: 768px) { .trust-row { justify-content: center; gap: 16px; } }

/* HERO OVERHAUL */
.hero-section {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #F7F7F2;
  width: 100%;
}

/* Animated Mesh Gradient Background */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: #0B3D2E;
  overflow: hidden;
}

.mesh-blob {
  position: absolute;
  filter: blur(80px);
  opacity: 0.6;
  border-radius: 50%;
  animation: moveBlob 20s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
}
.blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #D9F24C; animation-delay: 0s; }
.blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: #DDE5D7; animation-delay: -5s; opacity: 0.4;}
.blob-3 { top: 40%; left: 50%; width: 40vw; height: 40vw; background: #2A5C40; animation-delay: -10s; }

@keyframes moveBlob {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10vw, 5vh) scale(1.1); }
  100% { transform: translate(-5vw, 10vh) scale(0.9); }
}

/* Mountains */
.hero-mountains {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30vh;
  z-index: 1;
  pointer-events: none;
}
.mt-layer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background-size: cover;
  background-position: bottom center;
  background-repeat: repeat-x;
}
.mt-back { height: 100%; background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1440 320' xmlns='http://www.w3.org/2000/svg'><path fill='%232A5C40' fill-opacity='0.3' d='M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'></path></svg>"); animation: pxBack 30s linear infinite alternate; }
.mt-front { height: 70%; background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 1440 320' xmlns='http://www.w3.org/2000/svg'><path fill='%230B3D2E' d='M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,224C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'></path></svg>"); animation: pxFront 20s linear infinite alternate; }

@keyframes pxBack { from { transform: translateX(0); } to { transform: translateX(-5%); } }
@keyframes pxFront { from { transform: translateX(0); } to { transform: translateX(-2%); } }

/* Dots and Routes */
.hero-particles {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.route-line {
  position: absolute;
  width: 300px;
  height: 150px;
  border-top: 2px dashed rgba(255,255,255,0.2);
  border-radius: 50%;
  top: 30%;
  left: 20%;
  transform: rotate(-15deg);
  animation: dashAnim 20s linear infinite;
}
@keyframes dashAnim {
  to { border-top-color: rgba(217,242,76,0.5); transform: rotate(-15deg) scale(1.05); }
}

/* Hero inner layout */
.hero-inner {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 130px 40px 90px;
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 60px;
  align-items: center;
  width: 100%;
}
.hero-left h1 {
 
  font-size: clamp(32px, 5.5vw, 68px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: #fff;
  margin-bottom: 24px;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}
.hero-left h1 em {
  font-style: normal;
  color: #D9F24C;
  position: relative;
  display: inline-block;
}
.hero-left p {
  font-size: 18px;
  color: rgba(255,255,255,0.8);
  line-height: 1.6;
  max-width: 500px;
  margin-bottom: 40px;
}
.hero-ctas {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.cta-primary {
  background: #D9F24C;
  color: #0B3D2E;
 
  font-size: 16px;
  font-weight: 800;
  padding: 16px 32px;
  border-radius: 100px;
  text-decoration: none;
  box-shadow: 0 8px 32px rgba(217,242,76,0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.cta-primary:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(217,242,76,0.5);
  background: #C8E64C;
}
.cta-secondary {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(12px);
  font-size: 16px;
  font-weight: 600;
  padding: 15px 32px;
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.3s;
}
.cta-secondary:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

/* Floating Mockup */
.hero-right {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 600px;
}
.phone-mockup {
  position: relative;
  width: 300px;
  height: 620px;
  background: #fff;
  border-radius: 44px;
  padding: 12px;
  box-shadow: 0 30px 80px rgba(11,61,46,0.5), inset 0 0 0 2px rgba(255,255,255,0.5);
  animation: floatPhone 6s ease-in-out infinite;
  z-index: 5;
  will-change: transform;
  -webkit-font-smoothing: antialiased;
}
.phone-screen {
  background: #F8F6F0;
  width: 100%;
  height: 100%;
  border-radius: 32px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
.phone-notch {
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 120px; height: 28px;
  background: #fff;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  z-index: 10;
}
.mockup-inner {
  padding: 24px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}
.mockup-inner::-webkit-scrollbar { display: none; }
.m-profile { text-align: center; margin-bottom: 8px; }
.m-avatar { width: 72px; height: 72px; background: #DDE5D7; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.m-name { font-size: 18px; font-weight: 800; color: #1a3d2b; }
.m-bio { font-size: 12px; color: #6b7c72; margin-top: 4px; }
.m-card { background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); display: flex; align-items: center; gap: 12px; transition: transform 0.2s; cursor: pointer; }
.m-card:hover { transform: scale(1.02); }
.m-card-icon { width: 44px; height: 44px; border-radius: 12px; background: #f0f8d0; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.m-card-info h5 { font-size: 14px; font-weight: 700; color: #1a3d2b; margin-bottom: 2px; }
.m-card-info p { font-size: 11px; color: #6b7c72; }

@keyframes floatPhone {
  0%, 100% { transform: translateZ(0) translateY(0) rotate(0deg); }
  50% { transform: translateZ(0) translateY(-15px) rotate(-1deg); }
}

/* Floating Glass Cards */
.glass-badge {
  position: absolute;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.3);
  padding: 12px 18px;
  border-radius: 100px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  z-index: 6;
  white-space: nowrap;
}
.badge-1 { top: 15%; left: -10%; animation: floatBadge 5s ease-in-out infinite 0.5s; }
.badge-2 { bottom: 25%; left: -25%; animation: floatBadge 6s ease-in-out infinite 1s; }
.badge-3 { top: 35%; right: -25%; animation: floatBadge 5.5s ease-in-out infinite 1.5s; background: rgba(217,242,76,0.9); color: #0B3D2E; border-color: #D9F24C; }
.badge-4 { bottom: 10%; right: -15%; animation: floatBadge 4.5s ease-in-out infinite 2s; }

@keyframes floatBadge {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}



/* MARQUEE */
.marquee-section { background: var(--g); overflow: hidden; padding: 14px 0; }
.marquee-track { display: flex; gap: 0; width: max-content; animation: marquee 28s linear infinite; }
.marquee-track:hover { animation-play-state: paused; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-item { display: flex; align-items: center; gap: 10px; padding: 0 36px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.7); white-space: nowrap; border-right: 1px solid rgba(255,255,255,.1); }
.marquee-item span { color: var(--lime); font-size: 16px; }

/* SECTIONS */
.section { max-width: 1200px; margin: 0 auto; padding: 90px 40px; }
.section-top { text-align: center; margin-bottom: 56px; }
.eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 12px; }
.eyebrow::before, .eyebrow::after { content: ''; flex: 0 0 28px; height: 1px; background: var(--border); }
.section-top h2 { font-size: clamp(26px, 3.8vw, 44px); font-weight: 800; color: var(--g); line-height: 1.1; letter-spacing: -.02em; margin-bottom: 12px; }
.section-top p { font-size: 16px; color: var(--muted); max-width: 500px; margin: 0 auto; line-height: 1.7; }
.rv { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
.rv.on { opacity: 1; transform: translateY(0); }
.rv-delay-1 { transition-delay: .1s; } .rv-delay-2 { transition-delay: .2s; } .rv-delay-3 { transition-delay: .3s; } .rv-delay-4 { transition-delay: .4s; }
.rv-scale { opacity: 0; transform: scale(.93); transition: opacity .65s ease, transform .65s ease; }
.rv-scale.on { opacity: 1; transform: scale(1); }

/* FEATURES */
.feats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feat { background: #fff; border: 1.5px solid var(--border); border-radius: var(--radius-card); padding: 28px 24px; transition: transform .3s, box-shadow .3s, border-color .3s; position: relative; overflow: hidden; }
.feat::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--lime), var(--gm)); transform: scaleX(0); transform-origin: left; transition: transform .35s; }
.feat:hover::after { transform: scaleX(1); }
.feat:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); border-color: var(--lime); }
.feat-ic { width: 52px; height: 52px; border-radius: 14px; background: var(--lime-p); border: 1.5px solid var(--lime); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; transition: transform .3s; }
.feat:hover .feat-ic { transform: rotate(-6deg) scale(1.1); }
.feat h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.feat p { font-size: 14px; color: var(--muted); line-height: 1.65; }

/* HOW IT WORKS */
.how-wrap { background: #fff; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; overflow: hidden; }
.how-wrap::before { content: ''; position: absolute; right: -80px; top: -80px; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(200,230,76,.06), transparent 70%); pointer-events: none; }
.how-inner { max-width: 1200px; margin: 0 auto; padding: 90px 40px; }
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }
.steps-line { position: absolute; top: 25px; left: 12%; right: 12%; height: 2px; background: var(--border); overflow: hidden; }
.steps-fill { height: 100%; width: 0; background: linear-gradient(90deg, var(--lime), var(--gm)); transition: width 1.4s .3s ease; }
.steps-fill.go { width: 100%; }
.step { text-align: center; position: relative; z-index: 1; }
.step-n { width: 50px; height: 50px; border-radius: 50%; background: var(--g); color: var(--lime); font-size: 19px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; border: 3px solid var(--bg); box-shadow: 0 0 0 2.5px var(--lime), var(--shadow-md); transition: transform .3s, box-shadow .3s; }
.step:hover .step-n { transform: scale(1.15) rotate(-5deg); box-shadow: 0 0 0 2.5px var(--lime), 0 8px 28px var(--lime-glow); }
.step h4 { font-size: 15px; font-weight: 700; margin-bottom: 7px; }
.step p { font-size: 13px; color: var(--muted); padding: 0 10px; line-height: 1.65; }

/* WHO FOR */
.tabs { display: flex; gap: 10px; margin-bottom: 26px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { white-space: nowrap; padding: 10px 22px; border-radius: 100px; border: 1.5px solid var(--border); background: #fff; font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .25s; flex-shrink: 0; }
.tab.on { background: var(--g); color: #fff; border-color: var(--g); }
.tab:hover:not(.on) { border-color: var(--g); color: var(--g); }
.panel { display: none; background: #fff; border: 1.5px solid var(--border); border-radius: 28px; padding: 36px; }
.panel.on { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: start; animation: panelIn .4s ease both; }
@keyframes panelIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.panel-left h3 { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
.panel-desc { font-size: 15px; color: var(--muted); line-height: 1.75; margin-bottom: 20px; }
.wlist { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.wlist li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.55; }
.wck { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; background: var(--lime-p); border: 1.5px solid var(--lime); display: flex; align-items: center; justify-content: center; margin-top: 1px; transition: background .2s, transform .2s; }
.wlist li:hover .wck { background: var(--lime); transform: scale(1.15); }
.wck svg { width: 10px; height: 10px; stroke: var(--g); stroke-width: 2.5; fill: none; }
.earn-box { background: var(--bg); border: 1.5px solid var(--border); border-radius: 18px; padding: 22px; position: relative; overflow: hidden; }
.earn-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--lime), var(--gm)); }
.earn-box h4 { font-size: 12.5px; font-weight: 700; color: var(--muted); margin-bottom: 14px; }
.earn-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; }
.earn-row:last-child { border: none; }
.earn-row .l { color: var(--muted); } .earn-row .v { font-weight: 600; }
.earn-row .v.big { font-size: 21px; font-weight: 800; color: var(--g); }

/* PRICING */
.pricing-wrap { background: var(--g); position: relative; overflow: hidden; }
.pricing-wrap::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: 56px 56px; }
.pricing-wrap::after { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 800px; height: 400px; background: radial-gradient(ellipse, rgba(200,230,76,.07) 0%, transparent 65%); pointer-events: none; }
.pricing-inner { max-width: 1200px; margin: 0 auto; padding: 90px 40px; position: relative; z-index: 1; }
.pricing-inner .section-top h2 { color: #fff; }
.pricing-inner .section-top p { color: rgba(255,255,255,.55); }
.pricing-inner .eyebrow { color: var(--lime); }
.pricing-inner .eyebrow::before, .pricing-inner .eyebrow::after { background: rgba(255,255,255,.1); }
.p-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.pc { background: rgba(255,255,255,.05); border: 1.5px solid rgba(255,255,255,.1); border-radius: 26px; padding: 30px 24px; position: relative; transition: transform .3s, box-shadow .3s, border-color .3s; backdrop-filter: blur(4px); }
.pc:hover { transform: translateY(-7px); box-shadow: 0 28px 72px rgba(0,0,0,.3); }
.pc.hot { background: rgba(200,230,76,.07); border-color: rgba(200,230,76,.35); }
.pc.hot:hover { border-color: var(--lime); box-shadow: 0 28px 72px rgba(200,230,76,.12); }
.hot-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--lime); color: var(--g); font-size: 10px; font-weight: 800; letter-spacing: .1em; padding: 4px 14px; border-radius: 100px; white-space: nowrap; }
.p-tier { font-size: 10px; font-weight: 800; letter-spacing: .12em; color: rgba(255,255,255,.38); text-transform: uppercase; margin-bottom: 8px; }
.p-tier.hi { color: var(--lime); }
.p-price { font-size: 38px; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 5px; }
.p-cycle { font-size: 12.5px; color: rgba(255,255,255,.4); margin-bottom: 22px; }
.p-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.p-list li { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: rgba(255,255,255,.7); transition: color .2s, transform .2s; }
.p-list li:hover { color: #fff; transform: translateX(3px); }
.p-list li::before { content: '✓'; flex-shrink: 0; width: 19px; height: 19px; border-radius: 50%; background: rgba(200,230,76,.12); display: inline-flex; align-items: center; justify-content: center; font-size: 9px; color: var(--lime); font-weight: 900; }
.p-btn { display: block; margin-top: 26px; border-radius: 100px; padding: 12px; text-align: center; text-decoration: none; font-weight: 700; font-size: 14px; transition: all .25s; }
.pc:not(.hot) .p-btn { background: rgba(255,255,255,.08); color: #fff; border: 1.5px solid rgba(255,255,255,.15); }
.pc:not(.hot) .p-btn:hover { background: rgba(255,255,255,.16); }
.pc.hot .p-btn { background: var(--lime); color: var(--g); border: none; }
.pc.hot .p-btn:hover { background: var(--lime-d); transform: translateY(-2px); box-shadow: 0 8px 24px var(--lime-glow); }
.nums { border-top: 1px solid rgba(255,255,255,.07); display: grid; grid-template-columns: repeat(3, 1fr); position: relative; z-index: 1; }
.num-i { padding: 44px; border-right: 1px solid rgba(255,255,255,.07); text-align: center; transition: background .3s; }
.num-i:last-child { border: none; }
.num-i:hover { background: rgba(255,255,255,.02); }
.num-n { font-size: 50px; font-weight: 800; color: var(--lime); display: block; line-height: 1; margin-bottom: 6px; transition: transform .3s; }
.num-i:hover .num-n { transform: scale(1.07); }
.num-l { font-size: 13.5px; color: rgba(255,255,255,.42); }
.final { max-width: 1200px; margin: 0 auto; padding: 90px 40px; text-align: center; position: relative; }
.final-orb { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 600px; height: 300px; background: radial-gradient(ellipse, rgba(200,230,76,.13) 0%, transparent 65%); pointer-events: none; }
.final h2 { font-size: clamp(28px, 4.2vw, 52px); font-weight: 800; color: var(--g); letter-spacing: -.02em; line-height: 1.1; margin-bottom: 14px; }
.final p { font-size: 17px; color: var(--muted); margin-bottom: 34px; line-height: 1.7; }
.final-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.fcta { display: inline-flex; align-items: center; gap: 10px; background: var(--lime); color: var(--g); font-size: 16px; font-weight: 800; border-radius: 100px; padding: 18px 36px; text-decoration: none; transition: all .28s; position: relative; overflow: hidden; }
.fcta::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); transform: translateX(-100%); animation: shim 2.5s ease-in-out infinite 1s; }
.fcta:hover { background: var(--lime-d); transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 56px rgba(200,230,76,.38); }
.fcta-arrow { width: 26px; height: 26px; border-radius: 50%; background: var(--g); display: flex; align-items: center; justify-content: center; font-size: 13px; transition: transform .25s; }
.fcta:hover .fcta-arrow { transform: translateX(5px); }
.fcta-wa { display: inline-flex; align-items: center; gap: 10px; background: #fff; color: var(--g); border: 1.5px solid var(--border); font-size: 15px; font-weight: 600; border-radius: 100px; padding: 16px 28px; text-decoration: none; transition: all .25s; }
.fcta-wa:hover { border-color: var(--g); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.wa { position: fixed; bottom: 28px; right: 28px; z-index: 90; background: #25d366; color: #fff; border-radius: 100px; padding: 13px 20px; display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 700; text-decoration: none; box-shadow: 0 6px 28px rgba(37,211,102,.45); transition: transform .25s, box-shadow .25s; animation: fadeU .7s 2.5s ease both; }
.wa:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 14px 44px rgba(37,211,102,.5); }
.wa-ic { font-size: 18px; }
@keyframes fadeU { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeD { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shim { to { transform: translateX(200%); } }
@media(max-width: 1024px) {
  .hero-inner { grid-template-columns: 1fr; gap: 40px; padding: 100px 20px 60px; text-align: center; min-height: auto; width: 100%; max-width: 100%; overflow: hidden; }
  .hero-left h1 { margin: 0 auto; max-width: 800px; }
  .hero-left p { margin-left: auto; margin-right: auto; max-width: 600px; }
  .hero-ctas { justify-content: center; }
  .hero-right { height: auto; min-height: 320px; padding: 10px 0; }
  .badge-1, .badge-2, .badge-3, .badge-4 { display: none; }
  .feats-grid { grid-template-columns: 1fr 1fr; gap: 20px; }
  .steps { grid-template-columns: 1fr 1fr; gap: 28px; }
  .steps-line { display: none; }
  .panel.on { grid-template-columns: 1fr; }
  .p-grid { grid-template-columns: 1fr; gap: 24px; }
  .nums { grid-template-columns: 1fr; }
  .num-i { border-right: none; border-bottom: 1px solid rgba(255,255,255,.07); padding: 24px; }
  .nav { padding: 0 20px; }
  .section, .how-inner, .pricing-inner, .final { padding: 50px 20px; }

}
@media(max-width: 768px) {
  .nav-links { display: none; }
  .nav-r .btn-ghost { display: none; }
  .nav-r { gap: 8px; }
  .hamburger { display: flex; margin-left: 4px; }
  .nav-r .btn-lime { font-size: 11px; padding: 7px 12px; white-space: nowrap; flex-shrink: 0; }
  .feats-grid { grid-template-columns: 1fr; }
  .steps { grid-template-columns: 1fr; }
  .section, .how-inner, .pricing-inner, .final { padding: 48px 20px; }

  .final-btns { flex-direction: column; align-items: center; width: 100%; }
  .final-btns .fcta, .final-btns .fcta-wa { width: 100%; justify-content: center; }
  .hero-left h1 { font-size: clamp(28px, 8vw, 40px); line-height: 1.1; letter-spacing: -0.01em; }
  .hero-left p { font-size: 15px; margin-bottom: 24px; }
  .phone-mockup { transform: scale(0.85); transform-origin: center top; margin-bottom: -40px; max-width: 270px; }
}
@media(max-width: 480px) {
  .nav-r .btn-lime { display: none; }
  .nav { padding: 0 16px; }
  .hero-inner { padding: 70px 12px 30px; }
  .hero-left h1 { font-size: 28px; }
  .hero-ctas { flex-direction: column; width: 100%; gap: 10px; }
  .hero-ctas .cta-primary, .hero-ctas .cta-secondary { width: 100%; justify-content: center; }
  .hero-right { min-height: 280px; padding: 0; margin-top: -20px; }
  .phone-mockup { transform: scale(0.68); margin-bottom: -160px; }
  .section-top h2 { font-size: 22px; }
  .p-price { font-size: 26px; }
  .num-n { font-size: 32px; }
  .marquee-item { padding: 0 12px; font-size: 10px; }
}
`;

export default function LinkInBioLanding() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("hs");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSolid, setIsSolid] = useState(false);



  useEffect(() => {
    // SCROLL EVENTS
    const prog = document.getElementById('prog');
    const nav = document.getElementById('nav');

    const handleScroll = () => {
      if (prog) {
        const h = document.body.scrollHeight - window.innerHeight;
        prog.style.width = (window.scrollY / h * 100) + '%';
      }
      setIsSolid(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // OBSERVERS
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.rv, .rv-scale').forEach(el => io.observe(el));

    const stO = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          const stFill = document.getElementById('stFill');
          if (stFill) stFill.classList.add('go');
          stO.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    const sw = document.getElementById('stepsWrap');
    if (sw) stO.observe(sw);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      io.disconnect();
      stO.disconnect();
    };
  }, []);



  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div id="prog"></div>

      <nav className={`nav ${isSolid ? 'solid' : ''}`} id="nav">
        <Link to="/" className="flex items-center">
          <DynamicLogo
            forceTheme={isSolid ? "light" : "dark"}
            lightHeightClass="h-7"
            darkHeightClass="h-10"
          />
        </Link>
        <ul className="nav-links">
          <li><Link to="/destinations"><MapPin size={16} /> Destinations</Link></li>
          <li><Link to="/stays"><Home size={16} /> Stays</Link></li>
          <li><Link to="/hotels"><Building size={16} /> Hotels</Link></li>
          <li><Link to="/resorts"><Palmtree size={16} /> Resorts</Link></li>
          <li><Link to="/bikes"><Bike size={16} /> Bikes</Link></li>
          <li><Link to="/cars"><Car size={16} /> Cars</Link></li>
          <li><Link to="/experiences"><Compass size={16} /> Experiences</Link></li>
        </ul>
        <div className="nav-r">
          {!user && <Link to="/auth" className="btn-ghost">Login</Link>}
          {user && <Link to="/host" className="btn-ghost">Dashboard</Link>}
          <Link to={user ? "/host" : "/auth"} className="btn-lime">Get started free</Link>
          <button className={`hamburger ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`} id="mobileMenu">
        <ul>
          <li><Link to="/destinations" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><MapPin size={18} /></span> Destinations</Link></li>
          <li><Link to="/stays" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Home size={18} /></span> Stays</Link></li>
          <li><Link to="/hotels" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Building size={18} /></span> Hotels</Link></li>
          <li><Link to="/resorts" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Palmtree size={18} /></span> Resorts</Link></li>
          <li><Link to="/bikes" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Bike size={18} /></span> Bikes</Link></li>
          <li><Link to="/cars" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Car size={18} /></span> Cars</Link></li>
          <li><Link to="/experiences" onClick={() => setIsMenuOpen(false)}><span className="m-nav-ic"><Compass size={18} /></span> Experiences</Link></li>
        </ul>
        <div className="mobile-menu-btns">
          {!user && <Link to="/auth" className="mb-ghost" onClick={() => setIsMenuOpen(false)}><User size={18} /> Login</Link>}
          {user && <Link to="/host" className="mb-ghost" onClick={() => setIsMenuOpen(false)}><LayoutDashboard size={18} /> Dashboard</Link>}
          <Link to={user ? "/host" : "/auth"} className="mb-lime" onClick={() => setIsMenuOpen(false)}>Get started free</Link>
        </div>
      </div>

      <section className="hero-section">
        <div className="hero-bg">
          <div className="mesh-blob blob-1"></div>
          <div className="mesh-blob blob-2"></div>
          <div className="mesh-blob blob-3"></div>
        </div>
        <div className="hero-particles">
          <div className="route-line"></div>
          <div style={{ position: 'absolute', top: '20%', left: '15%', width: '6px', height: '6px', background: '#D9F24C', borderRadius: '50%', boxShadow: '0 0 12px #D9F24C', animation: 'pulseRing 2s infinite' }}></div>
          <div style={{ position: 'absolute', top: '60%', left: '45%', width: '4px', height: '4px', background: '#fff', borderRadius: '50%', opacity: 0.5 }}></div>
          <div style={{ position: 'absolute', top: '80%', left: '80%', width: '8px', height: '8px', background: '#DDE5D7', borderRadius: '50%', boxShadow: '0 0 20px #DDE5D7', animation: 'pulseRing 3s infinite' }}></div>
        </div>
        <div className="hero-mountains">
          <div className="mt-layer mt-back"></div>
          <div className="mt-layer mt-front"></div>
        </div>

        <div className="hero-inner">
          <div className="hero-left">
            <div className="wing-pill" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}><span className="pill-dot"></span>🔗 India's smart travel storefront</div>
            <h1>
              <span className="line"><span>Your travel business,</span></span>
              <span className="line"><span><em>one beautiful link</em> away.</span></span>
            </h1>
            <p>Bookings, stays, rentals and experiences — all inside one smart travel storefront. Live in minutes. Zero coding required.</p>
            <div className="hero-ctas">
              <Link to={user ? "/host" : "/auth"} className="cta-primary">Create Your Wing Bio<span style={{ fontSize: '18px' }}>→</span></Link>
              <Link to="/p/suresh-reddy" className="cta-secondary">View Demo</Link>
            </div>
            <div className="trust-row" style={{ color: 'rgba(255,255,255,0.7)', marginTop: '32px' }}>
              <span>✅ No website needed</span>
              <span>⚡ Connects to UPI</span>
              <span>💸 Lowest 10% fee</span>
            </div>
          </div>

          <div className="hero-right">
            <div className="glass-badge badge-1">⭐ 4.9 Rating</div>
            <div className="glass-badge badge-2">🔥 120+ Guests Hosted</div>
            <div className="glass-badge badge-3">💬 WhatsApp Bookings</div>
            <div className="glass-badge badge-4">🏕 Stay curators</div>



            <div className="phone-mockup">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="mockup-inner">
                  <div className="m-profile">
                    <div className="m-avatar">🧑🏽</div>
                    <div className="m-name">Chandra's Escapes</div>
                    <div className="m-bio">📍 Coorg, Karnataka</div>
                  </div>

                  <div className="m-card">
                    <div className="m-card-icon">🏡</div>
                    <div className="m-card-info">
                      <h5>Riverside Cabin</h5>
                      <p>₹4,500 / night · 2 Guests</p>
                    </div>
                  </div>
                  <div className="m-card">
                    <div className="m-card-icon">🚙</div>
                    <div className="m-card-info">
                      <h5>Airport Drop</h5>
                      <p>₹1,200 · Innova Crysta</p>
                    </div>
                  </div>
                  <div className="m-card" style={{ background: '#25D366', color: '#fff' }}>
                    <div className="m-card-icon" style={{ background: 'transparent' }}>💬</div>
                    <div className="m-card-info">
                      <h5 style={{ color: '#fff' }}>Chat on WhatsApp</h5>
                      <p style={{ color: 'rgba(255,255,255,0.8)' }}>Instant replies</p>
                    </div>
                  </div>
                  <div className="m-card">
                    <div className="m-card-icon">☕</div>
                    <div className="m-card-info">
                      <h5>Plantation Tour</h5>
                      <p>₹800 / person · 3 Hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee-section">
        <div className="marquee-track">
          <div className="marquee-item"><span>🏡</span> Homestay Hosts</div>
          <div className="marquee-item"><span>🚗</span> Cab Operators</div>
          <div className="marquee-item"><span>🏨</span> Resorts & Hotels</div>
          <div className="marquee-item"><span>🌿</span> Tour Guides</div>
          <div className="marquee-item"><span>💳</span> Direct Bookings</div>
          <div className="marquee-item"><span>🎫</span> Wing Pass QR</div>
          <div className="marquee-item"><span>⭐</span> WingPoints Rewards</div>
          <div className="marquee-item"><span>📊</span> Live Analytics</div>
          <div className="marquee-item"><span>💸</span> UPI Payouts in 24h</div>
          <div className="marquee-item"><span>🔗</span> One Link for Everything</div>
          <div className="marquee-item"><span>🏡</span> Homestay Hosts</div>
          <div className="marquee-item"><span>🚗</span> Cab Operators</div>
          <div className="marquee-item"><span>🏨</span> Resorts & Hotels</div>
          <div className="marquee-item"><span>🌿</span> Tour Guides</div>
          <div className="marquee-item"><span>💳</span> Direct Bookings</div>
          <div className="marquee-item"><span>🎫</span> Wing Pass QR</div>
          <div className="marquee-item"><span>⭐</span> WingPoints Rewards</div>
          <div className="marquee-item"><span>📊</span> Live Analytics</div>
          <div className="marquee-item"><span>💸</span> UPI Payouts in 24h</div>
          <div className="marquee-item"><span>🔗</span> One Link for Everything</div>
        </div>
      </div>

      <section className="section">
        <div className="section-top rv"><div className="eyebrow">What you get</div><h2>Everything a service provider needs</h2><p>No code. No website. Just fill in your details and your Wing Bio goes live in minutes.</p></div>
        <div className="feats-grid">
          <div className="feat rv rv-delay-1"><div className="feat-ic">👤</div><h3>Branded profile page</h3><p>Your name, photo, bio, and location — instantly professional. Share it anywhere as a single URL.</p></div>
          <div className="feat rv rv-delay-2"><div className="feat-ic">📋</div><h3>Up to 10 listings free</h3><p>Add homestays, cab routes, tours, or any service you offer — with photos, pricing, and availability.</p></div>
          <div className="feat rv rv-delay-3"><div className="feat-ic">💳</div><h3>Direct booking engine</h3><p>Guests book and pay directly — no middleman, no OTA. Just 10% platform fee on every direct booking.</p></div>
          <div className="feat rv rv-delay-1"><div className="feat-ic">🎫</div><h3>Wing Pass QR</h3><p>One QR code guests scan at check-in. KYC-verified, no paperwork, no manual ID checks — smooth every time.</p></div>
          <div className="feat rv rv-delay-2"><div className="feat-ic">⭐</div><h3>WingPoints rewards</h3><p>Guests earn points on every booking — keeps them coming back to you instead of the competition.</p></div>
          <div className="feat rv rv-delay-3"><div className="feat-ic">📊</div><h3>Booking analytics</h3><p>See views, clicks, and conversions on your Wing Bio in real time. Know exactly where your bookings come from.</p></div>
        </div>
      </section>

      <div className="how-wrap">
        <div className="how-inner">
          <div className="section-top rv"><div className="eyebrow">How it works</div><h2>Live in 4 steps</h2><p>From signup to your first booking — under 10 minutes.</p></div>
          <div className="steps" id="stepsWrap">
            <div className="steps-line"><div className="steps-fill" id="stFill"></div></div>
            <div className="step rv rv-delay-1"><div className="step-n">1</div><h4>Create your Wing Bio</h4><p>Sign up free, add your name, photo, and location. Your link is live instantly at xplorwing.com/your-name.</p></div>
            <div className="step rv rv-delay-2"><div className="step-n">2</div><h4>Add your services</h4><p>List stays, cabs, experiences — with photos, prices, and availability. Up to 10 listings free.</p></div>
            <div className="step rv rv-delay-3"><div className="step-n">3</div><h4>Share your link</h4><p>Post on WhatsApp Status, Instagram bio, Google Maps, or print it on your visiting card.</p></div>
            <div className="step rv rv-delay-4"><div className="step-n">4</div><h4>Get paid to UPI</h4><p>Razorpay handles payment. Money hits your UPI ID within 24 hours of check-out. Every time.</p></div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-top rv"><div className="eyebrow">Who is this for</div><h2>Built for every kind of travel provider</h2><p>Pick your role to see exactly how Wing Bio works for you.</p></div>
        <div className="tabs rv">
          <button className={`tab ${activeTab === 'hs' ? 'on' : ''}`} onClick={() => setActiveTab('hs')}>🏡 Homestay host</button>
          <button className={`tab ${activeTab === 'cb' ? 'on' : ''}`} onClick={() => setActiveTab('cb')}>🚗 Cab operator</button>
          <button className={`tab ${activeTab === 'rs' ? 'on' : ''}`} onClick={() => setActiveTab('rs')}>🏨 Resort / Hotel</button>
          <button className={`tab ${activeTab === 'tg' ? 'on' : ''}`} onClick={() => setActiveTab('tg')}>🌿 Tour guide</button>
        </div>
        <div className={`panel ${activeTab === 'hs' ? 'on' : ''}`}>
          <div className="panel-left"><h3>Homestay host</h3><p className="panel-desc">You rent out your home, a room, or a farm stay. Wing Bio replaces the need to list on MakeMyTrip or Airbnb — list for free and keep more of what you earn.</p>
            <ul className="wlist">
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>List up to 10 rooms or properties</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Show per-night pricing, amenities, and photos</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Collect advance via UPI — no cash uncertainty</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Wing Pass QR handles check-in ID verification</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Opt into the marketplace (20% only on marketplace bookings)</li>
            </ul>
          </div>
          <div className="earn-box"><h4>What you actually earn — ₹3,000/night example</h4>
            <div className="earn-row"><span className="l">Booking value</span><span className="v">₹3,000</span></div>
            <div className="earn-row"><span className="l">Xplorwing commission (10%)</span><span className="v">− ₹300</span></div>
            <div className="earn-row"><span className="l">Payment gateway (~2%)</span><span className="v">− ₹60</span></div>
            <div className="earn-row"><span className="l">You receive via UPI</span><span className="v big">₹2,640</span></div>
          </div>
        </div>
        <div className={`panel ${activeTab === 'cb' ? 'on' : ''}`}>
          <div className="panel-left"><h3>Cab operator</h3><p className="panel-desc">Share a single Wing Bio instead of negotiating prices on WhatsApp groups.</p>
            <ul className="wlist">
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>List multiple cab routes with flat pricing</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Advance UPI payment — no last-minute cancellations</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Share on WhatsApp Status, Instagram, Google Maps</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Just 10% fee — lowest in the market</li>
            </ul>
          </div>
          <div className="earn-box"><h4>What you actually earn — ₹2,400 cab route</h4>
            <div className="earn-row"><span className="l">Booking value</span><span className="v">₹2,400</span></div>
            <div className="earn-row"><span className="l">Xplorwing commission (10%)</span><span className="v">− ₹240</span></div>
            <div className="earn-row"><span className="l">Payment gateway (~2%)</span><span className="v">− ₹48</span></div>
            <div className="earn-row"><span className="l">You receive via UPI</span><span className="v big">₹2,112</span></div>
          </div>
        </div>
        <div className={`panel ${activeTab === 'rs' ? 'on' : ''}`}>
          <div className="panel-left"><h3>Resort / Hotel</h3><p className="panel-desc">A branded Wing Bio showing all your room types. Guests book without calling your front desk.</p>
            <ul className="wlist">
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Unlimited listings on Wing Pro (₹499/mo)</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Real-time booking analytics dashboard</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Priority support + dedicated onboarding</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>WingPoints keeps guests returning to your property</li>
            </ul>
          </div>
          <div className="earn-box"><h4>What you actually earn — ₹6,000/night resort room</h4>
            <div className="earn-row"><span className="l">Booking value</span><span className="v">₹6,000</span></div>
            <div className="earn-row"><span className="l">Xplorwing commission (10%)</span><span className="v">− ₹600</span></div>
            <div className="earn-row"><span className="l">Payment gateway (~2%)</span><span className="v">− ₹120</span></div>
            <div className="earn-row"><span className="l">You receive via UPI</span><span className="v big">₹5,280</span></div>
          </div>
        </div>
        <div className={`panel ${activeTab === 'tg' ? 'on' : ''}`}>
          <div className="panel-left"><h3>Tour guide</h3><p className="panel-desc">Your expertise, one shareable link. List treks, experiences, and day tours.</p>
            <ul className="wlist">
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>List experiences with per-person pricing</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>Set group size limits and availability windows</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>WingPoints encourages repeat bookings</li>
              <li><span className="wck"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-3.5" /></svg></span>KYC-verified guests only — safe, verified groups</li>
            </ul>
          </div>
          <div className="earn-box"><h4>What you actually earn — ₹800/person, 8 guests</h4>
            <div className="earn-row"><span className="l">Booking value</span><span className="v">₹6,400</span></div>
            <div className="earn-row"><span className="l">Xplorwing commission (10%)</span><span className="v">− ₹640</span></div>
            <div className="earn-row"><span className="l">Payment gateway (~2%)</span><span className="v">− ₹128</span></div>
            <div className="earn-row"><span className="l">You receive via UPI</span><span className="v big">₹5,632</span></div>
          </div>
        </div>
      </section>

      <div className="pricing-wrap">
        <div className="pricing-inner">
          <div className="section-top rv"><div className="eyebrow">Pricing</div><h2>Simple, transparent pricing</h2><p>Start free. Pay only when you earn — no subscriptions, no hidden fees.</p></div>
          <div className="p-grid">
            <div className="pc rv rv-delay-1">
              <div className="p-tier">Wing Starter</div><div className="p-price">Free</div><div className="p-cycle">Forever, no card required</div>
              <ul className="p-list"><li>Up to 10 listings</li><li>Wing Bio Public page</li><li>Wing Pass QR code</li><li>10% fee on direct bookings</li><li>Marketplace not included</li></ul>
              <Link to={user ? "/host" : "/auth"} className="p-btn">Get started free</Link>
            </div>
            <div className="pc hot rv rv-delay-2">
              <div className="hot-badge">MOST POPULAR</div>
              <div className="p-tier hi">Wing Pro</div><div className="p-price">₹499<span style={{ fontSize: '17px', fontWeight: 400 }}>/mo</span></div><div className="p-cycle">Best for active hosts</div>
              <ul className="p-list"><li>Unlimited listings</li><li>Marketplace opt-in (20% on marketplace)</li><li>Analytics dashboard</li><li>Priority support</li><li>10% fee on direct bookings</li></ul>
              <Link to={user ? "/host" : "/auth"} className="p-btn">Start Wing Pro</Link>
            </div>
            <div className="pc rv rv-delay-3">
              <div className="p-tier">Wing Franchise</div><div className="p-price">Custom</div><div className="p-cycle">For large operators</div>
              <ul className="p-list"><li>Manage multiple provider accounts</li><li>Offline hub branding</li><li>Revenue share model</li><li>Dedicated onboarding</li><li>Whiteglove KYC support</li></ul>
              <a href="mailto:sales@xplorwing.com" className="p-btn">Talk to sales</a>
            </div>
          </div>
        </div>
        <div className="nums">
          <div className="num-i rv"><span className="num-n">₹0*</span><span className="num-l">to set up Wing Bio</span></div>
          <div className="num-i rv rv-delay-2"><span className="num-n">10 min</span><span className="num-l">average onboarding time</span></div>
          <div className="num-i rv rv-delay-4"><span className="num-n">10%</span><span className="num-l">only on direct bookings earned</span></div>
        </div>
      </div>

      <section className="final">
        <div className="final-orb"></div>
        <h2 className="rv">Ready to create your Wing Bio?</h2>
        <p className="rv rv-delay-1">Join Xplorwing as a host — your storefront goes live in minutes, for free.</p>
        <div className="final-btns rv rv-delay-2">
          <Link to={user ? "/host" : "/auth"} className="fcta">Get started as a host<span className="fcta-arrow">→</span></Link>
          <a href="https://wa.me/919422799420?text=Hi%2C%20I%20want%20to%20create%20my%20Wing%20Link" className="fcta-wa" target="_blank" rel="noreferrer">💬 Chat on WhatsApp</a>
        </div>
      </section>

      <Footer />

      <a href="https://wa.me/919422799420?text=Hi%2C%20I%20want%20to%20create%20my%20Wing%20Link" className="wa" target="_blank" rel="noreferrer"><span className="wa-ic">💬</span><span>Chat with us</span></a>
    </>
  );
}
