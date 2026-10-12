"use client";

import { useState } from "react";

export default function VideoYoutube({ id, deskripsi }: { id: string; deskripsi: string }) {
  const [main, setMain] = useState(false);

  return (
    <span className="video">
      <span className="video-bingkai">
        {main ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
            title={deskripsi || "Video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className="video-tombol" onClick={() => setMain(true)}>
            Putar video
          </button>
        )}
      </span>
      <span className="video-teks">
        <strong>Video:</strong> {deskripsi}
        <br />
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
          Buka di YouTube
        </a>
        <span className="catatan">
          {" "}
          Memutar video memuat konten dari YouTube. Subtitle bisa dinyalakan lewat tombol CC di
          pemutar, kalau sudah ditambahkan pada videonya.
        </span>
      </span>
    </span>
  );
}