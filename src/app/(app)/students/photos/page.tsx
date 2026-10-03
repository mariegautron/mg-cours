import type { Metadata } from "next";
import Link from "next/link";

import { PhotosImportForm } from "@/components/students/photos-import-form";

export const metadata: Metadata = { title: "Importer les photos" };

export default function ImportPhotosPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/students" className="text-sm underline underline-offset-2">
          ← Étudiants
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Importer le trombinoscope</h1>
        <p className="text-muted-foreground">
          Dépose le fichier de photos : je relie chaque photo à une fiche, tu vérifies, puis
          j’enregistre.
        </p>
      </div>
      <PhotosImportForm />
    </div>
  );
}
