import { Metadata } from "next";
import { SharedCollectionView } from "./SharedCollectionView";

export const metadata: Metadata = {
  title: "Colección compartida - Stacklume",
  description: "Colección de enlaces compartida mediante Stacklume",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedCollectionPage({ params }: PageProps) {
  const { token } = await params;

  return <SharedCollectionView token={token} />;
}
