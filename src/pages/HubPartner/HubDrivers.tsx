import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Loader2, Truck, User, Car, ShieldCheck, ShieldX,
  Plus, MoreHorizontal, Phone, Star, Calendar, FileText, AlertTriangle,
  Upload, X, Download, HelpCircle, AlertCircle, Check
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const emptyDriver = { driver_name: '', mobile: '', email: '', dob: '', gender: '', address: '', city: '', state: '', pin_code: '', license_number: '', license_expiry: '', aadhaar_number: '', pan_number: '', vehicle_assigned: '', notes: '' };
const emptyVehicle = { vehicle_name: '', vehicle_type: 'Sedan', vehicle_number: '', seating_capacity: '4', insurance_number: '', permit_number: '', insurance_expiry: '', permit_expiry: '', fitness_expiry: '', vehicle_brand: '', vehicle_model: '', rc_number: '', rc_expiry: '' };
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Tempo Traveller', 'Mini Bus', 'Luxury', 'Bike'];

const HEADER_MAPPING: Record<string, string> = {
  'Driver Name *': 'driver_name',
  'Driver Name': 'driver_name',
  'Mobile Number *': 'mobile',
  'Mobile Number': 'mobile',
  'Email': 'email',
  'Date of Birth': 'dob',
  'Gender': 'gender',
  'Address': 'address',
  'City': 'city',
  'State': 'state',
  'PIN Code': 'pin_code',
  'Pin Code': 'pin_code',
  'License Number *': 'license_number',
  'License Number': 'license_number',
  'License Expiry Date': 'license_expiry',
  'License Expiry': 'license_expiry',
  'Aadhaar Number': 'aadhaar_number',
  'PAN Number': 'pan_number',
  'Vehicle Number *': 'vehicle_number',
  'Vehicle Number': 'vehicle_number',
  'Vehicle Type *': 'vehicle_type',
  'Vehicle Type': 'vehicle_type',
  'Vehicle Brand': 'vehicle_brand',
  'Vehicle Model': 'vehicle_model',
  'Seating Capacity': 'seating_capacity',
  'RC Number': 'rc_number',
  'RC Expiry': 'rc_expiry',
  'Insurance Number': 'insurance_number',
  'Insurance Expiry': 'insurance_expiry',
  'Permit Number': 'permit_number',
  'Permit Expiry': 'permit_expiry',
  'Fitness Expiry': 'fitness_expiry',
  'Status': 'status',
};

