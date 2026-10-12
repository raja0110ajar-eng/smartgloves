"use client";

export default function TombolSuara({ url }: { url: string }) {
  return (
    <button type="button" onClick={() => new Audio(url).play().catch(() => {})}>
      Dengarkan
    </button>
  );
}