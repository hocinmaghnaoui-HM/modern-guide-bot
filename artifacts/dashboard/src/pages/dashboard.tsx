import React from "react";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Users, FileText, Search, MessageSquare, Activity, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { data, isLoading, isError, error, isRefetching } = useGetStats({
    query: {
      queryKey: getGetStatsQueryKey(),
      refetchInterval: 30000,
    },
  });

  const formatDate = (dateString: string) => {
    try {
      const d = parseISO(dateString);
      return format(d, "PP pp", { locale: ar });
    } catch (e) {
      return dateString;
    }
  };

  const getFileBadge = (type: string) => {
    if (type === "pptx") {
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">PowerPoint</Badge>;
    }
    if (type === "word") {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Word</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  if (isError) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>
            حدث خطأ أثناء تحميل بيانات اللوحة. يرجى المحاولة لاحقاً.
            {error instanceof Error && <p className="mt-2 text-xs opacity-80">{error.message}</p>}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const overview = data?.overview;
  const recentFiles = data?.recentFiles || [];
  const recentSearches = data?.recentSearches || [];
  const recentUsers = data?.recentUsers || [];

  // Generate some fake chart data for the background of the cards
  const generateChartData = (base: number) => {
    return Array.from({ length: 15 }).map((_, i) => ({
      value: Math.max(0, base + Math.random() * (base * 0.5) - (base * 0.25))
    }));
  };

  const StatCard = ({ title, value, icon: Icon, loading, data: chartData }: { title: string, value?: number, icon: any, loading: boolean, data?: any[] }) => (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-md text-primary">
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <div className="flex flex-col">
            <div className="text-3xl font-bold tracking-tight text-foreground">{value?.toLocaleString("ar-EG")}</div>
            {chartData && (
              <div className="h-10 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${title})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              لوحة تحكم البوت الذكي
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isRefetching ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
              )}
              <span>متصل ونشط</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-400 border border-border hover:border-red-400/40 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container p-6 space-y-8 pb-20">
        
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="إجمالي المستخدمين" 
            value={overview?.totalUsers} 
            icon={Users} 
            loading={isLoading}
            data={overview ? generateChartData(overview.totalUsers) : undefined}
          />
          <StatCard 
            title="إجمالي الملفات" 
            value={overview?.totalFiles} 
            icon={FileText} 
            loading={isLoading}
            data={overview ? generateChartData(overview.totalFiles) : undefined}
          />
          <StatCard 
            title="عمليات البحث" 
            value={overview?.totalSearches} 
            icon={Search} 
            loading={isLoading}
            data={overview ? generateChartData(overview.totalSearches) : undefined}
          />
          <StatCard 
            title="الرسائل الكلية" 
            value={overview?.totalMessages} 
            icon={MessageSquare} 
            loading={isLoading}
            data={overview ? generateChartData(overview.totalMessages) : undefined}
          />
        </div>

        {/* Dashboard Panels */}
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Files Table (Col 8) */}
          <Card className="lg:col-span-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">الملفات المُنشأة</CardTitle>
                <CardDescription>أحدث العروض والمستندات التي تم توليدها</CardDescription>
              </div>
              {!isLoading && overview && (
                <div className="flex gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>PPTX ({overview.pptxCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Word ({overview.wordCount})</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">لا توجد ملفات حديثة.</div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-right w-[100px]">النوع</TableHead>
                        <TableHead className="text-right">الموضوع</TableHead>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-left">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentFiles.map((file, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell>{getFileBadge(file.type)}</TableCell>
                          <TableCell className="font-medium">{file.topic}</TableCell>
                          <TableCell className="text-muted-foreground">{file.userName}</TableCell>
                          <TableCell className="text-left text-muted-foreground text-sm tabular-nums">{formatDate(file.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Active Users Table (Col 4) */}
          <Card className="lg:col-span-4 border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">المستخدمون النشطون</CardTitle>
              <CardDescription>أكثر المستخدمين تفاعلاً مؤخراً</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentUsers.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">لا يوجد مستخدمين نشطين.</div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {recentUsers.map((user, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.userName}</span>
                          <span className="text-xs text-muted-foreground mt-1">آخر نشاط: {formatDate(user.lastSeen)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{user.messageCount} رسالة</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Recent Searches Table (Full Width) */}
          <Card className="lg:col-span-12 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">عمليات البحث الأخيرة</CardTitle>
              <CardDescription>أحدث استعلامات البحث والمصادر</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recentSearches.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">لا توجد عمليات بحث حديثة.</div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-right w-1/2">الاستعلام</TableHead>
                        <TableHead className="text-right">عدد النتائج</TableHead>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-left">الوقت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSearches.map((search, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell className="font-medium max-w-[300px] truncate" title={search.query}>
                            {search.query}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{search.resultCount}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{search.userName}</TableCell>
                          <TableCell className="text-left text-muted-foreground text-sm tabular-nums">{formatDate(search.searchedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
