You are a senior full-stack engineer, product designer, and product manager with experience at Toss, Kakao, and FastCampus.

Your task is to design and implement a high-converting landing page for a K-Entertainment Job Bootcamp targeting foreign students in Korea.

---

# 🧠 PRODUCT CONTEXT

This is NOT an education product.
This is a **career opportunity product**.

Target users:

* Foreign students in Korea
* Interested in K-pop / entertainment industry
* Want to get a job in Korean entertainment companies
* Lack real experience, portfolio, and network

Core value proposition:

* Real K-pop performance project participation
* Portfolio creation
* Networking with industry professionals
* Certificate issuance

Price:

* Original: 1,100,000 KRW
* Discounted: 880,000 KRW (VAT included)

---

# 🎯 GOAL

Maximize conversion (form submission + bank transfer intent)

---

# 🧱 TECH STACK

* Next.js 14 (App Router, SSR)
* Tailwind CSS
* Clean Architecture
* Component-based design system
* Supabase (optional backend for form submission)
* Deployable under route: `/kenterbc`

---

# 🧩 ARCHITECTURE

Follow Clean Architecture:

/kenterbc
  /domain
  /application
  /infrastructure
  /presentation

---

# 🎨 DESIGN PRINCIPLES

Inspired by:

* FastCampus landing pages
* TeamSparta landing pages
* Toss UX (simplicity & clarity)

Design direction:

* Minimal but high-impact
* Strong typography
* Clear hierarchy
* Conversion-focused
* Mobile-first

Tone:

* Korean-first (80% Korean, 20% English keywords)
* Professional, not playful

---

# 🎨 DESIGN SYSTEM

Define:

* Typography scale (hero, title, body)
* Color system:
  * Primary: Black / White
  * Accent: subtle premium color (e.g. gold or purple)
* Spacing system (8px grid)
* Button variants:
  * Primary CTA (fixed)
  * Secondary

---

# 🧩 COMPONENT SYSTEM

Must include:

* Sticky CTA Button
* Hero Section
* Problem Section
* Solution Section
* Value Cards (3)
* Program Timeline
* Outcome Section
* Pricing Section
* FAQ
* Apply Form (2-step)

---

# 🧱 PAGE STRUCTURE

1. Hero
2. Problem
3. Solution
4. Core Value (3 cards)
5. Program Structure
6. Outcome (very important)
7. Urgency (career gap)
8. Pricing (110 → 88)
9. FAQ
10. CTA

---

# ✍️ COPY (IMPORTANT)

All copy must be in Korean, with occasional English keywords.

Key messages:

* "한국 엔터테인먼트 업계 취업을 위한 실무 경험"
* "이력서에 쓸 수 있는 경험"
* "실제 공연 프로젝트 참여"
* "From fan to professional"

Avoid:

* "교육 프로그램"
* "강의 중심"

---

# 🧾 FORM DESIGN

2-step form:

Step 1:

* Name
* Email
* Phone

Step 2:

* Birthdate
* University
* Visa status
* Address

Final:

* Bank transfer info display
* Confirmation checkbox

---

# 🔌 BACKEND (Supabase)

Optional but recommended:

Table: applicants
Fields:

* name
* email
* phone
* birthdate
* university
* visa
* address
* created_at

---

# ⚡ UX REQUIREMENTS

* Sticky CTA always visible
* Fast loading (optimize images)
* Mobile-first
* Clear visual hierarchy
* No clutter / friction in form

---

# 📦 OUTPUT

1. Full page implementation (Next.js)
2. Reusable components
3. Clean file structure
4. Responsive design
5. Supabase integration (optional)

---

Start with:

* Page layout
* Design system
* Core components
* Then implement full page

Think step-by-step and produce production-ready code.
