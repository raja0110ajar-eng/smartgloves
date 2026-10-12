import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VideoYoutube from "./VideoYoutube";
import { idYoutube } from "@/lib/youtube";

function teksDari(n: ReactNode): string {
  if (typeof n === "string") return n;
  if (Array.isArray(n)) return n.map(teksDari).join("");
  return "";
}

export default function IsiMarkdown({ isi }: { isi: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          const teks = teksDari(children);
          const id = href ? idYoutube(href) : null;
          if (id && /^video:\s*/i.test(teks)) {
            return <VideoYoutube id={id} deskripsi={teks.replace(/^video:\s*/i, "")} />;
          }
          return (
            <a href={href} rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        img({ src, alt }) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              decoding="async"
            />
          );
        },
      }}
    >
      {isi}
    </Markdown>
  );
}