'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateMonthlyReport } from '@/lib/actions/reports';
import { parse } from 'date-fns';
import { sq } from 'date-fns/locale';

interface DownloadReportButtonProps {
    month: string; // Format: "Month Year" (e.g., "Prill 2024")
}

export default function DownloadReportButton({ month }: DownloadReportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            
            // Split month string into month and year
            const [monthName, year] = month.split(' ');
            if (!monthName || !year) {
                throw new Error(`Invalid month format: ${month}`);
            }
            
            // Parse the date using Albanian locale
            const date = parse(monthName, 'MMMM', new Date(), { locale: sq });
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date: ${monthName}`);
            }

            // Get month number (1-12)
            const monthNumber = (date.getMonth() + 1).toString();

            console.log('Requesting report generation:', { monthNumber, year });
            toast.info('Po gjenerohet raporti...');

            // Generate PDF
            const response = await generateMonthlyReport(monthNumber, year);
            
            if (!response) {
                throw new Error('No response received from server');
            }

            // Convert response to Uint8Array if it isn't already
            let pdfBuffer: Uint8Array;
            if (response instanceof Uint8Array) {
                pdfBuffer = response;
            } else if (Array.isArray(response)) {
                pdfBuffer = new Uint8Array(response);
            } else if (typeof response === 'object' && response !== null && 'buffer' in response) {
                // Handle ArrayBuffer-like objects
                pdfBuffer = new Uint8Array(response as ArrayBufferLike);
            } else {
                throw new Error(`Unexpected response type: ${typeof response}`);
            }

            // Create blob and download
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Raport-${monthName}-${year}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Raporti u gjenerua me sukses!');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error('Gabim gjatë gjenerimit të raportit');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full"
        >
            <Download className="w-4 h-4 mr-2" />
            {isLoading ? 'Duke gjeneruar raportin...' : 'Shkarko Raportin PDF'}
        </Button>
    );
}
