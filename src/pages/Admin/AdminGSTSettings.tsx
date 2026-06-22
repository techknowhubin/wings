import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Save, Percent, ShieldCheck, FileText } from "lucide-react";

interface GSTSetting {
  id: string;
  listing_type: string;
  gst_percentage: number;
  is_enabled: boolean;
}

export default function AdminGSTSettings() {
  const [settings, setSettings] = useState<GSTSetting[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("gst_settings")
        .select("*")
        .order("listing_type");

      if (error) throw error;

      if (data) {
        const globalSetting = data.find(s => s.listing_type === 'GLOBAL');
        if (globalSetting) {
          setGlobalEnabled(globalSetting.is_enabled);
        }
        setSettings(data.filter(s => s.listing_type !== 'GLOBAL'));
      }
    } catch (error) {
      console.error("Error fetching GST settings:", error);
      toast({
        title: "Error",
        description: "Failed to load GST configuration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    setGlobalEnabled(enabled);
    try {
      const { error } = await supabase
        .from("gst_settings")
        .update({ is_enabled: enabled })
        .eq("listing_type", "GLOBAL");

      if (error) throw error;

      toast({
        title: enabled ? "Global GST Enabled" : "Global GST Disabled",
        description: enabled ? "GST will now be collected on all enabled categories." : "GST collection has been suspended across the entire platform.",
      });
    } catch (error) {
      console.error("Error updating global GST:", error);
      toast({ title: "Error", description: "Failed to update global GST settings.", variant: "destructive" });
    }
  };

  const handleSettingChange = (id: string, field: "gst_percentage" | "is_enabled", value: number | boolean) => {
    setSettings(settings.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from("gst_settings")
          .update({
            gst_percentage: setting.gst_percentage,
            is_enabled: setting.is_enabled
          })
          .eq("id", setting.id);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "GST configuration has been successfully updated.",
      });
    } catch (error) {
      console.error("Error saving GST settings:", error);
      toast({ title: "Error", description: "Failed to save GST settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatListingType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax & GST Management</h1>
        <p className="text-muted-foreground mt-1">Configure GST rates and enable/disable tax collection per listing type.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Global Settings */}
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Global GST Toggle
            </CardTitle>
            <CardDescription>Enable or completely disable GST across the entire XplorWing platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
              <div>
                <p className="font-semibold text-foreground">Collect GST on Checkout</p>
                <p className="text-xs text-muted-foreground">When disabled, no tax is charged regardless of category settings.</p>
              </div>
              <Switch 
                checked={globalEnabled} 
                onCheckedChange={handleGlobalToggle}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="rounded-2xl border-border/50 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6 flex items-start gap-4 h-full">
            <div className="bg-primary/10 p-3 rounded-xl shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How it works</h3>
              <p className="text-sm text-muted-foreground">
                GST is calculated automatically during checkout based on these percentages. 
                Invoices, bookings, and revenue reports will instantly reflect these rates dynamically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Table */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Category GST Configuration</CardTitle>
            <CardDescription>Set tax brackets for specific services.</CardDescription>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="gap-2 rounded-xl">
            {saving ? <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold">Listing Type</TableHead>
                  <TableHead className="font-semibold w-[150px]">GST Percentage</TableHead>
                  <TableHead className="font-semibold text-right">Status</TableHead>
                  <TableHead className="font-semibold text-right w-[100px]">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading settings...</TableCell>
                  </TableRow>
                ) : settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">
                      {formatListingType(setting.listing_type)}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={setting.gst_percentage}
                          onChange={(e) => handleSettingChange(setting.id, "gst_percentage", parseFloat(e.target.value) || 0)}
                          className="pr-8 rounded-lg"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {setting.is_enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          Disabled
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch 
                        checked={setting.is_enabled}
                        onCheckedChange={(checked) => handleSettingChange(setting.id, "is_enabled", checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
