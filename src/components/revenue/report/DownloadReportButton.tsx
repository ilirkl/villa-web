'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateMonthlyReport } from '@/lib/actions/reports';
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { getDictionary } from "@/lib/dictionary";
import { parse } from 'date-fns';
import { sq } from 'date-fns/locale';

interface DownloadReportButtonProps {
    month: string; // Format: "Month Year" (e.g., "April 2024")
    yearMonth: string; // Format: "YYYY-MM" (e.g., "2024-04")
}

export default function DownloadReportButton({ month, yearMonth }: DownloadReportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const params = useParams();
    const lang = params?.lang as string || 'en';
    const [dictionary, setDictionary] = useState<any>({});

    useEffect(() => {
        async function loadDictionary() {
            try {
                const dict = await getDictionary(lang as 'en' | 'sq');
                setDictionary(dict);
            } catch (error) {
                console.error('Failed to load dictionary:', error);
            }
        }
        loadDictionary();
    }, [lang]);

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            
            // Split month string into month and year
            const [monthName, year] = month.split(' ');
            
            if (!monthName || !year) {
                throw new Error(`Invalid month format: ${month}`);
            }

            // Extract month number from yearMonth string (YYYY-MM)
            const [_, monthNumber] = yearMonth.split('-');
            
            if (!monthNumber) {
                throw new Error(`Invalid yearMonth format: ${yearMonth}`);
            }

            console.log('Requesting report generation:', { monthNumber, year, lang });
            toast.info(dictionary.generating_report || 'Generating report...');

            // Generate PDF with language parameter
            const response = await generateMonthlyReport(monthNumber, year, lang);
            
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

            // Create a blob from the PDF buffer
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            
            // Create a download link and trigger download
            const url = URL.createObjectURL(blob);
            
            // Try to open in a new window first
            const newWindow = window.open(url, '_blank');
            
            // If popup is blocked or fails, fall back to download
            if (!newWindow) {
                const a = document.createElement('a');
                a.href = url;
                
                // Use the original filename format: Raport-Month-Year or Report-Month-Year
                const prefix = lang === 'sq' ? 'Raport' : 'Report';
                a.download = `${prefix}-${monthName}-${year}.pdf`;
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            
            // Clean up the URL object after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            toast.success(dictionary.report_downloaded || 'Report downloaded successfully');
        } catch (error: any) {
            console.error('Download error:', error);
            toast.error(`${dictionary.download_error || 'Error downloading report'}: ${error.message}`);
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
            {isLoading ? (
                <span>{dictionary.downloading || 'Downloading...'}</span>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    {dictionary.download_report || 'Download Report'}
                </>
            )}
        </Button>
    );
}