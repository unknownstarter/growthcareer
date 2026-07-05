/**
 * 수료증 미리보기 iframe (B0081).
 *
 * server component 가 HTML 을 만들어 srcDoc 으로 주입 — page 외부 CSS 와 격리,
 * 인쇄 시 iframe 단독 인쇄.
 */
type Props = {
  iframeId: string;
  html: string;
  title?: string;
};

export function CertificatePreviewFrame({
  iframeId,
  html,
  title = "수료증 미리보기",
}: Props) {
  return (
    <div className="mx-auto max-w-[210mm]">
      <iframe
        id={iframeId}
        title={title}
        srcDoc={html}
        className="h-[297mm] w-full rounded-md border border-neutral-200 bg-white shadow-lg"
      />
    </div>
  );
}
