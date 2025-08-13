import ReelClient from "../../components/ReelClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reels Downloader",
  description: "Download video or audio from a Reel URL.",
};

export default function ReelsPage() {
  return <ReelClient />;
}
