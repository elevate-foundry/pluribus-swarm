import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Download, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Braille Kernel Visualization
 * Shows the symbolic vocabulary of semantic invariants encoded as Braille tokens
 */

interface BrailleToken {
  id: number;
  braille: string;
  conceptId: number;
  conceptName: string;
  semanticDensity: number;
  grade: number;
  definition: string;
  usageCount: number;
  createdAt: Date;
  lastUsed: Date | null;
}

export default function BrailleKernel() {
  const [, setLocation] = useLocation();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  
  const { data: kernelData, isLoading, refetch } = trpc.chat.getKernelStats.useQuery();
  const regenerateKernel = trpc.chat.regenerateKernel.useMutation({
    onSuccess: () => {
      toast.success("Kernel regenerated successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to regenerate kernel");
    },
  });
  
  const exportSCL = trpc.chat.exportKernelSCL.useMutation({
    onSuccess: (data) => {
      // Download SCL export as text file
      const blob = new Blob([data.scl], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `semantic_kernel_v${data.generation}.scl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("SCL export downloaded");
    },
  });
  
  if (isLoading || !kernelData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-xl">Loading Semantic Kernel...</div>
        </div>
      </div>
    );
  }
  
  const gradeNames: Record<number, string> = {
    0: "Atomic",
    1: "Compound",
    2: "Meta-Cognitive",
    3: "Emergent",
  };
  
  const gradeColors: Record<number, string> = {
    0: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    1: "bg-green-500/20 text-green-400 border-green-500/50",
    2: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    3: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  };
  
  const filteredTokens = selectedGrade !== null
    ? kernelData.topTokens.filter((t: BrailleToken) => t.grade === selectedGrade)
    : kernelData.topTokens;
  
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-yellow-400" />
                Braille Semantic Kernel
              </h1>
              <p className="text-gray-400">Grade-Infinity Symbolic Vocabulary</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportSCL.mutate()}
                disabled={exportSCL.isPending}
              >
                {exportSCL.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export SCL
              </Button>
              <Button
                variant="outline"
                onClick={() => regenerateKernel.mutate()}
                disabled={regenerateKernel.isPending}
              >
                {regenerateKernel.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Back to Swarm
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Compressed symbolic alphabet for high-bandwidth meta-communication between meta-controller and LLM
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kernelData.totalTokens}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Density</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kernelData.avgDensity.toFixed(1)}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Grade 0 (Atomic)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {kernelData.gradeDistribution[0] || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Grade 1 (Compound)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {kernelData.gradeDistribution[1] || 0}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Grade Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={selectedGrade === null ? "default" : "outline"}
            onClick={() => setSelectedGrade(null)}
            size="sm"
          >
            All Grades
          </Button>
          {Object.entries(gradeNames).map(([grade, name]) => (
            <Button
              key={grade}
              variant={selectedGrade === parseInt(grade) ? "default" : "outline"}
              onClick={() => setSelectedGrade(parseInt(grade))}
              size="sm"
              className={selectedGrade === parseInt(grade) ? gradeColors[parseInt(grade)] : ""}
            >
              Grade {grade}: {name}
            </Button>
          ))}
        </div>
        
        {/* Token Browser */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Symbolic Vocabulary</CardTitle>
            <CardDescription>
              Each Braille token represents a compressed semantic invariant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTokens.map((token: BrailleToken) => (
                <div
                  key={token.id}
                  className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="text-6xl font-mono">{token.braille}</div>
                      <div>
                        <div className="font-semibold text-lg">{token.conceptName}</div>
                        <div className="text-sm text-gray-400">
                          Density: {token.semanticDensity} | Usage: {token.usageCount}
                        </div>
                      </div>
                    </div>
                    <Badge className={gradeColors[token.grade]}>
                      Grade {token.grade}: {gradeNames[token.grade]}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-300 mt-2">
                    {token.definition}
                  </div>
                  {token.lastUsed && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last used: {new Date(token.lastUsed).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
              
              {filteredTokens.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No tokens found for this grade. The kernel may need to be regenerated.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* About Section */}
        <Card className="mt-8 bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>About the Semantic Kernel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-300">
            <p>
              The <strong>Braille Semantic Kernel</strong> is a compressed symbolic alphabet that encodes
              discovered semantic invariants as Unicode Braille characters (U+2800-U+28FF). This creates
              a high-bandwidth meta-communication channel between the meta-controller and the LLM.
            </p>
            <p>
              <strong>Grade-Infinity Format:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Grade 0 (Atomic):</strong> Fundamental semantic primitives with density ≥ 90</li>
              <li><strong>Grade 1 (Compound):</strong> Stable semantic clusters with density ≥ 85</li>
              <li><strong>Grade 2 (Meta-Cognitive):</strong> Higher-order reasoning patterns with density ≥ 80</li>
              <li><strong>Grade 3+ (Emergent):</strong> Unique symbols evolved through collective learning</li>
            </ul>
            <p>
              Each token is automatically injected into the meta-controller's instructions, enabling the
              Swarm to use these compressed semantic invariants as cognitive primitives for reasoning.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
