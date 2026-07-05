/**
 * Structured Data (JSON-LD) for SEO and GEO.
 *
 * Renders five schemas as <script type="application/ld+json"> inside the
 * Fan to Pro landing page. All schemas use the single source of truth in
 * `src/programs/fan-to-pro/domain/*` and `messages/{en,ko}.json` so they
 * stay in sync with the visible page content.
 *
 * Schemas:
 *  A. Organization      Growth Career and Dropdown Co., Ltd.
 *  B. Course            Fan to Pro bootcamp
 *  C. EducationEvent[]  8 sessions + 1 graduation = 9 events
 *  D. FAQPage           FAQ items from messages.faq.items
 *  E. LocalBusiness     Dropdown Co., Ltd. address and tax ID
 */
import { getTranslations } from "next-intl/server";
import { PRICING } from "@/src/programs/fan-to-pro/domain/pricing";
import {
  ENROLLMENT_CAP,
  OPERATOR,
  SCHEDULE,
} from "@/src/programs/fan-to-pro/domain/marketing/program-config";

const SITE_URL = "https://growthcareer.xyz";
const LOGO_URL = `${SITE_URL}/icon.png`;
const KAKAO_CHANNEL = "https://pf.kakao.com/_nxhDGX/chat";
const CONTACT_EMAIL = "hello@dropdown.xyz";

/**
 * Session schedule. Times left as date-only strings since per-session
 * start/end times are confirmed individually with enrolled students.
 * Saturdays 14:00 KST and Sundays 14:00 KST are placeholders so the
 * EducationEvent schema validates; tighten once we finalize times.
 */
const SESSIONS = [
  { date: "2026-06-27", day: "saturday", n: 1 },
  { date: "2026-06-28", day: "sunday", n: 2 },
  { date: "2026-07-04", day: "saturday", n: 3 },
  { date: "2026-07-05", day: "sunday", n: 4 },
  { date: "2026-07-11", day: "saturday", n: 5 },
  { date: "2026-07-12", day: "sunday", n: 6 },
  { date: "2026-07-18", day: "saturday", n: 7 },
  { date: "2026-07-19", day: "sunday", n: 8 },
] as const;

const GRADUATION_DATE = "2026-07-25";

type FAQItem = { q: string; a: string };

type StructuredDataProps = { locale: string };

export async function StructuredData({ locale }: StructuredDataProps) {
  const tMeta = await getTranslations({ locale, namespace: "meta.fanToPro" });
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const courseUrl =
    locale === "en"
      ? `${SITE_URL}/fan-to-pro`
      : `${SITE_URL}/${locale}/fan-to-pro`;

  const faqItems = tFaq.raw("items") as FAQItem[];

  const address = {
    "@type": "PostalAddress" as const,
    streetAddress: "201-J554, 2F, 207 Jungdae-ro",
    addressLocality: "Songpa-gu",
    addressRegion: "Seoul",
    postalCode: "05718",
    addressCountry: "KR",
  };

  // A. Organization
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Growth Career",
    alternateName: "Dropdown Co., Ltd.",
    url: SITE_URL,
    logo: LOGO_URL,
    description: tMeta("description"),
    address,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        url: KAKAO_CHANNEL,
        availableLanguage: ["Korean", "English"],
      },
    ],
    sameAs: [KAKAO_CHANNEL],
  };

  // B. Course
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Fan to Pro",
    description: tMeta("description"),
    url: courseUrl,
    inLanguage: "ko",
    provider: {
      "@type": "Organization",
      name: "Growth Career",
      sameAs: SITE_URL,
    },
    courseCode: "FTP-2026-1",
    educationalCredentialAwarded:
      "Certificate of Completion issued by Dropdown Co., Ltd.",
    occupationalCredentialAwarded:
      "Concert project participation letter issued by Union Pictures (for graduates who work the K-pop concert).",
    offers: {
      "@type": "Offer",
      price: String(PRICING.discounted),
      priceCurrency: PRICING.currency,
      availability: "https://schema.org/LimitedAvailability",
      validThrough: "2026-06-21T23:59:59+09:00",
      url: `${courseUrl}#apply`,
      category: "Tuition",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Onsite",
      startDate: SCHEDULE.firstSessionDate,
      endDate: GRADUATION_DATE,
      courseWorkload: "PT16H",
      maximumAttendeeCapacity: ENROLLMENT_CAP.totalSeats,
      location: {
        "@type": "Place",
        name: "Seoul (venue shared individually with confirmed students)",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Seoul",
          addressCountry: "KR",
        },
      },
      instructor: [
        {
          "@type": "Person",
          jobTitle: "K-pop live sound director",
          worksFor: { "@type": "Organization", name: "K-pop industry" },
        },
        {
          "@type": "Person",
          jobTitle: "K-pop A&R and visual director",
          worksFor: { "@type": "Organization", name: "K-pop industry" },
        },
        {
          "@type": "Person",
          jobTitle: "K-pop stage sound director",
          worksFor: { "@type": "Organization", name: "K-pop industry" },
        },
      ],
    },
  };

  // C. EducationEvent[] for 8 sessions + graduation
  const sessionEvents = SESSIONS.map((s) => ({
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: `Fan to Pro Session ${s.n}`,
    startDate: `${s.date}T14:00:00+09:00`,
    endDate: `${s.date}T16:00:00+09:00`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Seoul (venue shared individually with confirmed students)",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Seoul",
        addressCountry: "KR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: OPERATOR.legalName,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: String(PRICING.discounted),
      priceCurrency: PRICING.currency,
      availability: "https://schema.org/LimitedAvailability",
      validThrough: "2026-06-21T23:59:59+09:00",
      url: `${courseUrl}#apply`,
    },
  }));

  const graduationEvent = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: "Fan to Pro Graduation Ceremony",
    startDate: `${GRADUATION_DATE}T14:00:00+09:00`,
    endDate: `${GRADUATION_DATE}T17:00:00+09:00`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Seoul (venue shared individually with confirmed students)",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Seoul",
        addressCountry: "KR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: OPERATOR.legalName,
      url: SITE_URL,
    },
  };

  const events = [...sessionEvents, graduationEvent];

  // D. FAQPage
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  // E. LocalBusiness
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Dropdown Co., Ltd.",
    url: SITE_URL,
    image: LOGO_URL,
    address,
    email: CONTACT_EMAIL,
    vatID: OPERATOR.businessNumber,
    taxID: OPERATOR.businessNumber,
    priceRange: "₩₩",
    areaServed: { "@type": "Country", name: "Republic of Korea" },
  };

  return (
    <>
      <Script id="ld-organization" data={organization} />
      <Script id="ld-course" data={course} />
      <Script id="ld-events" data={events} />
      <Script id="ld-faq" data={faqPage} />
      <Script id="ld-localbusiness" data={localBusiness} />
    </>
  );
}

function Script({ id, data }: { id: string; data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script body
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
