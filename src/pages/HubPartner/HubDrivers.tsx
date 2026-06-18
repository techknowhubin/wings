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
  Search, Loader2, User, Car, ShieldCheck, ShieldX,
  Plus, MoreHorizontal, Phone, Star, AlertTriangle,
  Upload, X, Download, AlertCircle, Check, MapPin,
  Eye, FileSpreadsheet, Info, ChevronRight, Tag, Zap
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isValid } from "date-fns";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ─── Constants ──────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Tempo Traveller', 'Mini Bus', 'Bus', 'Other'];

const SERVICE_TAGS = ['Airport Transfer', 'Local Rental', 'Outstation', 'Corporate Travel', 'Tour Packages', 'Employee Transport', 'Wedding Travel', 'Tourist Taxi'];

const emptyDriver = { driver_name: '', mobile: '', email: '', dob: '', gender: '', address: '', city: '', state: '', pin_code: '', license_number: '', license_expiry: '', aadhaar_number: '', pan_number: '', vehicle_assigned: '', notes: '' };
const emptyVehicle = { vehicle_name: '', vehicle_type: 'Sedan', vehicle_number: '', seating_capacity: '4', insurance_number: '', permit_number: '', insurance_expiry: '', permit_expiry: '', fitness_expiry: '', vehicle_brand: '', vehicle_model: '', rc_number: '', rc_expiry: '' };

// ─── Comprehensive Header Mapping ───────────────────────────────────────────
// Covers user's exact columns + common alternative names for smart matching
const HEADER_MAPPING: Record<string, string> = {
  // Vehicle fields — exact Excel columns
  'Car Model Name':        'vehicle_model',
  'Car Model Year':        'vehicle_year',
  'Fuel Type':             'fuel_type',
  'RC Number':             'rc_number',
  'Cab Type':              'vehicle_type',
  'Boot Space':            'boot_space',
  'Vehicle Color':         'vehicle_color',
  'Location/Area':         'operating_location',
  'Service Offerings':     'service_offerings',
  // Driver fields — exact Excel columns
  'Cab Owner Name':        'driver_name',
  'Mobile Number':         'driver_mobile',
  'Driving Experience':    'driving_experience',
  'Driving License':       'license_number',
  'License Expiry Date':   'license_expiry',
  'Emergency Contact Name':   'emergency_contact_name',
  'Emergency Contact Number': 'emergency_contact_mobile',
  'Notes':                 'remarks',

  // ── Alternative column names (smart matching) ──
  'Car Model':             'vehicle_model',
  'Vehicle Model':         'vehicle_model',
  'Model Name':            'vehicle_model',
  'Model':                 'vehicle_model',
  'Vehicle Name':          'vehicle_model',
  'Car Name':              'vehicle_model',
  'Vehicle Year':          'vehicle_year',
  'Model Year':            'vehicle_year',
  'Year':                  'vehicle_year',
  'Manufacture Year':      'vehicle_year',
  'Mfg Year':              'vehicle_year',
  'Fuel':                  'fuel_type',
  'Fuel Category':         'fuel_type',
  'RC No':                 'rc_number',
  'RC No.':                'rc_number',
  'Registration Number':   'rc_number',
  'Reg Number':            'rc_number',
  'Reg No':                'rc_number',
  'Vehicle Number':        'rc_number',
  'Vehicle No':            'rc_number',
  'Number Plate':          'rc_number',
  'Vehicle Type':          'vehicle_type',
  'Vehicle Category':      'vehicle_type',
  'Car Type':              'vehicle_type',
  'Luggage Space':         'boot_space',
  'Car Color':             'vehicle_color',
  'Colour':                'vehicle_color',
  'Color':                 'vehicle_color',
  'Services':              'service_offerings',
  'Service Types':         'service_offerings',
  'Offered Services':      'service_offerings',
  'Driver Name':           'driver_name',
  'Owner Name':            'driver_name',
  'Name':                  'driver_name',
  'Full Name':             'driver_name',
  'Phone Number':          'driver_mobile',
  'Phone':                 'driver_mobile',
  'Mobile':                'driver_mobile',
  'Contact Number':        'driver_mobile',
  'Contact':               'driver_mobile',
  'Mobile No':             'driver_mobile',
  'Cell Number':           'driver_mobile',
  'Location':              'operating_location',
  'Area':                  'operating_location',
  'City':                  'operating_location',
  'Operating Area':        'operating_location',
  'Base Location':         'operating_location',
  'Experience':            'driving_experience',
  'Years of Experience':   'driving_experience',
  'Exp':                   'driving_experience',
  'Driving Exp':           'driving_experience',
  'License Number':        'license_number',
  'Licence Number':        'license_number',
  'DL Number':             'license_number',
  'DL No':                 'license_number',
  'License No':            'license_number',
  'DL':                    'license_number',
  'License Expiry':        'license_expiry',
  'DL Expiry':             'license_expiry',
  'DL Expiry Date':        'license_expiry',
  'License Valid Till':    'license_expiry',
  'Emergency Name':        'emergency_contact_name',
  'Emergency Contact':     'emergency_contact_name',
  'Emergency Number':      'emergency_contact_mobile',
  'Emergency Mobile':      'emergency_contact_mobile',
  'Emergency Phone':       'emergency_contact_mobile',
  'Remarks':               'remarks',
  'Comments':              'remarks',
  'Additional Notes':      'remarks',

  // Legacy support for old template format
  'Email':                 'email',
  'Date of Birth':         'dob',
  'Gender':                'gender',
  'Address':               'address',
  'State':                 'state',
  'PIN Code':              'pin_code',
  'Pin Code':              'pin_code',
  'Aadhaar Number':        'aadhaar_number',
  'PAN Number':            'pan_number',
  'Seating Capacity':      'seating_capacity',
  'RC Expiry':             'rc_expiry',
  'Insurance Number':      'insurance_number',
  'Insurance Expiry':      'insurance_expiry',
  'Permit Number':         'permit_number',
  'Permit Expiry':         'permit_expiry',
  'Fitness Expiry':        'fitness_expiry',
  'Status':                'status',
  'Vehicle Brand':         'vehicle_brand',
  'Driver Name *':         'driver_name',
  'Mobile Number *':       'driver_mobile',
  'License Number *':      'license_number',
  'Vehicle Number *':      'rc_number',
  'Vehicle Type *':        'vehicle_type',
};

