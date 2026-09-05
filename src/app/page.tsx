import { ReviewWorkbench } from "@/components/review-workbench";
import { runEvaluation } from "@/lib/eval";

export default function Home() {
  const report = runEvaluation({ partition: "held_out", trialsPerCase: 5, seed: 1701 });
  return <ReviewWorkbench report={report} />;
}
