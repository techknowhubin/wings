import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Search, Globe, AlertTriangle, CheckCircle2, Link as LinkIcon, FileText, AlertCircle, RefreshCw, BarChart } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SEODashboard() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "SEO Data Synced",
        description: "Latest data fetched from Google Search Console.",
      });
    }, 1500);
  };

  const metrics = [
    { title: "Indexed Pages", value: "248", target: "250", icon: Globe, status: "healthy", progress: 98 },
    { title: "Crawl Errors", value: "3", target: "0", icon: AlertCircle, status: "warning", progress: 10 },
    { title: "Missing Metadata", value: "12", target: "0", icon: FileText, status: "warning", progress: 15 },
    { title: "Broken Links", value: "0", target: "0", icon: LinkIcon, status: "healthy", progress: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO & Search Console</h1>
          <p className="text-muted-foreground mt-1">Monitor search performance and indexing health.</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} className="gap-2 shadow-sm rounded-xl">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync with Google
        </Button>
      </div>

      {/* Infrastructure Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sitemap Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              sitemap.xml <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Valid</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last pinged: Today</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Robots.txt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              robots.txt <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Crawling allowed</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Search className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Structured Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              JSON-LD <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Verified</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Org, Website, Navigation Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${metric.status === 'healthy' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                  {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{metric.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metric.value}</span>
                    <span className="text-xs text-muted-foreground">/ {metric.target}</span>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${metric.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Crawl Issues</CardTitle>
          <CardDescription>Issues reported by Googlebot during the last pass.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Missing OG Image</p>
                  <p className="text-xs text-muted-foreground">/destinations/unknown-city</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">Review</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Slow Page Load (LCP &gt; 2.5s)</p>
                  <p className="text-xs text-muted-foreground">/stays/manali-retreat</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">Analyze</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
