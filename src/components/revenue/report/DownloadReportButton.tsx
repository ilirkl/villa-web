'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateMonthlyReport } from '@/lib/actions/reports';

interface DownloadReportButtonProps {
    month: string; // Format: "Month Year" (e.g., "January 2024")
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
            
            // Get month number (1-12)
            const date = new Date(`${monthName} 1, ${year}`);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date: ${monthName} 1, ${year}`);
            }
            const monthNumber = (date.getMonth() + 1).toString();

            console.log('Requesting report generation:', { monthNumber, year });
            toast.info('Generating report...');

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
            } else if (response instanceof ArrayBuffer) {
                pdfBuffer = new Uint8Array(response);
            } else {
                throw new Error(`Unexpected response type: ${typeof response}`);
            }

            console.log('Creating PDF blob, buffer size:', pdfBuffer.length);

            // Create blob and download
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report-${monthName}-${year}.pdf`);

            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Report downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate report');
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
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? 'Generating...' : 'Download Report'}
        </Button>
    );
}
