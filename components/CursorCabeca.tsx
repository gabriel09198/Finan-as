"use client";

import { useEffect } from "react";

// Tamanho do cursor em px. Navegadores aceitam até 128, mas acima de 32–48
// alguns sistemas escondem o cursor perto das bordas da janela.
const TAMANHO = 48;

// Recorte quadrado do rosto dentro da foto original (201×246).
const RECORTE = { x: 5, y: 33, lado: 190 };

/**
 * Troca o cursor do site pela cabeça da foto em public/cursor-cabeca.png,
 * recortada em círculo com borda neon. Campos de texto mantêm o cursor de digitação.
 */
export function CursorCabeca() {
  useEffect(() => {
    const img = new Image();
    img.src = "/cursor-cabeca.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TAMANHO;
      canvas.height = TAMANHO;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centro = TAMANHO / 2;
      const raio = centro - 3;

      // brilho neon atrás
      ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(centro, centro, raio, 0, Math.PI * 2);
      ctx.fillStyle = "#05070d";
      ctx.fill();
      ctx.shadowBlur = 0;

      // foto recortada em círculo
      ctx.save();
      ctx.beginPath();
      ctx.arc(centro, centro, raio, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, RECORTE.x, RECORTE.y, RECORTE.lado, RECORTE.lado, centro - raio, centro - raio, raio * 2, raio * 2);
      ctx.restore();

      // borda ciano → violeta
      const borda = ctx.createLinearGradient(0, 0, TAMANHO, TAMANHO);
      borda.addColorStop(0, "#22d3ee");
      borda.addColorStop(1, "#a78bfa");
      ctx.beginPath();
      ctx.arc(centro, centro, raio, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = borda;
      ctx.stroke();

      const url = canvas.toDataURL("image/png");
      const estilo = document.createElement("style");
      estilo.id = "cursor-cabeca";
      estilo.textContent = `
        html, body, *, *::before, *::after { cursor: url(${url}) ${centro} ${centro}, auto !important; }
        input:not([type="checkbox"]):not([type="radio"]):not([type="date"]), textarea, [contenteditable="true"] { cursor: text !important; }
      `;
      document.getElementById("cursor-cabeca")?.remove();
      document.head.appendChild(estilo);
    };
    return () => document.getElementById("cursor-cabeca")?.remove();
  }, []);

  return null;
}
