// Gera o payload "PIX copia e cola" (BR Code / EMV QRCPS) estático,
// conforme o Manual de Padrões para Iniciação do Pix do Banco Central.

function campo(id: string, valor: string): string {
  return id + valor.length.toString().padStart(2, "0") + valor;
}

// Remove acentos e caracteres fora do padrão aceito pelos bancos.
function limpar(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-@]/g, "")
    .trim()
    .slice(0, max);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface DadosPix {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
  txid?: string;
}

export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }: DadosPix): string {
  const contaPix = campo("00", "br.gov.bcb.pix") + campo("01", chave.trim());
  const identificador = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  let payload =
    campo("00", "01") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor && valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(nome, 25) || "RECEBEDOR") +
    campo("60", limpar(cidade, 15) || "BRASIL") +
    campo("62", campo("05", identificador)) +
    "6304";

  payload += crc16(payload);
  return payload;
}