// ─── Token index for fuzzy scoring ──────────────────────────────────────────
const FIELD_TOKENS: Record<string, string[]> = {
  vehicle_model:           ['car', 'model', 'vehicle', 'name'],
  vehicle_year:            ['year', 'model', 'manufacture', 'mfg'],
  fuel_type:               ['fuel', 'type', 'category'],
  rc_number:               ['rc', 'registration', 'number', 'reg', 'plate'],
  vehicle_type:            ['cab', 'vehicle', 'type', 'category', 'car'],
  vehicle_color:           ['color', 'colour', 'vehicle', 'car'],
  boot_space:              ['boot', 'luggage', 'space'],
  service_offerings:       ['service', 'offering', 'services'],
  driver_name:             ['cab', 'owner', 'driver', 'name', 'full'],
  driver_mobile:           ['mobile', 'phone', 'number', 'contact', 'cell'],
  operating_location:      ['location', 'area', 'city', 'base'],
  driving_experience:      ['driving', 'experience', 'years', 'exp'],
  license_number:          ['driving', 'license', 'licence', 'dl', 'number'],
  license_expiry:          ['license', 'expiry', 'expire', 'valid', 'dl'],
  emergency_contact_name:  ['emergency', 'contact', 'name'],
  emergency_contact_mobile:['emergency', 'contact', 'number', 'mobile', 'phone'],
  remarks:                 ['notes', 'remarks', 'comments', 'additional'],
};

function normalizeStr(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const NORMALIZED_HEADER_MAP = Object.fromEntries(
  Object.entries(HEADER_MAPPING).map(([k, v]) => [normalizeStr(k), v])
);

function smartMapHeader(raw: string): string | null {
  const trimmed = raw.trim();
  if (HEADER_MAPPING[trimmed]) return HEADER_MAPPING[trimmed];
  const norm = normalizeStr(trimmed);
  if (NORMALIZED_HEADER_MAP[norm]) return NORMALIZED_HEADER_MAP[norm];
  for (const [k, v] of Object.entries(NORMALIZED_HEADER_MAP)) {
    if (norm.length >= 3 && (norm.includes(k) || k.includes(norm))) return v;
  }
  const tokens = norm.match(/[a-z]+/g) || [];
  let best = 0; let bestField: string | null = null;
  for (const [field, ftokens] of Object.entries(FIELD_TOKENS)) {
    const hits = tokens.filter(t => ftokens.some(ft => t.includes(ft) || ft.includes(t))).length;
    const score = hits / Math.max(tokens.length, ftokens.length);
    if (score > best && score >= 0.4) { best = score; bestField = field; }
  }
  return bestField;
}

// ─── Vehicle type standardizer ───────────────────────────────────────────────
function standardizeVehicleType(raw?: string): string {
  if (!raw) return 'Sedan';
  const l = raw.toLowerCase().trim();
  if (/sedan|dzire|swift|etios|amaze|ciaz|city|verna/.test(l)) return 'Sedan';
  if (/suv|innova|fortuner|crysta|ertiga|creta|scorpio|xuv|harrier/.test(l)) return 'SUV';
  if (/hatch|i10|i20|wagonr|alto|kwid|santro|ritz/.test(l)) return 'Hatchback';
  if (/luxury|premium|bmw|mercedes|audi|jaguar|benz/.test(l)) return 'Luxury';
  if (/tempo|traveller|force/.test(l)) return 'Tempo Traveller';
  if (/mini.?bus|minibus/.test(l)) return 'Mini Bus';
  if (/^bus$/.test(l)) return 'Bus';
  const exact = VEHICLE_TYPES.find(t => t.toLowerCase() === l);
  if (exact) return exact;
  return 'Other';
}

// ─── Service offerings parser ────────────────────────────────────────────────
const SVC_KW: Record<string, string> = {
  airport: 'Airport Transfer', local: 'Local Rental', rental: 'Local Rental',
  outstation: 'Outstation', corporate: 'Corporate Travel', tour: 'Tour Packages',
  package: 'Tour Packages', employee: 'Employee Transport', wedding: 'Wedding Travel',
  tourist: 'Tourist Taxi', taxi: 'Tourist Taxi',
};
function parseServiceOfferings(raw?: string): string[] {
  if (!raw) return [];
  return [...new Set(
    raw.split(/[,;|\/&+]+/).map(s => {
      const c = s.trim().toLowerCase();
      const match = Object.entries(SVC_KW).find(([k]) => c.includes(k));
      return match ? match[1] : s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
    }).filter(s => s.length > 1)
  )];
}

// ─── Date normalizer ─────────────────────────────────────────────────────────
function normDate(raw?: string | number | null): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    try {
      const info = XLSX.SSF.parse_date_code(raw);
      if (info) return `${info.y}-${String(info.m).padStart(2,'0')}-${String(info.d).padStart(2,'0')}`;
    } catch {}
  }
  const s = String(raw).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  try { const d = new Date(s); if (isValid(d)) return format(d, 'yyyy-MM-dd'); } catch {}
  return null;
}

