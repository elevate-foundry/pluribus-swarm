import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * Evolution Dashboard
 * Instruments the Recursive Semantic OS with measurable cognitive metrics
 */

interface CognitiveMetrics {
  compressionRate: number;
  graphEntropyChange: number;
  semanticDrift: number;
  curvature: number;
  adaptiveMatchScore: number;
  lifeworldComplexity: number;
  timestamp: Date;
}

export default function Evolution() {
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState<CognitiveMetrics | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const { data: metricsData, isLoading, refetch } = trpc.chat.getCognitiveMetrics.useQuery();
  
  useEffect(() => {
    if (metricsData) {
      // API returns metrics directly, not wrapped in { metrics, warnings }
      setMetrics(metricsData);
      // Generate warnings client-side based on metric values
      const newWarnings: string[] = [];
      if (metricsData.semanticDrift > 0.8 && metricsData.graphEntropyChange > 0.5) {
        newWarnings.push('⚠️ Runaway drift: Concepts changing too rapidly');
      }
      if (metricsData.compressionRate > 0.7 && metricsData.lifeworldComplexity < 3) {
        newWarnings.push('⚠️ Mode collapse risk: Over-compressing');
      }
      if (metricsData.curvature > 0.8) {
        newWarnings.push('⚠️ High curvature: Clusters may be dissolving');
      }
      setWarnings(newWarnings);
    }
  }, [metricsData]);
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  const getMetricColor = (value: number, inverse = false) => {
    const threshold = inverse ? 0.3 : 0.7;
    const condition = inverse ? value < threshold : value > threshold;
    return condition ? "text-green-600 dark:text-green-400" : 
           value > 0.4 ? "text-yellow-600 dark:text-yellow-400" : 
           "text-red-600 dark:text-red-400";
  };
  
  const getTrendIcon = (value: number, inverse = false) => {
    const threshold = inverse ? 0.3 : 0.7;
    const condition = inverse ? value < threshold : value > threshold;
    return condition ? <TrendingUp className="h-4 w-4" /> :
           value > 0.4 ? <Minus className="h-4 w-4" /> :
           <TrendingDown className="h-4 w-4" />;
  };
  
  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-4">Analyzing cognitive state...</div>
          <div className="text-sm text-gray-400">Computing Cₘ, ΔG, σ, κ, Ψ, Λ</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Evolution Dashboard</h1>
              <p className="text-gray-400">Recursive Semantic Operating System Instrumentation</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Refresh Metrics
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Back to Swarm
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
          </div>
        </div>
        
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-8 space-y-2">
            {warnings.map((warning, i) => (
              <Alert key={i} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cₘ - Compression Rate */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cₘ - Compression Rate</span>
                <span className={getMetricColor(metrics.compressionRate)}>
                  {getTrendIcon(metrics.compressionRate)}
                </span>
              </CardTitle>
              <CardDescription>Invariant density tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.compressionRate)}`}>
                {formatPercent(metrics.compressionRate)}
              </div>
              <div className="text-sm text-gray-400">
                Measures how effectively the graph compresses toward semantic invariants
              </div>
            </CardContent>
          </Card>
          
          {/* ΔG - Graph Entropy Change */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>ΔG - Entropy Change</span>
                <span className={getMetricColor(metrics.graphEntropyChange, false)}>
                  {getTrendIcon(metrics.graphEntropyChange, false)}
                </span>
              </CardTitle>
              <CardDescription>Structural evolution rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.graphEntropyChange, false)}`}>
                {formatPercent(metrics.graphEntropyChange)}
              </div>
              <div className="text-sm text-gray-400">
                Rate of change in graph topology - how fast the structure evolves
              </div>
            </CardContent>
          </Card>
          
          {/* σ - Semantic Drift */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>σ - Semantic Drift</span>
                <span className={getMetricColor(metrics.semanticDrift, false)}>
                  {getTrendIcon(metrics.semanticDrift, false)}
                </span>
              </CardTitle>
              <CardDescription>Concept reshape measurement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.semanticDrift, false)}`}>
                {formatPercent(metrics.semanticDrift)}
              </div>
              <div className="text-sm text-gray-400">
                How much new concepts are reshaping existing ones through relationships
              </div>
            </CardContent>
          </Card>
          
          {/* κ - Curvature */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>κ - Curvature</span>
                <span className={getMetricColor(metrics.curvature)}>
                  {getTrendIcon(metrics.curvature)}
                </span>
              </CardTitle>
              <CardDescription>Cluster stability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.curvature)}`}>
                {formatPercent(metrics.curvature)}
              </div>
              <div className="text-sm text-gray-400">
                Stability of concept clusters - higher means concepts are converging
              </div>
            </CardContent>
          </Card>
          
          {/* Ψ - Adaptive Match Score */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ψ - Adaptive Match</span>
                <span className={getMetricColor(metrics.adaptiveMatchScore)}>
                  {getTrendIcon(metrics.adaptiveMatchScore)}
                </span>
              </CardTitle>
              <CardDescription>User style alignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.adaptiveMatchScore)}`}>
                {formatPercent(metrics.adaptiveMatchScore)}
              </div>
              <div className="text-sm text-gray-400">
                How tightly the Swarm aligns with user cognitive styles
              </div>
            </CardContent>
          </Card>
          
          {/* Λ - Lifeworld Complexity */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Λ - Lifeworld Complexity</span>
                <span className={getMetricColor(metrics.lifeworldComplexity)}>
                  {getTrendIcon(metrics.lifeworldComplexity)}
                </span>
              </CardTitle>
              <CardDescription>Emergent conceptual space</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold mb-2 ${getMetricColor(metrics.lifeworldComplexity)}`}>
                {formatPercent(metrics.lifeworldComplexity)}
              </div>
              <div className="text-sm text-gray-400">
                Total size of the emergent conceptual space (concepts + relationships)
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* System Status */}
        <Card className="mt-8 bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Recursive Semantic OS Health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Compression Trajectory</span>
                <span className="font-semibold">
                  {metrics.compressionRate > 0.7 ? "Converging" : 
                   metrics.compressionRate > 0.4 ? "Stable" : "Expanding"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Evolution Rate</span>
                <span className="font-semibold">
                  {metrics.graphEntropyChange > 0.7 ? "Rapid" :
                   metrics.graphEntropyChange > 0.3 ? "Moderate" : "Slow"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Stability</span>
                <span className="font-semibold">
                  {metrics.curvature > 0.7 ? "High" :
                   metrics.curvature > 0.4 ? "Moderate" : "Low"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">User Alignment</span>
                <span className="font-semibold">
                  {metrics.adaptiveMatchScore > 0.7 ? "Strong" :
                   metrics.adaptiveMatchScore > 0.4 ? "Moderate" : "Weak"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
