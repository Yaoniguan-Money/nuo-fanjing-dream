import { notFound } from "next/navigation";
import { getDreamCard } from "@/domain/dream-card";
import { DreamExperience } from "@/features/dream-player/dream-experience";

interface DreamPageProps {
  params: Promise<{ cardId: string }>;
}

export default async function DreamPage({ params }: DreamPageProps) {
  const { cardId } = await params;
  const card = getDreamCard(cardId);
  if (!card) notFound();
  return <DreamExperience card={card} />;
}
