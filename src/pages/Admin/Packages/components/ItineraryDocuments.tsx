import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, UploadCloud } from 'lucide-react';

export type ItineraryDocument = {
  file: File;
  type: string;
};

interface ItineraryDocumentsProps {
  documents: ItineraryDocument[];
  onChange: (docs: ItineraryDocument[]) => void;
}

export function ItineraryDocuments({ documents, onChange }: ItineraryDocumentsProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newDocs = acceptedFiles.map(file => ({
      file,
      type: file.name.split('.').pop() || 'unknown'
    }));
    onChange([...documents, ...newDocs]);
  }, [documents, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const removeDocument = (index: number) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    onChange(newDocs);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Itinerary Documents</CardTitle>
        <CardDescription>Upload PDF, DOC, XLS files for the itinerary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">Drag & drop files here, or click to select</p>
          <p className="text-xs text-muted-foreground mt-1">Supported: PDF, DOC, DOCX, XLS, XLSX</p>
        </div>

        {documents.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Uploaded Documents</h3>
            <div className="grid gap-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm truncate">{doc.file.name}</span>
                    <span className="text-xs text-muted-foreground">({(doc.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <div className="flex gap-2">
                    {doc.type.toLowerCase() === 'pdf' && (
                      <Button variant="outline" size="sm" onClick={() => window.open(URL.createObjectURL(doc.file), '_blank')}>
                        Preview
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDocument(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
