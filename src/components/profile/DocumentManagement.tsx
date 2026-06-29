import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { uploadDocument } from '@/lib/r2-upload';
import { Loader2, Upload, File as FileIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentManagement() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('package_bookings')
      .select(`
        id, booking_ref,
        tour_packages(name),
        package_travellers(id, name),
        package_documents(id, document_type, file_url, verified, traveller_id)
      `)
      .eq('user_id', userData.user.id)
      .eq('booking_status', 'confirmed');
      
    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, bookingId: string, travellerId: string, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(`${travellerId}-${docType}`);
    try {
      const { publicUrl } = await uploadDocument(file, `documents/${bookingId}/${travellerId}`);

      const { error: dbError } = await supabase
        .from('package_documents')
        .insert({
          booking_id: bookingId,
          traveller_id: travellerId,
          document_type: docType,
          file_url: publicUrl,
          verified: false
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Document Management</h2>
      <p className="text-muted-foreground">Upload required documents (ID Proof, Passport, Visa) for your confirmed group tours.</p>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No confirmed bookings found</p>
            <p className="text-muted-foreground">You don't need to upload any documents right now.</p>
          </CardContent>
        </Card>
      ) : (
        bookings.map(booking => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{booking.tour_packages?.name}</CardTitle>
                <span className="text-sm font-mono bg-background px-2 py-1 rounded border">Ref: {booking.booking_ref}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {booking.package_travellers?.map((traveller: any) => {
                  const docs = booking.package_documents?.filter((d: any) => d.traveller_id === traveller.id) || [];
                  const requiredDocs = ['ID Proof', 'Passport', 'Visa'];
                  
                  return (
                    <div key={traveller.id} className="p-6">
                      <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
                        <UserIcon className="h-4 w-4" /> Traveller: {traveller.name}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {requiredDocs.map(docType => {
                          const uploadedDoc = docs.find((d: any) => d.document_type === docType);
                          const isUploading = uploading === `${traveller.id}-${docType}`;
                          
                          return (
                            <div key={docType} className="border rounded-xl p-4 flex flex-col justify-between">
                              <div className="flex justify-between items-start mb-4">
                                <span className="font-medium text-sm">{docType}</span>
                                {uploadedDoc && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${uploadedDoc.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {uploadedDoc.verified ? 'Verified' : 'Pending Review'}
                                  </span>
                                )}
                              </div>
                              
                              {uploadedDoc ? (
                                <div className="flex items-center text-sm text-green-600 font-medium">
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Uploaded
                                </div>
                              ) : (
                                <div>
                                  <input 
                                    type="file" 
                                    id={`file-${traveller.id}-${docType}`} 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(e, booking.id, traveller.id, docType)}
                                    disabled={isUploading}
                                  />
                                  <label htmlFor={`file-${traveller.id}-${docType}`}>
                                    <Button variant="outline" size="sm" className="w-full cursor-pointer" asChild disabled={isUploading}>
                                      <span>
                                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                        Upload {docType}
                                      </span>
                                    </Button>
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
