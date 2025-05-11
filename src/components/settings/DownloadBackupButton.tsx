'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateDataBackup } from '@/lib/actions/backup';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';

interface DownloadBackupButtonProps {
  dictionary?: any;
}

export function DownloadBackupButton({ dictionary }: DownloadBackupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { lang } = useParams();

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      toast.info(dictionary?.generating_backup || 'Generating backup...');

      console.log('Requesting backup generation...');
      // Pass the current language to the server action
      const base64Data = await generateDataBackup(lang as string);
      
      if (!base64Data) {
        throw new Error('No response received from server');
      }
      
      console.log('Received base64 data, length:', base64Data.length);

      // Convert base64 to binary
      console.log('Converting base64 to binary...');
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('Converted to binary, length:', bytes.length);

      // Create a blob with the correct MIME type for Excel
      console.log('Creating blob from binary data...');
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      console.log('Blob created, size:', blob.size);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      console.log('Created object URL:', url);
      
      // Create a download link element
      const a = document.createElement('a');
      a.href = url;
      const today = format(new Date(), 'yyyy-MM-dd');
      const filename = `VillaManager-Backup-${today}.xlsx`;
      a.download = filename;
      console.log('Setting download filename:', filename);
      
      // Append to body, click and remove
      document.body.appendChild(a);
      console.log('Triggering download...');
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL object after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log('URL object revoked');
      }, 1000);
      
      toast.success(dictionary?.backup_downloaded || 'Backup downloaded successfully');
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(`${dictionary?.backup_error || 'Error creating backup'}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="h-8 px-3"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 border-t-2 border-b-2 border-current rounded-full animate-spin mr-2" />
          <span>{dictionary?.downloading || 'Downloading...'}</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          <span>{dictionary?.backup || 'Backup'}</span>
        </>
      )}
    </Button>
  );
}








