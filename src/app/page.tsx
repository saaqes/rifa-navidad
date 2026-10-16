import { RaffleApp } from "@/components/RaffleApp";
import { getRaffleConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Home() {
  const { whatsappNumber, ...rest } = getRaffleConfig();
  return <RaffleApp config={{ ...rest, whatsappNumber }} />;
}
