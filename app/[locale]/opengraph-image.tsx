import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const runtime = "nodejs";
export const alt = "Fan to Pro / K-Entertainment Track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "meta.fanToPro",
  });
  const trackLabel = "K-Entertainment Track";

  const root = process.cwd();
  const [heroBuf, blackFont, semiFont] = await Promise.all([
    readFile(join(root, "public/images/stock/boy-group-concert-stage-3.jpg")),
    readFile(join(root, "assets/fonts/Pretendard-Black.otf")),
    readFile(join(root, "assets/fonts/Pretendard-SemiBold.otf")),
  ]);
  const heroSrc = `data:image/jpeg;base64,${heroBuf.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0a0a0f",
          fontFamily: "Pretendard",
        }}
      >
        <img
          src={heroSrc}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(110deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 45%, rgba(10,10,15,0.55) 75%, rgba(10,10,15,0.85) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 16,
            height: "100%",
            background: "#ec4899",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
            color: "white",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.32em",
                color: "#ec4899",
                textTransform: "uppercase",
              }}
            >
              Growth Career
            </div>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.4)",
              }}
            />
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.32em",
                color: "rgba(255,255,255,0.7)",
                textTransform: "uppercase",
              }}
            >
              {trackLabel}
            </div>
          </div>
          <div
            style={{
              fontSize: 220,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              lineHeight: 0.92,
              color: "white",
              display: "flex",
            }}
          >
            Fan to Pro.
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "rgba(255,255,255,0.92)",
              maxWidth: 920,
              lineHeight: 1.25,
              display: "flex",
            }}
          >
            {t("ogAlt")}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: blackFont, weight: 900, style: "normal" },
        { name: "Pretendard", data: semiFont, weight: 600, style: "normal" },
      ],
    },
  );
}
