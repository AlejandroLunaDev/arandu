"use client";

import Image from "next/image";
import Link from "next/link";
import qrcode from "qrcode-generator";
import { useInstall } from "./use-install";

// How to get the app, by device. On a phone the app runs only installed; on a desktop a QR takes it to the
// phone, and "Testar no navegador" opens it here, in a phone-sized column.

/** The QR for this deploy's own app: dev's opens dev, production's opens production. */
function qrFor(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createDataURL(4, 2);
}
export function InstallOptions() {
  const { where, install } = useInstall();

  if (where === "iphone")
    return (
      <p className="type-body text-text-muted">
        No Safari, toque em <strong className="text-text">Compartilhar</strong> e depois em{" "}
        <strong className="text-text">Adicionar à Tela de Início</strong>.
      </p>
    );

  if (where === "phone")
    return install ? (
      <button type="button" className="ar-btn ar-btn--primary" onClick={install}>
        Instalar o app
      </button>
    ) : (
      <p className="type-body text-text-muted">
        No menu do navegador, toque em <strong className="text-text">Instalar app</strong>.
      </p>
    );

  if (where === "desktop")
    return (
      <div className="flex flex-col items-center gap-3">
        <Image className="rounded-md" src={qrFor(`${location.origin}/app`)} alt="QR code que abre o Arandu no celular" width={160} height={160} unoptimized />
        <p className="type-label">Abra no seu celular</p>
        <Link className="ar-btn ar-btn--secondary ar-btn--sm" href="/app">
          Testar no navegador
        </Link>
      </div>
    );

  return null;
}
