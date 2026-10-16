import { RaffleApp } from "@/components/RaffleApp";
import { getRaffleConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Home() {
  return <RaffleApp config={getRaffleConfig()} />;
}
