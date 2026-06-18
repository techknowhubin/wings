import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function HubReviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['hub-reviews'],
    queryFn: async () => {
      // Query reviews from stays, hotels, experiences
      const { data, error } = await supabase
        .from('reviews')
        .select(`*, reviewer:profiles!reviews_user_id_fkey(full_name)`)
        .order('created_at', { ascending: false })
        .limit(100)
        .catch(() => ({ data: null, error: null }));
      return data || [];
    }
  });

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitor reviews across all hub listings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Reviews', value: reviews?.length || 0, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Average Rating', value: avgRating.toFixed(1), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Positive (4-5★)', value: (reviews || []).filter((r: any) => r.rating >= 4).length, icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border border-border/30 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (reviews || []).length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews available yet</p>
              <p className="text-xs mt-1">Reviews will appear here as travellers rate their stays</p>
            </CardContent>
          </Card>
        ) : (
          (reviews || []).map((r: any) => (
            <Card key={r.id} className="border-border/50 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                      {r.reviewer?.full_name?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{r.reviewer?.full_name || 'Anonymous'}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= (r.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-border'}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
