"use client";

import { useEffect } from "react";

// Tamanho normal do cursor em px.
const TAMANHO = 48;
// Enquanto o botão está pressionado a cabeça cresce até este fator (10 × 48 = 480px).
const ESCALA_MAXIMA = 10;
// Quanto cresce por segundo segurando o clique (multiplicativo: 1.8 = +80%/s).
const CRESCIMENTO_POR_SEGUNDO = 1.8;

// Recorte quadrado do rosto dentro da foto original (201×246).
const RECORTE = { x: 5, y: 33, lado: 190 };

/** Desenha a foto recortada em círculo com borda neon. Resolução alta para continuar nítida ao crescer. */
function desenharCabeca(img: HTMLImageElement): string {
  const lado = 256;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  const centro = lado / 2;
  const raio = centro - 12;

  ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(centro, centro, raio, 0, Math.PI * 2);
  ctx.fillStyle = "#05070d";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centro, centro, raio, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, RECORTE.x, RECORTE.y, RECORTE.lado, RECORTE.lado, centro - raio, centro - raio, raio * 2, raio * 2);
  ctx.restore();

  const borda = ctx.createLinearGradient(0, 0, lado, lado);
  borda.addColorStop(0, "#22d3ee");
  borda.addColorStop(1, "#a78bfa");
  ctx.beginPath();
  ctx.arc(centro, centro, raio, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = borda;
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

const EH_CAMPO_DE_TEXTO =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="date"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';

/**
 * Troca o cursor do site pela cabeça da foto em public/cursor-cabeca.png.
 * Segurando o clique, a cabeça vai crescendo até soltar. Em campos de texto
 * volta o cursor normal de digitação. Em telas de toque não faz nada.
 */
export function CursorCabeca() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelado = false;
    let limpar = () => {};

    const img = new Image();
    img.src = "/cursor-cabeca.png";
    img.onload = () => {
      if (cancelado) return;

      const cabeca = document.createElement("img");
      cabeca.src = desenharCabeca(img);
      cabeca.alt = "";
      cabeca.setAttribute("aria-hidden", "true");
      Object.assign(cabeca.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: `${TAMANHO}px`,
        height: `${TAMANHO}px`,
        pointerEvents: "none",
        zIndex: "2147483647",
        willChange: "transform",
        opacity: "0",
        transition: "opacity .15s",
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(cabeca);

      const estilo = document.createElement("style");
      estilo.textContent = `
        html, body, *, *::before, *::after { cursor: none !important; }
        ${EH_CAMPO_DE_TEXTO} { cursor: text !important; }
      `;
      document.head.appendChild(estilo);

      let x = -100;
      let y = -100;
      let escala = 1;
      let segurando = false;
      let inicioClique = 0;
      let escalaAoSoltar = 1;
      let momentoSoltou = 0;
      let quadro = 0;
      const DURACAO_VOLTA = 250; // ms para voltar ao normal depois de soltar

      // O tamanho depende só do tempo (e não de quantos quadros a tela desenhou),
      // então cresce igual em qualquer computador.
      const desenhar = () => {
        const agora = performance.now();
        if (segurando && !reduzirMovimento) {
          const segundos = (agora - inicioClique) / 1000;
          escala = Math.min(Math.pow(CRESCIMENTO_POR_SEGUNDO, segundos), ESCALA_MAXIMA);
        } else if (escala > 1) {
          const t = Math.min((agora - momentoSoltou) / DURACAO_VOLTA, 1);
          const suave = 1 - Math.pow(1 - t, 3); // ease-out
          escala = 1 + (escalaAoSoltar - 1) * (1 - suave);
        }
        cabeca.style.transform = `translate(${x - TAMANHO / 2}px, ${y - TAMANHO / 2}px) scale(${escala})`;
        quadro = requestAnimationFrame(desenhar);
      };
      quadro = requestAnimationFrame(desenhar);

      const mover = (e: PointerEvent) => {
        x = e.clientX;
        y = e.clientY;
        const emTexto = (e.target as Element | null)?.closest?.(EH_CAMPO_DE_TEXTO);
        cabeca.style.opacity = emTexto && !segurando ? "0" : "1";
      };
      const apertar = (e: PointerEvent) => {
        if (e.button !== 0) return;
        segurando = true;
        inicioClique = performance.now();
      };
      const soltar = () => {
        if (!segurando) return;
        segurando = false;
        escalaAoSoltar = escala;
        momentoSoltou = performance.now();
      };
      const sair = () => {
        cabeca.style.opacity = "0";
        soltar();
      };

      window.addEventListener("pointermove", mover, { passive: true });
      window.addEventListener("pointerdown", apertar, { passive: true });
      window.addEventListener("pointerup", soltar, { passive: true });
      window.addEventListener("pointercancel", soltar, { passive: true });
      window.addEventListener("blur", sair);
      document.documentElement.addEventListener("mouseleave", sair);

      limpar = () => {
        cancelAnimationFrame(quadro);
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerdown", apertar);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
        window.removeEventListener("blur", sair);
        document.documentElement.removeEventListener("mouseleave", sair);
        cabeca.remove();
        estilo.remove();
      };
    };

    return () => {
      cancelado = true;
      limpar();
    };
  }, []);

  return null;
}