// ─── Validation ──────────────────────────────────────────────────────────────
// Only flag format errors — missing fields are allowed, row imports with available data
function validateRow(data: any): string[] {
  const errs: string[] = [];
  if (data.driver_mobile && !/^\d{10}$/.test(data.driver_mobile.replace(/\s+/g, '')))
    errs.push('Mobile must be 10 digits');
  if (data.license_expiry && !normDate(data.license_expiry))
    errs.push('License Expiry Date is invalid');
  return errs;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HubDrivers() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [viewDetail, setViewDetail] = useState<any>(null);

  // Import wizard state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [unmappedCols, setUnmappedCols] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: drivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ['hub-drivers', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`*, driver_documents(license_number,license_expiry,aadhaar_number,pan_number), hub_partner_drivers(vehicle_id, vehicles(vehicle_number,vehicle_name))`)
        .eq('hub_id', uuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        license_number: d.driver_documents?.license_number,
        vehicle_assigned: d.hub_partner_drivers?.[0]?.vehicles?.vehicle_number,
        vehicle_name: d.hub_partner_drivers?.[0]?.vehicles?.vehicle_name,
        vehicle_id: d.hub_partner_drivers?.[0]?.vehicle_id,
      }));
    },
  });

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['hub-vehicles', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`*, vehicle_documents(rc_number,rc_expiry,insurance_number,insurance_expiry,permit_number,permit_expiry,fitness_expiry)`)
        .eq('hub_id', uuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((v: any) => ({
        ...v,
        rc_number: v.vehicle_documents?.rc_number,
        insurance_expiry: v.vehicle_documents?.insurance_expiry,
        permit_expiry: v.vehicle_documents?.permit_expiry,
        fitness_expiry: v.vehicle_documents?.fitness_expiry,
      }));
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addDriver = useMutation({
    mutationFn: async (data: typeof emptyDriver) => {
      const { data: hub } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (!hub) throw new Error('Hub not found');
      const { data: nd, error: dErr } = await supabase.from('drivers').insert({
        driver_name: data.driver_name, mobile: data.mobile, email: data.email || null,
        dob: data.dob || null, gender: data.gender || null, address: data.address || null,
        city: data.city || null, state: data.state || null, pin_code: data.pin_code || null,
        status: 'Available', hub_id: uuid, hub_partner_id: hub.id, created_by: hub.id,
      }).select('id').single();
      if (dErr) throw dErr;
      await supabase.from('driver_documents').insert({ driver_id: nd.id, license_number: data.license_number, license_expiry: data.license_expiry || null, aadhaar_number: data.aadhaar_number || null, pan_number: data.pan_number || null });
      await supabase.from('hub_partner_drivers').insert({ hub_id: uuid, hub_partner_id: hub.id, driver_id: nd.id, vehicle_id: null, created_by: hub.id });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); toast({ title: 'Driver added' }); setShowAdd(false); setDriverForm(emptyDriver); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addVehicle = useMutation({
    mutationFn: async (data: typeof emptyVehicle) => {
      const { data: hub } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (!hub) throw new Error('Hub not found');
      const { data: nv, error: vErr } = await supabase.from('vehicles').insert({
        vehicle_name: data.vehicle_name, vehicle_type: data.vehicle_type, vehicle_number: data.vehicle_number,
        vehicle_brand: data.vehicle_brand || null, vehicle_model: data.vehicle_model || null,
        seating_capacity: parseInt(data.seating_capacity) || 4, status: 'Available',
        hub_id: uuid, hub_partner_id: hub.id, created_by: hub.id,
      }).select('id').single();
      if (vErr) throw vErr;
      await supabase.from('vehicle_documents').insert({ vehicle_id: nv.id, rc_number: data.rc_number || null, rc_expiry: data.rc_expiry || null, insurance_number: data.insurance_number || null, insurance_expiry: data.insurance_expiry || null, permit_number: data.permit_number || null, permit_expiry: data.permit_expiry || null, fitness_expiry: data.fitness_expiry || null });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] }); toast({ title: 'Vehicle added' }); setShowAdd(false); setVehicleForm(emptyVehicle); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDriverStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('drivers').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); toast({ title: 'Status updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveDriver  = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drivers').update({ is_verified: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); toast({ title: 'Driver approved', description: 'Driver marked as Verified.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectDriver   = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drivers').update({ is_verified: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); toast({ title: 'Driver rejected', description: 'Driver verification removed.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const bulkActivate   = useMutation({ mutationFn: async () => { await supabase.from('drivers').update({ status: 'Available' }).in('id', selectedDriverIds); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); setSelectedDriverIds([]); toast({ title: 'Activated' }); }, onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }) });
  const bulkDeactivate = useMutation({ mutationFn: async () => { await supabase.from('drivers').update({ status: 'Offline' }).in('id', selectedDriverIds); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); setSelectedDriverIds([]); toast({ title: 'Deactivated' }); }, onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }) });
  const bulkVerify     = useMutation({ mutationFn: async () => { await supabase.from('drivers').update({ is_verified: true }).in('id', selectedDriverIds); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers'] }); setSelectedDriverIds([]); toast({ title: 'Verified' }); }, onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }) });
  const bulkAssign     = useMutation({
    mutationFn: async (vtype: string) => {
      const { data: maps } = await supabase.from('hub_partner_drivers').select('vehicle_id').in('driver_id', selectedDriverIds);
      const vids = (maps || []).map((m: any) => m.vehicle_id).filter(Boolean);
      if (vids.length) await supabase.from('vehicles').update({ vehicle_type: vtype }).in('id', vids);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hub-drivers', 'hub-vehicles'] }); setSelectedDriverIds([]); toast({ title: 'Category assigned' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Bulk Import Execution (client-side, no RPC) ───────────────────────────
  const runImport = useMutation({
    mutationFn: async () => {
      const validRows = previewData.filter(r => r.isValid);
      if (!validRows.length) throw new Error('No valid rows to import');

      const { data: hub } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      if (!hub) throw new Error('Hub not found');
      const hpId = hub.id;

      // DB duplicate check
      const mobiles  = validRows.map(r => r.data.driver_mobile).filter(Boolean);
      const licenses = validRows.map(r => r.data.license_number).filter(Boolean);
      const rcs      = validRows.map(r => r.data.rc_number).filter(Boolean);

      const [{ data: exMobiles }, { data: exLicenses }, { data: exRCs }] = await Promise.all([
        supabase.from('drivers').select('mobile').in('mobile', mobiles),
        supabase.from('driver_documents').select('license_number').in('license_number', licenses),
        supabase.from('vehicle_documents').select('rc_number').in('rc_number', rcs),
      ]);

      const dupMobiles  = new Set((exMobiles  || []).map((d: any) => d.mobile));
      const dupLicenses = new Set((exLicenses || []).map((d: any) => d.license_number));
      const dupRCs      = new Set((exRCs      || []).map((d: any) => d.rc_number));

      let success = 0;
      const skippedRows: any[] = [];
      const errorRows: any[] = [];

      for (const row of validRows) {
        const d = row.data;

        // Duplicate guard
        if (d.driver_mobile && dupMobiles.has(d.driver_mobile)) {
          skippedRows.push({ row: row.rowNumber, driver_name: d.driver_name, mobile: d.driver_mobile, rc_number: d.rc_number, reason: `Mobile already exists: ${d.driver_mobile}` });
          continue;
        }
        if (d.license_number && dupLicenses.has(d.license_number)) {
          skippedRows.push({ row: row.rowNumber, driver_name: d.driver_name, mobile: d.driver_mobile, rc_number: d.rc_number, reason: `License already exists: ${d.license_number}` });
          continue;
        }
        if (d.rc_number && dupRCs.has(d.rc_number)) {
          skippedRows.push({ row: row.rowNumber, driver_name: d.driver_name, mobile: d.driver_mobile, rc_number: d.rc_number, reason: `RC Number already exists: ${d.rc_number}` });
          continue;
        }

        try {
          // 1. Create Vehicle (all fields optional — import with whatever is available)
          const vehicleName = [d.vehicle_model, d.vehicle_year].filter(Boolean).join(' ') || d.driver_name || 'Imported Vehicle';
          const { data: nv, error: vErr } = await supabase.from('vehicles').insert({
            vehicle_name: vehicleName,
            vehicle_model: d.vehicle_model || null,
            vehicle_type: standardizeVehicleType(d.vehicle_type),
            vehicle_number: d.rc_number || `IMP-${Date.now()}`,
            vehicle_brand: null,
            seating_capacity: 4,
            status: 'Available',
            hub_id: uuid,
            hub_partner_id: hpId,
            created_by: hpId,
            ...(d.vehicle_year        && { vehicle_year:        d.vehicle_year }),
            ...(d.fuel_type           && { fuel_type:           d.fuel_type }),
            ...(d.vehicle_color       && { vehicle_color:       d.vehicle_color }),
            ...(d.boot_space          && { boot_space:          d.boot_space }),
            ...(d.operating_location  && { operating_location:  d.operating_location }),
            ...(d.service_offerings   && { service_offerings:   parseServiceOfferings(d.service_offerings) }),
          }).select('id').single();
          if (vErr) throw vErr;

          // 2. Create Vehicle Documents
          await supabase.from('vehicle_documents').insert({
            vehicle_id: nv.id,
            rc_number: d.rc_number || null,
          });

          // 3. Create Driver (name/mobile optional — import with whatever is available)
          const { data: nd, error: dErr } = await supabase.from('drivers').insert({
            driver_name: d.driver_name || 'Unknown',
            mobile: d.driver_mobile || null,
            city: d.operating_location || null,
            status: 'Available',
            hub_id: uuid,
            hub_partner_id: hpId,
            created_by: hpId,
            ...(d.driving_experience       && { driving_experience:       d.driving_experience }),
            ...(d.emergency_contact_name   && { emergency_contact_name:   d.emergency_contact_name }),
            ...(d.emergency_contact_mobile && { emergency_contact_mobile: d.emergency_contact_mobile }),
            ...(d.remarks                  && { remarks:                  d.remarks }),
          }).select('id').single();
          if (dErr) throw dErr;

          // 4. Create Driver Documents
          await supabase.from('driver_documents').insert({
            driver_id: nd.id,
            license_number: d.license_number || null,
            license_expiry: normDate(d.license_expiry),
          });

          // 5. Link Driver ↔ Vehicle via hub_partner_drivers
          await supabase.from('hub_partner_drivers').insert({
            hub_id: uuid,
            hub_partner_id: hpId,
            driver_id: nd.id,
            vehicle_id: nv.id,
            created_by: hpId,
          });

          success++;
        } catch (e: any) {
          errorRows.push({ row: row.rowNumber, driver_name: d.driver_name, mobile: d.driver_mobile, rc_number: d.rc_number, reason: e.message });
        }
      }

      return {
        total:    previewData.length,
        valid:    validRows.length,
        success,
        skipped:  skippedRows.length,
        failed:   errorRows.length,
        skippedRows,
        errorRows,
        allErrors: [...skippedRows, ...errorRows],
      };
    },
    onSuccess: (result) => {
      setImportResults(result);
      setImportStep(3);
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['hub-vehicles'] });
      toast({ title: `Import complete: ${result.success} records added` });
    },
    onError: (e: any) => toast({ title: 'Import failed', description: e.message, variant: 'destructive' }),
  });

  // ── File processing ────────────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type !== 'dragleave'); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) { if (e.target.files?.[0]) processFile(e.target.files[0]); }

  const processFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast({ title: 'File too large (max 20MB)', variant: 'destructive' }); return; }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      toast({ title: 'Invalid format', description: 'Upload Excel (.xlsx/.xls) or CSV', variant: 'destructive' }); return;
    }
    setImportFile(file);
    const reader = new FileReader();
    if (name.endsWith('.csv')) {
      reader.onload = (evt) => {
        Papa.parse(evt.target?.result as string, { header: true, skipEmptyLines: true, complete: (r) => processParsed(r.data), error: (err) => toast({ title: 'CSV error', description: err.message, variant: 'destructive' }) });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array', cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          processParsed(XLSX.utils.sheet_to_json(ws, { defval: '' }));
        } catch (err: any) { toast({ title: 'Excel error', description: err.message, variant: 'destructive' }); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processParsed = (rawRows: any[]) => {
    if (!rawRows.length) { toast({ title: 'File is empty', variant: 'destructive' }); return; }

    // Build column map from first row headers
    const detectedMap: Record<string, string> = {};
    const unmapped: string[] = [];
    const firstRowKeys = Object.keys(rawRows[0]);
    firstRowKeys.forEach(k => {
      const mapped = smartMapHeader(k);
      if (mapped) detectedMap[k] = mapped;
      else unmapped.push(k);
    });
    setColumnMap(detectedMap);
    setUnmappedCols(unmapped);

    // Process rows using the detected map
    const mobileSeen   = new Set<string>();
    const licenseSeen  = new Set<string>();
    const rcSeen       = new Set<string>();

    const processed = rawRows.map((row: any, idx) => {
      const entry: any = {};
      Object.entries(row).forEach(([rawKey, val]) => {
        const field = detectedMap[rawKey];
        if (field) entry[field] = val !== null && val !== undefined ? String(val).trim() : '';
      });

      const errors = validateRow(entry);

      // In-file duplicate detection
      if (entry.driver_mobile) {
        if (mobileSeen.has(entry.driver_mobile)) errors.push(`Duplicate mobile in file: ${entry.driver_mobile}`);
        else mobileSeen.add(entry.driver_mobile);
      }
      if (entry.license_number) {
        if (licenseSeen.has(entry.license_number)) errors.push(`Duplicate license in file: ${entry.license_number}`);
        else licenseSeen.add(entry.license_number);
      }
      if (entry.rc_number) {
        if (rcSeen.has(entry.rc_number)) errors.push(`Duplicate RC in file: ${entry.rc_number}`);
        else rcSeen.add(entry.rc_number);
      }

      return { rowNumber: idx + 2, data: entry, errors, isValid: errors.length === 0 };
    });

    setPreviewData(processed);
    setImportStep(2);
  };

  // ── Template downloads ─────────────────────────────────────────────────────
  const downloadExcelTemplate = () => {
    const headers = [['Car Model Name','Car Model Year','Fuel Type','RC Number','Cab Type','Boot Space','Vehicle Color','Cab Owner Name','Mobile Number','Location/Area','Service Offerings','Driving Experience','Driving License','License Expiry Date','Emergency Contact Name','Emergency Contact Number','Notes']];
    const sample  = [['Swift Dzire','2022','Petrol','TS09AB1234','Sedan','400L','White','Rajesh Kumar','9876543210','Hyderabad','Outstation,Airport Transfer','5 Years','TS0720140012345','2028-12-31','Suresh Kumar','9876500000','Good driver']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fleet Import');
    XLSX.writeFile(wb, 'fleet_import_template.xlsx');
  };

  const downloadCSVTemplate = () => {
    const fields = ['Car Model Name','Car Model Year','Fuel Type','RC Number','Cab Type','Boot Space','Vehicle Color','Cab Owner Name','Mobile Number','Location/Area','Service Offerings','Driving Experience','Driving License','License Expiry Date','Emergency Contact Name','Emergency Contact Number','Notes'];
    const data   = [['Swift Dzire','2022','Petrol','TS09AB1234','Sedan','400L','White','Rajesh Kumar','9876543210','Hyderabad','Outstation,Airport Transfer','5 Years','TS0720140012345','2028-12-31','Suresh Kumar','9876500000','Good driver']];
    const csv = Papa.unparse({ fields, data });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'fleet_import_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadErrorReport = (log: any[]) => {
    const csv = Papa.unparse(log);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `import_errors_${format(new Date(),'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportDrivers = () => {
    const target = selectedDriverIds.length ? (drivers || []).filter((d: any) => selectedDriverIds.includes(d.id)) : (drivers || []);
    if (!target.length) { toast({ title: 'No drivers to export' }); return; }
    const csv = Papa.unparse(target.map((d: any) => ({ 'Driver Name': d.driver_name, 'Mobile': d.mobile, 'License Number': d.license_number || '', 'Status': d.status || '', 'Verified': d.is_verified ? 'Yes' : 'No', 'Rating': d.rating || '5.0', 'Vehicle': d.vehicle_assigned || '' })));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `drivers_${format(new Date(),'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isExpiringSoon = (d?: string | null) => { if (!d) return false; const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff <= 30 && diff >= 0; };
  const filteredDrivers  = (drivers  || []).filter((d: any) => !search || d.driver_name?.toLowerCase().includes(search.toLowerCase()) || d.mobile?.includes(search));
  const filteredVehicles = (vehicles || []).filter((v: any) => !search || v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) || v.vehicle_number?.includes(search));
  const df = (k: keyof typeof emptyDriver) => (v: string) => setDriverForm(p => ({ ...p, [k]: v }));
  const vf = (k: keyof typeof emptyVehicle) => (v: string) => setVehicleForm(p => ({ ...p, [k]: v }));
  const resetImport = () => { setImportStep(1); setImportFile(null); setPreviewData([]); setImportResults(null); setColumnMap({}); setUnmappedCols([]); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Drivers & Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your fleet with bulk Excel import</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="h-4 w-4" /> Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}
          </Button>
          <Button onClick={() => { resetImport(); setShowImport(true); }} className="rounded-xl gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0">
            <FileSpreadsheet className="h-4 w-4" /> Excel Import
          </Button>
          {tab === 'drivers' && (
            <Button onClick={handleExportDrivers} className="rounded-xl gap-2 font-semibold" variant="outline">
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers',       value: drivers?.length  || 0, color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Verified Drivers',    value: (drivers  || []).filter((d: any) => d.is_verified).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Vehicles',      value: vehicles?.length || 0, color: 'text-purple-600',  bg: 'bg-purple-50' },
          { label: 'Expiring Documents',  value: (vehicles || []).filter((v: any) => isExpiringSoon(v.insurance_expiry) || isExpiringSoon(v.fitness_expiry) || isExpiringSoon(v.permit_expiry)).length, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border border-border/30 dark:bg-transparent ${s.bg} dark:${s.bg.replace('bg-', 'bg-').replace('-50', '-900/20')}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(['drivers', 'vehicles'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'drivers' ? <User className="h-4 w-4" /> : <Car className="h-4 w-4" />}
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'drivers' ? drivers?.length : vehicles?.length} || 0)
          </button>
        ))}
      </div>

      {/* Bulk action toolbar */}
      {selectedDriverIds.length > 0 && tab === 'drivers' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/70 border border-emerald-600/30 rounded-xl">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
            <span className="bg-emerald-600 text-white rounded-full px-2 py-0.5 text-[10px]">{selectedDriverIds.length}</span> selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => bulkActivate.mutate()}   size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Activate</Button>
            <Button onClick={() => bulkDeactivate.mutate()} size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs"><ShieldX    className="h-3.5 w-3.5 text-red-500"     /> Deactivate</Button>
            <Button onClick={() => bulkVerify.mutate()}     size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs"><Check      className="h-3.5 w-3.5 text-blue-500"    /> Verify</Button>
            <Select onValueChange={(v) => bulkAssign.mutate(v)}>
              <SelectTrigger className="h-8 w-40 text-xs rounded-lg"><SelectValue placeholder="Assign Type" /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleExportDrivers} size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button onClick={() => setSelectedDriverIds([])} size="icon" variant="ghost" className="h-8 w-8 rounded-lg"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${tab}...`} className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Drivers table */}
      {tab === 'drivers' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox checked={selectedDriverIds.length === filteredDrivers.length && filteredDrivers.length > 0}
                      onCheckedChange={c => setSelectedDriverIds(c ? filteredDrivers.map((d: any) => d.id) : [])} />
                  </TableHead>
                  {['Driver','Mobile','License','Vehicle','Rating','Verified','Status',''].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDrivers ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground"><User className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No drivers yet. Use Excel Import to add in bulk.</p></TableCell></TableRow>
                ) : filteredDrivers.map((d: any) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell><Checkbox checked={selectedDriverIds.includes(d.id)} onCheckedChange={c => setSelectedDriverIds(p => c ? [...p, d.id] : p.filter(x => x !== d.id))} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600">{d.driver_name?.charAt(0)?.toUpperCase()}</div>
                        <div><p className="font-semibold text-sm">{d.driver_name}</p>{d.operating_location && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{d.operating_location}</p>}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{d.mobile}</TableCell>
                    <TableCell className="text-xs font-mono">{d.license_number || '—'}</TableCell>
                    <TableCell className="text-xs">{(d.vehicle_name || d.vehicle_assigned) ? <div><p className="font-semibold text-sm">{d.vehicle_name || '—'}</p>{d.vehicle_assigned && !d.vehicle_assigned.startsWith('IMP-') && <p className="text-[10px] text-muted-foreground font-mono">{d.vehicle_assigned}</p>}</div> : '—'}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /><span className="text-sm font-semibold">{d.rating || '5.0'}</span></div></TableCell>
                    <TableCell><Badge variant={d.is_verified ? "default" : "secondary"} className={d.is_verified ? "bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]" : "text-[10px]"}>{d.is_verified ? 'Verified' : 'Pending'}</Badge></TableCell>
                    <TableCell><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{d.status || 'Available'}</span></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewDetail({ type: 'driver', data: d })}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                          {!d.is_verified ? (
                            <DropdownMenuItem onClick={() => approveDriver.mutate(d.id)} className="text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"><Check className="h-4 w-4 mr-2 text-emerald-600" />Approve Driver</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => rejectDriver.mutate(d.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50"><ShieldX className="h-4 w-4 mr-2 text-red-500" />Reject Driver</DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild><a href={`tel:${d.mobile}`}><Phone className="h-4 w-4 mr-2" />Call Driver</a></DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {d.status !== 'Available'
                            ? <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'Available' })}><ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />Activate</DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => updateDriverStatus.mutate({ id: d.id, status: 'Offline' })}><ShieldX className="h-4 w-4 mr-2 text-destructive" />Deactivate</DropdownMenuItem>
                          }
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Vehicles table */}
      {tab === 'vehicles' && (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {['Vehicle','Type','RC Number','Color','Fuel','Location','Insurance','Status'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingVehicles ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground"><Car className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No vehicles yet</p></TableCell></TableRow>
                ) : filteredVehicles.map((v: any) => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-base">{v.vehicle_model || v.vehicle_name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {[v.vehicle_year, v.rc_number && !v.rc_number.startsWith('IMP-') ? v.rc_number : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{v.vehicle_type}</span></TableCell>
                    <TableCell className="font-mono text-xs">{v.rc_number || '—'}</TableCell>
                    <TableCell className="text-xs">{v.vehicle_color || '—'}</TableCell>
                    <TableCell className="text-xs">{v.fuel_type || '—'}</TableCell>
                    <TableCell className="text-xs">{v.operating_location || '—'}</TableCell>
                    <TableCell>
                      {v.insurance_expiry ? (
                        <div className="flex items-center gap-1">
                          {isExpiringSoon(v.insurance_expiry) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          <span className={`text-xs ${isExpiringSoon(v.insurance_expiry) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>{format(new Date(v.insurance_expiry), 'dd MMM yy')}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${v.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{v.status || 'Available'}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Manual Add Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" />Add {tab === 'drivers' ? 'Driver' : 'Vehicle'}</DialogTitle></DialogHeader>
          {tab === 'drivers' ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Full Name *', key: 'driver_name', placeholder: 'Driver name' }, { label: 'Mobile *', key: 'mobile', placeholder: '10-digit' }, { label: 'Email', key: 'email', placeholder: 'email@example.com' }, { label: 'License No *', key: 'license_number', placeholder: 'DL number' }, { label: 'License Expiry', key: 'license_expiry', type: 'date' }, { label: 'City', key: 'city', placeholder: 'City' }].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{f.label}</Label>
                    <Input value={driverForm[f.key as keyof typeof emptyDriver]} onChange={e => df(f.key as any)(e.target.value)} placeholder={f.placeholder} type={f.type || 'text'} className="rounded-xl" />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={() => addDriver.mutate(driverForm)} disabled={!driverForm.driver_name || !driverForm.mobile || !driverForm.license_number || addDriver.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  {addDriver.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Driver
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Vehicle Name *', key: 'vehicle_name', placeholder: 'e.g. Toyota Innova' }, { label: 'Reg. Number *', key: 'vehicle_number', placeholder: 'MH12AB1234' }, { label: 'Vehicle Brand', key: 'vehicle_brand', placeholder: 'Toyota' }, { label: 'Vehicle Model', key: 'vehicle_model', placeholder: 'Innova' }, { label: 'RC Number', key: 'rc_number', placeholder: 'RC number' }, { label: 'Seating Capacity', key: 'seating_capacity', placeholder: '4', type: 'number' }].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{f.label}</Label>
                    <Input value={vehicleForm[f.key as keyof typeof emptyVehicle]} onChange={e => vf(f.key as any)(e.target.value)} placeholder={f.placeholder} type={f.type || 'text'} className="rounded-xl" />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Type *</Label>
                  <Select value={vehicleForm.vehicle_type} onValueChange={vf('vehicle_type')}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={() => addVehicle.mutate(vehicleForm)} disabled={!vehicleForm.vehicle_name || !vehicleForm.vehicle_number || addVehicle.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  {addVehicle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Vehicle
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Driver/Vehicle Detail Dialog ──────────────────────────────────── */}
      <Dialog open={!!viewDetail} onOpenChange={o => !o && setViewDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Driver & Vehicle Details</DialogTitle></DialogHeader>
          {viewDetail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {/* Driver Information */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2"><User className="h-4 w-4" />Driver Information</h3>
                {[
                  ['Name',            viewDetail.data.driver_name],
                  ['Mobile',          viewDetail.data.mobile],
                  ['Experience',      viewDetail.data.driving_experience],
                  ['License No.',     viewDetail.data.license_number],
                  ['License Expiry',  viewDetail.data.driver_documents?.license_expiry ? format(new Date(viewDetail.data.driver_documents.license_expiry), 'dd MMM yyyy') : null],
                  ['Location',        viewDetail.data.operating_location || viewDetail.data.city],
                  ['Status',          viewDetail.data.status],
                  ['Verified',        viewDetail.data.is_verified ? 'Yes' : 'No'],
                ].filter(([,v]) => v).map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-semibold text-right max-w-[60%]">{v as string}</span>
                  </div>
                ))}
              </div>
              {/* Vehicle Information */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2"><Car className="h-4 w-4" />Vehicle Information</h3>
                {[
                  ['Model',       viewDetail.data.vehicle_name],
                  ['RC Number',   viewDetail.data.vehicle_assigned],
                  ['Type',        viewDetail.data.vehicle_type],
                  ['Color',       viewDetail.data.vehicle_color],
                  ['Fuel',        viewDetail.data.fuel_type],
                  ['Year',        viewDetail.data.vehicle_year],
                  ['Boot Space',  viewDetail.data.boot_space],
                ].filter(([,v]) => v).map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-semibold">{v as string}</span>
                  </div>
                ))}
              </div>
              {/* Emergency Contact */}
              {(viewDetail.data.emergency_contact_name || viewDetail.data.emergency_contact_mobile) && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2"><Phone className="h-4 w-4" />Emergency Contact</h3>
                  {[['Name', viewDetail.data.emergency_contact_name], ['Number', viewDetail.data.emergency_contact_mobile]].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} className="flex justify-between text-sm"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v as string}</span></div>
                  ))}
                </div>
              )}
              {/* Service Offerings */}
              {viewDetail.data.service_offerings?.length > 0 && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2"><Tag className="h-4 w-4" />Service Offerings</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(viewDetail.data.service_offerings) ? viewDetail.data.service_offerings : [viewDetail.data.service_offerings]).map((s: string) => (
                      <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Remarks */}
              {viewDetail.data.remarks && (
                <div className="sm:col-span-2 space-y-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2"><Info className="h-4 w-4" />Remarks</h3>
                  <p className="text-sm text-muted-foreground">{viewDetail.data.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Excel Import Dialog ───────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={o => { if (!o) resetImport(); setShowImport(o); }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Intelligent Excel Import — Drivers & Vehicles
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-2">
            {['Upload File', 'Preview & Validate', 'Import Summary'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${importStep === i + 1 ? 'bg-emerald-600 text-white' : importStep > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {importStep > i + 1 ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {label}
                </div>
                {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {importStep === 1 && (
            <div className="space-y-5 py-2">
              {/* Template download */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div>
                  <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Download Import Template</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Pre-formatted with all required columns. Smart mapping also works for custom column names.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadExcelTemplate} variant="outline" className="rounded-xl gap-1.5 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                    <Download className="h-3.5 w-3.5" /> Excel (.xlsx)
                  </Button>
                  <Button onClick={downloadCSVTemplate} variant="outline" className="rounded-xl gap-1.5 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                    <Download className="h-3.5 w-3.5" /> CSV (.csv)
                  </Button>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all cursor-pointer ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-500/50 bg-muted/10'}`}
              >
                <input type="file" id="import-file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold">Drag & drop your Excel or CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx · .xls · .csv · Max 20MB</p>
                <Button className="mt-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-6">Browse File</Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview & Validate ────────────────────────────────── */}
          {importStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Column mapping report */}
              {Object.keys(columnMap).length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Auto-Detected {Object.keys(columnMap).length} columns · {unmappedCols.length} unrecognized</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(columnMap).map(([col, field]) => (
                      <span key={col} className="text-[10px] font-semibold px-2 py-0.5 bg-white dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-full text-emerald-700">
                        {col} → {field}
                      </span>
                    ))}
                    {unmappedCols.map(col => (
                      <span key={col} className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-amber-600">
                        {col} (skipped)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation summary */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Import Preview — {previewData.length} rows from "{importFile?.name}"</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Review before importing. Invalid rows are skipped automatically.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full">{previewData.filter(r => r.isValid).length} valid</span>
                  <span className="text-xs font-bold px-3 py-1.5 bg-red-100 text-red-600 rounded-full">{previewData.filter(r => !r.isValid).length} errors</span>
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-border/50 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {['Row','Driver Name','Mobile','Vehicle Model','Vehicle Type','RC Number','License No.','Location','Status'].map(h => (
                        <TableHead key={h} className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map(row => (
                      <TableRow key={row.rowNumber} className={row.isValid ? 'hover:bg-muted/30' : 'bg-red-500/5 hover:bg-red-500/10'}>
                        <TableCell className="text-xs font-bold text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell className="text-xs font-semibold">{row.data.driver_name || '—'}</TableCell>
                        <TableCell className="text-xs">{row.data.driver_mobile || '—'}</TableCell>
                        <TableCell className="text-xs">{row.data.vehicle_model || '—'}{row.data.vehicle_year ? ` (${row.data.vehicle_year})` : ''}</TableCell>
                        <TableCell className="text-xs">{row.data.vehicle_type ? standardizeVehicleType(row.data.vehicle_type) : '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{row.data.rc_number || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{row.data.license_number || '—'}</TableCell>
                        <TableCell className="text-xs">{row.data.operating_location || '—'}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" />Valid</span>
                          ) : (
                            <div className="space-y-0.5 min-w-[160px]">
                              {row.errors.map((e: string, i: number) => (
                                <p key={i} className="text-[9px] text-red-500 flex items-start gap-1 leading-tight"><AlertCircle className="h-2.5 w-2.5 shrink-0 mt-0.5" />{e}</p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setImportStep(1)} className="rounded-xl">← Back</Button>
                <Button onClick={() => runImport.mutate()} disabled={previewData.filter(r => r.isValid).length === 0 || runImport.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  {runImport.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import {previewData.filter(r => r.isValid).length} Records</>}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 3: Summary ───────────────────────────────────────────── */}
          {importStep === 3 && importResults && (
            <div className="space-y-6 py-2">
              <div className="text-center py-6 bg-muted/10 border border-border/50 rounded-xl">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-black">Import Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">Records have been created and linked to your hub</p>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Rows',           value: importResults.total,   color: 'text-foreground',   bg: 'bg-muted/50' },
                  { label: 'Successfully Imported', value: importResults.success, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Skipped Duplicates',   value: importResults.skipped, color: 'text-amber-600',   bg: 'bg-amber-50' },
                  { label: 'Failed Rows',           value: importResults.failed,  color: 'text-red-500',     bg: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className={`p-4 rounded-xl border border-border/50 ${s.bg}`}>
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Error details */}
              {importResults.allErrors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-amber-500" />Skipped & Failed Records</h4>
                    <Button onClick={() => downloadErrorReport(importResults.allErrors)} variant="outline" className="rounded-xl text-xs gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Download Error Report
                    </Button>
                  </div>
                  <div className="border border-border/50 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {['Row','Driver Name','Mobile','RC Number','Reason'].map(h => <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.allErrors.map((err: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{err.row}</TableCell>
                            <TableCell className="text-xs">{err.driver_name || '—'}</TableCell>
                            <TableCell className="text-xs">{err.mobile || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{err.rc_number || '—'}</TableCell>
                            <TableCell className="text-xs font-semibold text-amber-600">{err.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => { resetImport(); setShowImport(false); }} className="rounded-xl w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