export default function HubDrivers() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [tab, setTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);

  // Bulk Import States
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<number>(1); // 1: Upload, 2: Preview, 3: Summary
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Bulk Actions State
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

  // 1. Fetch Drivers from canonical tables
  const { data: drivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ['hub-drivers', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          driver_documents (
            license_number,
            license_expiry,
            aadhaar_number,
            pan_number
          ),
          hub_partner_drivers (
            vehicle_id,
            vehicles (
              vehicle_number,
              vehicle_name
            )
          )
        `)
        .eq('hub_id', uuid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((d: any) => ({
        ...d,
        license_number: d.driver_documents?.license_number,
        vehicle_assigned: d.hub_partner_drivers?.[0]?.vehicles?.vehicle_number,
        vehicle_name: d.hub_partner_drivers?.[0]?.vehicles?.vehicle_name,
        vehicle_id: d.hub_partner_drivers?.[0]?.vehicle_id
      }));
    }
  });

  // 2. Fetch Vehicles from canonical tables
  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['hub-vehicles', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_documents (
            rc_number,
            rc_expiry,
            insurance_number,
            insurance_expiry,
            permit_number,
            permit_expiry,
            fitness_expiry
          )
        `)
        .eq('hub_id', uuid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((v: any) => ({
        ...v,
        rc_number: v.vehicle_documents?.rc_number,
        rc_expiry: v.vehicle_documents?.rc_expiry,
        insurance_number: v.vehicle_documents?.insurance_number,
        insurance_expiry: v.vehicle_documents?.insurance_expiry,
        permit_number: v.vehicle_documents?.permit_number,
        permit_expiry: v.vehicle_documents?.permit_expiry,
        fitness_expiry: v.vehicle_documents?.fitness_expiry
      }));
    }
  });



  // 4. Manual Driver Mutation
  const addDriver = useMutation({
    mutationFn: async (data: typeof emptyDriver) => {
      const { data: hub, error: hubErr } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (hubErr || !hub) throw new Error('Hub not found');
      const hubPartnerId = hub.id;

      // Create Driver record
      const { data: newDriver, error: driverErr } = await supabase
        .from('drivers')
        .insert({
          driver_name: data.driver_name,
          mobile: data.mobile,
          email: data.email || null,
          dob: data.dob || null,
          gender: data.gender || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pin_code: data.pin_code || null,
          status: 'Available',
          hub_id: uuid,
          hub_partner_id: hubPartnerId,
          created_by: hubPartnerId
        })
        .select('id')
        .single();
      if (driverErr) throw driverErr;

      // Create Driver documents record
      const { error: docErr } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: newDriver.id,
          license_number: data.license_number,
          license_expiry: data.license_expiry || null,
          aadhaar_number: data.aadhaar_number || null,
          pan_number: data.pan_number || null
        });
      if (docErr) throw docErr;

      // Lookup or link vehicle assignment
      let vehicleId = null;
      if (data.vehicle_assigned) {
        const { data: vData } = await supabase
          .from('vehicles')
          .select('id')
          .eq('vehicle_number', data.vehicle_assigned)
          .eq('hub_id', uuid)
          .maybeSingle();

        if (vData) {
          vehicleId = vData.id;
        } else {
          const { data: newVehicle, error: vErr } = await supabase
            .from('vehicles')
            .insert({
              vehicle_name: 'Assigned Vehicle',
              vehicle_type: 'Sedan',
              vehicle_number: data.vehicle_assigned,
              status: 'Available',
              hub_id: uuid,
              hub_partner_id: hubPartnerId,
              created_by: hubPartnerId
            })
            .select('id')
            .single();
          if (!vErr && newVehicle) {
            vehicleId = newVehicle.id;
          }
        }
      }

      // Link mapping
      const { error: linkErr } = await supabase
        .from('hub_partner_drivers')
        .insert({
          hub_id: uuid,
          hub_partner_id: hubPartnerId,
          driver_id: newDriver.id,
          vehicle_id: vehicleId,
          created_by: hubPartnerId
        });
      if (linkErr) throw linkErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      toast({ title: 'Driver added successfully' });
      setShowAdd(false);
      setDriverForm(emptyDriver);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // 5. Manual Vehicle Mutation
  const addVehicle = useMutation({
    mutationFn: async (data: typeof emptyVehicle) => {
      const { data: hub, error: hubErr } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (hubErr || !hub) throw new Error('Hub not found');
      const hubPartnerId = hub.id;

      // Create Vehicle
      const { data: newVehicle, error: vehicleErr } = await supabase
        .from('vehicles')
        .insert({
          vehicle_name: data.vehicle_name,
          vehicle_type: data.vehicle_type,
          vehicle_number: data.vehicle_number,
          vehicle_brand: data.vehicle_brand || null,
          vehicle_model: data.vehicle_model || null,
          seating_capacity: parseInt(data.seating_capacity) || 4,
          status: 'Available',
          hub_id: uuid,
          hub_partner_id: hubPartnerId,
          created_by: hubPartnerId
        })
        .select('id')
        .single();
      if (vehicleErr) throw vehicleErr;

      // Create Documents
      const { error: docErr } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: newVehicle.id,
          rc_number: data.rc_number || null,
          rc_expiry: data.rc_expiry || null,
          insurance_number: data.insurance_number || null,
          insurance_expiry: data.insurance_expiry || null,
          permit_number: data.permit_number || null,
          permit_expiry: data.permit_expiry || null,
          fitness_expiry: data.fitness_expiry || null
        });
      if (docErr) throw docErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] });
      toast({ title: 'Vehicle added successfully' });
      setShowAdd(false);
      setVehicleForm(emptyVehicle);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // 6. Update Driver Status (Individual Action)
  const updateDriverStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('drivers').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      toast({ title: 'Driver status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // 7. Bulk Action Mutations
  const bulkActivate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('drivers').update({ status: 'Available' }).in('id', selectedDriverIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      setSelectedDriverIds([]);
      toast({ title: 'Selected drivers activated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const bulkDeactivate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('drivers').update({ status: 'Offline' }).in('id', selectedDriverIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      setSelectedDriverIds([]);
      toast({ title: 'Selected drivers deactivated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const bulkVerify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('drivers').update({ is_verified: true }).in('id', selectedDriverIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      setSelectedDriverIds([]);
      toast({ title: 'Selected drivers marked as verified' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const bulkAssignCategory = useMutation({
    mutationFn: async (category: string) => {
      const { data: mappings } = await supabase
        .from('hub_partner_drivers')
        .select('vehicle_id')
        .in('driver_id', selectedDriverIds);

      const vehicleIds = (mappings || []).map((m: any) => m.vehicle_id).filter(Boolean);
      if (vehicleIds.length === 0) return;

      const { error } = await supabase.from('vehicles').update({ vehicle_type: category }).in('id', vehicleIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] });
      setSelectedDriverIds([]);
      toast({ title: 'Vehicle categories assigned successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  // 8. Bulk Import Execution
  const runImport = useMutation({
    mutationFn: async () => {
      if (!previewData || previewData.length === 0) return;
      const validRows = previewData.filter(r => r.isValid).map(r => r.data);
      
      const { data: hub, error: hubErr } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (hubErr || !hub) throw new Error('Hub not found');
      
      const { data: result, error } = await supabase.rpc('import_fleet_batch', {
        p_hub_id: uuid,
        p_hub_partner_id: hub.id,
        p_file_name: importFile?.name || 'Import',
        p_rows: validRows
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      setImportResults(result);
      setImportStep(3);
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] });
      toast({ title: 'Import completed successfully' });
    },
    onError: (e: any) => {
      toast({ title: 'Import execution error', description: e.message, variant: 'destructive' });
    }
  });

  // Local file processing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum allowed file size is 20MB', variant: 'destructive' });
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      toast({ title: 'Invalid format', description: 'Please upload a valid Excel or CSV template file', variant: 'destructive' });
      return;
    }
    
    setImportFile(file);
    const reader = new FileReader();

    if (name.endsWith('.csv')) {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processParsedData(results.data);
          },
          error: (err) => {
            toast({ title: 'CSV parse error', description: err.message, variant: 'destructive' });
          }
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 1 });
          processParsedData(jsonData);
        } catch (err: any) {
          toast({ title: 'Excel parse error', description: err.message, variant: 'destructive' });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processParsedData = (rawRows: any[]) => {
    const processed = rawRows.map((row: any, idx) => {
      const entry: any = {};
      Object.entries(row).forEach(([rawKey, val]) => {
        const key = HEADER_MAPPING[rawKey.trim()];
        if (key) {
          entry[key] = val !== undefined && val !== null ? String(val).trim() : '';
        }
      });

      const errors: string[] = [];
      if (!entry.driver_name) errors.push('Driver Name is required');
      if (!entry.mobile) errors.push('Mobile Number is required');
      if (!entry.license_number) errors.push('License Number is required');
      if (!entry.vehicle_number) errors.push('Vehicle Number is required');
      if (!entry.vehicle_type) errors.push('Vehicle Type is required');
      if (entry.email && !entry.email.includes('@')) errors.push('Invalid Email format');

      return {
        rowNumber: idx + 2,
        data: entry,
        errors,
        isValid: errors.length === 0,
      };
    });

    // File level unique checks
    const mobiles = new Set<string>();
    const licenses = new Set<string>();
    const vehicles = new Set<string>();

    processed.forEach((item) => {
      if (item.data.mobile) {
        if (mobiles.has(item.data.mobile)) item.errors.push(`Duplicate Mobile in file: ${item.data.mobile}`);
        else mobiles.add(item.data.mobile);
      }
      if (item.data.license_number) {
        if (licenses.has(item.data.license_number)) item.errors.push(`Duplicate License in file: ${item.data.license_number}`);
        else licenses.add(item.data.license_number);
      }
      if (item.data.vehicle_number) {
        if (vehicles.has(item.data.vehicle_number)) item.errors.push(`Duplicate Vehicle in file: ${item.data.vehicle_number}`);
        else vehicles.add(item.data.vehicle_number);
      }
      item.isValid = item.errors.length === 0;
    });

    setPreviewData(processed);
    setImportStep(2);
  };

  const downloadExcelTemplate = () => {
    const headers = [
      ['Driver Information', '', '', '', '', '', '', '', '', 'Documents', '', '', '', 'Vehicle Information', '', '', '', '', 'Documents', '', '', '', '', '', '', 'Status'],
      [
        'Driver Name *', 'Mobile Number *', 'Email', 'Date of Birth', 'Gender', 'Address', 'City', 'State', 'PIN Code',
        'License Number *', 'License Expiry Date', 'Aadhaar Number', 'PAN Number',
        'Vehicle Number *', 'Vehicle Type *', 'Vehicle Brand', 'Vehicle Model', 'Seating Capacity',
        'RC Number', 'RC Expiry', 'Insurance Number', 'Insurance Expiry', 'Permit Number', 'Permit Expiry', 'Fitness Expiry',
        'Status'
      ]
    ];
    const sampleRow = [
      'John Doe', '9876543210', 'john@example.com', '1990-05-15', 'Male', '123 Main St', 'Mumbai', 'Maharashtra', '400001',
      'MH1220150000123', '2030-12-31', '123456789012', 'ABCDE1234F',
      'MH12AB1234', 'Sedan', 'Toyota', 'Etios', '4',
      'MH12RC12345', '2032-05-10', 'INS987654', '2027-06-15', 'PER87654', '2028-06-15', '2028-06-15',
      'Available'
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Templates');
    XLSX.writeFile(wb, 'drivers_vehicles_template.xlsx');
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'Driver Name *', 'Mobile Number *', 'Email', 'Date of Birth', 'Gender', 'Address', 'City', 'State', 'PIN Code',
      'License Number *', 'License Expiry Date', 'Aadhaar Number', 'PAN Number',
      'Vehicle Number *', 'Vehicle Type *', 'Vehicle Brand', 'Vehicle Model', 'Seating Capacity',
      'RC Number', 'RC Expiry', 'Insurance Number', 'Insurance Expiry', 'Permit Number', 'Permit Expiry', 'Fitness Expiry',
      'Status'
    ];
    const sampleRow = [
      'John Doe', '9876543210', 'john@example.com', '1990-05-15', 'Male', '123 Main St', 'Mumbai', 'Maharashtra', '400001',
      'MH1220150000123', '2030-12-31', '123456789012', 'ABCDE1234F',
      'MH12AB1234', 'Sedan', 'Toyota', 'Etios', '4',
      'MH12RC12345', '2032-05-10', 'INS987654', '2027-06-15', 'PER87654', '2028-06-15', '2028-06-15',
      'Available'
    ];
    const csvContent = Papa.unparse({ fields: headers, data: [sampleRow] });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'drivers_vehicles_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDrivers = () => {
    const targetDrivers = selectedDriverIds.length > 0
      ? (drivers || []).filter((d: any) => selectedDriverIds.includes(d.id))
      : (drivers || []);

    if (targetDrivers.length === 0) {
      toast({ title: 'No drivers to export' });
      return;
    }

    const exportRows = targetDrivers.map((d: any) => ({
      'Driver Name': d.driver_name,
      'Mobile Number': d.mobile,
      'Email': d.email || '',
      'Status': d.status || '',
      'Rating': d.rating || '5.0',
      'Verified': d.is_verified ? 'Yes' : 'No',
      'License Number': d.license_number || '',
      'Vehicle Assigned': d.vehicle_assigned || '',
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `drivers_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadErrorReport = (log: any[]) => {
    const csvContent = Papa.unparse(log);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'import_error_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters & helpers
  const filteredDrivers = (drivers || []).filter((d: any) =>
    !search || d.driver_name?.toLowerCase().includes(search.toLowerCase()) || d.mobile?.includes(search)
  );
  
  const filteredVehicles = (vehicles || []).filter((v: any) =>
    !search || v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) || v.vehicle_number?.includes(search)
  );

  const isExpiringSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  };

  const df = (k: keyof typeof driverForm) => (v: string) => setDriverForm(p => ({ ...p, [k]: v }));
  const vf = (k: keyof typeof emptyVehicle) => (v: string) => setVehicleForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Drivers & Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your hub fleet and bulk imports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'drivers' ? (
            <>
              <Button onClick={() => { setTab('drivers'); setShowAdd(true); }} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <Plus className="h-4 w-4" /> Add Driver
              </Button>
              <Button onClick={() => { setImportStep(1); setImportFile(null); setPreviewData([]); setImportResults(null); setShowImport(true); }} className="rounded-xl gap-2 font-semibold border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" variant="outline">
                <Upload className="h-4 w-4" /> Import Drivers
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => { setTab('vehicles'); setShowAdd(true); }} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <Plus className="h-4 w-4" /> Add Vehicle
              </Button>
              <Button onClick={() => { setImportStep(1); setImportFile(null); setPreviewData([]); setImportResults(null); setShowImport(true); }} className="rounded-xl gap-2 font-semibold border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" variant="outline">
                <Upload className="h-4 w-4" /> Import Vehicles
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers', value: drivers?.length || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Verified Drivers', value: (drivers || []).filter((d: any) => d.is_verified).length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Vehicles', value: vehicles?.length || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Expiring Documents', value: (vehicles || []).filter((v: any) => isExpiringSoon(v.insurance_expiry) || isExpiringSoon(v.fitness_expiry) || isExpiringSoon(v.permit_expiry)).length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border border-border/30 ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('drivers')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === 'drivers' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <User className="h-4 w-4" /> Drivers ({drivers?.length || 0})
        </button>
        <button onClick={() => setTab('vehicles')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === 'vehicles' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Car className="h-4 w-4" /> Vehicles ({vehicles?.length || 0})
        </button>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedDriverIds.length > 0 && tab === 'drivers' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/70 border border-emerald-600/30 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span className="bg-emerald-600 text-white rounded-full px-2 py-0.5 text-[10px]">{selectedDriverIds.length}</span>
            drivers selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => bulkActivate.mutate()} disabled={bulkActivate.isPending} size="sm" className="h-9 rounded-lg gap-1.5" variant="outline">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Activate
            </Button>
            <Button onClick={() => bulkDeactivate.mutate()} disabled={bulkDeactivate.isPending} size="sm" className="h-9 rounded-lg gap-1.5" variant="outline">
              <ShieldX className="h-3.5 w-3.5 text-red-500" /> Deactivate
            </Button>
            <Button onClick={() => bulkVerify.mutate()} disabled={bulkVerify.isPending} size="sm" className="h-9 rounded-lg gap-1.5" variant="outline">
              <Check className="h-3.5 w-3.5 text-blue-500" /> Verify
            </Button>
            <Select onValueChange={(val) => bulkAssignCategory.mutate(val)}>
              <SelectTrigger className="h-9 w-[180px] bg-card rounded-xl text-xs">
                <SelectValue placeholder="Assign Category" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.filter(t => t !== 'Bike').map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportDrivers} size="sm" className="h-9 rounded-lg gap-1.5" variant="outline">
              <Download className="h-3.5 w-3.5 text-indigo-500" /> Export CSV
            </Button>
            <Button onClick={() => setSelectedDriverIds([])} size="icon" className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${tab}...`} className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Drivers Table */}
      {tab === 'drivers' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[45px]">
                    <Checkbox
                      checked={selectedDriverIds.length === filteredDrivers.length && filteredDrivers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDriverIds(filteredDrivers.map((d: any) => d.id));
                        } else {
                          setSelectedDriverIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  {['Driver', 'Mobile', 'License', 'Vehicle', 'Rating', 'Verified', 'Status', 'Actions'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDrivers ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No drivers added yet</p>
                  </TableCell></TableRow>
                ) : (
                  filteredDrivers.map((d: any) => (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedDriverIds.includes(d.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDriverIds(prev => [...prev, d.id]);
                            } else {
                              setSelectedDriverIds(prev => prev.filter(id => id !== d.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600">
                            {d.driver_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <p className="font-semibold text-sm">{d.driver_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{d.mobile}</TableCell>
                      <TableCell className="text-xs">{d.license_number || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {d.vehicle_assigned ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-semibold">{d.vehicle_assigned}</span>
                            <span className="text-[10px] text-muted-foreground">{d.vehicle_name}</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-semibold">{d.rating || '5.0'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.is_verified ? "default" : "secondary"} className={d.is_verified ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}>
                          {d.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.status === 'Available' || d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {d.status || 'Available'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a href={`tel:${d.mobile}`}><Phone className="h-4 w-4 mr-2" />Call Driver</a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {d.status !== 'Available' ? (
                              <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'Available' })}>
                                <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'Offline' })}>
                                <ShieldX className="h-4 w-4 mr-2 text-destructive" />Deactivate
                              </DropdownMenuItem>
                            )}
                            {!d.is_verified && (
                              <DropdownMenuItem onClick={() => bulkVerify.mutateAsync().then(() => setSelectedDriverIds([d.id]))}>
                                <Check className="h-4 w-4 mr-2 text-blue-600" />Verify Driver
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Vehicles Table */}
      {tab === 'vehicles' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {['Vehicle', 'Type', 'Reg. Number', 'Seats', 'Insurance', 'Permit', 'Fitness', 'Status'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingVehicles ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Car className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No vehicles added yet</p>
                  </TableCell></TableRow>
                ) : (
                  filteredVehicles.map((v: any) => (
                    <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm">
                        <div>
                          <p>{v.vehicle_name}</p>
                          {v.vehicle_brand && <span className="text-[10px] text-muted-foreground">{v.vehicle_brand} {v.vehicle_model}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{v.vehicle_type}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{v.vehicle_number}</TableCell>
                      <TableCell className="text-xs">{v.seating_capacity || '—'}</TableCell>
                      <TableCell>
                        {v.insurance_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.insurance_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.insurance_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.insurance_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {v.permit_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.permit_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.permit_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.permit_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {v.fitness_expiry ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon(v.fitness_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-xs ${isExpiringSoon(v.fitness_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(new Date(v.fitness_expiry), 'dd MMM yy')}
                            </span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${v.status === 'Available' || v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {v.status || 'Available'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Manual Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}
            </DialogTitle>
          </DialogHeader>

          {tab === 'drivers' ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input value={driverForm.driver_name} onChange={e => df('driver_name')(e.target.value)} placeholder="Driver full name" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mobile *</Label>
                  <Input value={driverForm.mobile} onChange={e => df('mobile')(e.target.value)} placeholder="10-digit number" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input value={driverForm.email} onChange={e => df('email')(e.target.value)} placeholder="driver@email.com" className="rounded-xl" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input value={driverForm.dob} onChange={e => df('dob')(e.target.value)} className="rounded-xl" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <Select value={driverForm.gender} onValueChange={df('gender')}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">License Number *</Label>
                  <Input value={driverForm.license_number} onChange={e => df('license_number')(e.target.value)} placeholder="DL number" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">License Expiry</Label>
                  <Input value={driverForm.license_expiry} onChange={e => df('license_expiry')(e.target.value)} className="rounded-xl" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Aadhaar Number</Label>
                  <Input value={driverForm.aadhaar_number} onChange={e => df('aadhaar_number')(e.target.value)} placeholder="12-digit UID" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">PAN Number</Label>
                  <Input value={driverForm.pan_number} onChange={e => df('pan_number')(e.target.value)} placeholder="10-digit PAN" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Assigned</Label>
                  <Input value={driverForm.vehicle_assigned} onChange={e => df('vehicle_assigned')(e.target.value)} placeholder="e.g. MH12AB1234" className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => addDriver.mutate(driverForm)}
                  disabled={!driverForm.driver_name || !driverForm.mobile || !driverForm.license_number || addDriver.isPending}
                  className="rounded-xl"
                >
                  {addDriver.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Driver
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Name *</Label>
                  <Input value={vehicleForm.vehicle_name} onChange={e => vf('vehicle_name')(e.target.value)} placeholder="e.g. Toyota Innova" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Type *</Label>
                  <Select value={vehicleForm.vehicle_type} onValueChange={vf('vehicle_type')}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reg. Number *</Label>
                  <Input value={vehicleForm.vehicle_number} onChange={e => vf('vehicle_number')(e.target.value)} placeholder="MH12AB1234" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Seating Capacity</Label>
                  <Input value={vehicleForm.seating_capacity} onChange={e => vf('seating_capacity')(e.target.value)} type="number" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Brand</Label>
                  <Input value={vehicleForm.vehicle_brand} onChange={e => vf('vehicle_brand')(e.target.value)} placeholder="e.g. Toyota" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Model</Label>
                  <Input value={vehicleForm.vehicle_model} onChange={e => vf('vehicle_model')(e.target.value)} placeholder="e.g. Innova" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">RC Number</Label>
                  <Input value={vehicleForm.rc_number} onChange={e => vf('rc_number')(e.target.value)} placeholder="RC registration number" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">RC Expiry</Label>
                  <Input value={vehicleForm.rc_expiry} onChange={e => vf('rc_expiry')(e.target.value)} className="rounded-xl" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Insurance Expiry</Label>
                  <Input value={vehicleForm.insurance_expiry} onChange={e => vf('insurance_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Permit Expiry</Label>
                  <Input value={vehicleForm.permit_expiry} onChange={e => vf('permit_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fitness Expiry</Label>
                  <Input value={vehicleForm.fitness_expiry} onChange={e => vf('fitness_expiry')(e.target.value)} type="date" className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => addVehicle.mutate(vehicleForm)}
                  disabled={!vehicleForm.vehicle_name || !vehicleForm.vehicle_number || addVehicle.isPending}
                  className="rounded-xl"
                >
                  {addVehicle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Vehicle
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Import Drivers & Vehicles
            </DialogTitle>
          </DialogHeader>

          {importStep === 1 && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl">
                <div>
                  <h4 className="font-bold text-sm">Step 1: Download Templates</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Start with one of our pre-formatted spreadsheet templates</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={downloadExcelTemplate} className="rounded-xl gap-1.5 text-xs font-semibold" variant="outline">
                    <Download className="h-3.5 w-3.5" /> Excel Template (.xlsx)
                  </Button>
                  <Button onClick={downloadCSVTemplate} className="rounded-xl gap-1.5 text-xs font-semibold" variant="outline">
                    <Download className="h-3.5 w-3.5" /> CSV Template (.csv)
                  </Button>
                </div>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'} hover:border-emerald-600/50 cursor-pointer relative`}
              >
                <input
                  type="file"
                  id="import-file-input"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                />
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold">Drag and drop your template here</p>
                <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls) or CSV (.csv) up to 20MB</p>
                <Button className="mt-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" variant="default">
                  Browse Files
                </Button>
              </div>
            </div>
          )}

          {importStep === 2 && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Step 2: Preview & Validation</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Please review parsing status and correct any errors</p>
                </div>
                <Badge variant={previewData.every(r => r.isValid) ? "default" : "destructive"} className="text-[11px] font-semibold">
                  {previewData.filter(r => r.isValid).length} / {previewData.length} Valid Rows
                </Badge>
              </div>

              <div className="border border-border/50 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {['Row', 'Driver Name', 'Mobile', 'License', 'Vehicle Number', 'Vehicle Type', 'Errors'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.rowNumber} className={row.isValid ? "hover:bg-muted/30" : "bg-red-500/5 hover:bg-red-500/10"}>
                        <TableCell className="text-xs font-bold text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell className="text-xs font-semibold">{row.data.driver_name || '—'}</TableCell>
                        <TableCell className="text-xs">{row.data.mobile || '—'}</TableCell>
                        <TableCell className="text-xs font-mono text-[10px]">{row.data.license_number || '—'}</TableCell>
                        <TableCell className="text-xs font-mono text-[10px]">{row.data.vehicle_number || '—'}</TableCell>
                        <TableCell className="text-xs">{row.data.vehicle_type || '—'}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {row.isValid ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Valid</span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((e: string, i: number) => (
                                <p key={i} className="text-[10px] font-medium text-red-500 flex items-center gap-1 shrink-0 leading-tight">
                                  <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                                </p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setImportStep(1)} className="rounded-xl">Back</Button>
                <Button
                  onClick={() => runImport.mutate()}
                  disabled={previewData.filter(r => r.isValid).length === 0 || runImport.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {runImport.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import {previewData.filter(r => r.isValid).length} Valid Rows
                </Button>
              </DialogFooter>
            </div>
          )}

          {importStep === 3 && importResults && (
            <div className="space-y-6 py-2">
              <div className="text-center py-6 bg-muted/10 border border-border/50 rounded-xl space-y-2">
                <h3 className="text-lg font-black tracking-tight">Import Summary</h3>
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                  <div className="p-3 bg-card rounded-xl border border-border/50">
                    <p className="text-xl font-black text-foreground">{importResults.total}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Total Records</p>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <p className="text-xl font-black text-emerald-600">{importResults.success}</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Successful</p>
                  </div>
                  <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                    <p className="text-xl font-black text-red-500">{importResults.failed}</p>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-0.5">Failed / Skipped</p>
                  </div>
                </div>
              </div>

              {importResults.failed > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-red-500" /> Skipped / Failed Details</h4>
                    <Button onClick={() => downloadErrorReport(importResults.errors)} className="rounded-xl text-xs gap-1.5" variant="outline">
                      <Download className="h-3.5 w-3.5" /> Download Error Report
                    </Button>
                  </div>
                  <div className="border border-border/50 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {['Row', 'Driver Name', 'Mobile', 'Vehicle Number', 'Skip Reason'].map(h => (
                            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.errors.map((err: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-bold text-muted-foreground">{err.row}</TableCell>
                            <TableCell className="text-xs">{err.driver_name || '—'}</TableCell>
                            <TableCell className="text-xs">{err.mobile || '—'}</TableCell>
                            <TableCell className="text-xs font-mono text-[10px]">{err.vehicle_number || '—'}</TableCell>
                            <TableCell className="text-xs font-semibold text-red-500">{err.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => setShowImport(false)} className="rounded-xl w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }
}
