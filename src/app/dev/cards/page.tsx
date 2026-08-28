import { notFound } from "next/navigation";
import { listDreamCards } from "@/domain/dream-card";
import { DreamCardDevLibrary } from "@/features/dream-player/dream-card-dev-library";

export default function CardLibraryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DreamCardDevLibrary cards={listDreamCards()} />;
}
