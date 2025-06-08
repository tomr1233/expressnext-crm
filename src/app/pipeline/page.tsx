import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineHeader } from "@/components/pipeline/pipeline-header";

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <PipelineHeader />
      <PipelineBoard />
    </div>
  );
}