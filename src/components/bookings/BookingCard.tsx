// components/bookings/BookingCard.tsx
'use client'

import Link from 'next/link';
import { Booking } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
// Remove format import if no longer needed elsewhere in this file,
// but keep it for the invoice filename for now.
import { format } from 'date-fns';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { deleteBooking } from '@/lib/actions/bookings';
import { generateInvoice } from '@/lib/actions/invoice';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getCsrfToken, resetCsrfToken } from '@/lib/csrf-client';

interface BookingCardProps {
  booking: Pick<Booking, 'id' | 'start_date' | 'end_date' | 'guest_name' | 'source' | 'total_amount' | 'prepayment' | 'notes'>;
  formattedStartDate: string;
  formattedEndDate: string;
  hideFooter?: boolean;
  hideNotes?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function BookingCard({
  booking,
  formattedStartDate, // Destructure the new prop
  formattedEndDate,   // Destructure the new prop
  hideFooter = false,
  hideNotes = false,
  onDelete,
  onEdit
}: BookingCardProps) {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isTokenLoaded, setIsTokenLoaded] = useState(false);
  
  // Fetch CSRF token on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchCsrfToken = async () => {
      try {
        // Reset the token first to ensure we get a fresh one
        resetCsrfToken();
        const token = await getCsrfToken();
        
        if (isMounted) {
          setCsrfToken(token);
          setIsTokenLoaded(true);
          console.log("CSRF token fetched successfully for BookingCard:", token.substring(0, 5) + "...");
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
        if (isMounted) {
          setIsTokenLoaded(false);
        }
      }
    };
    
    fetchCsrfToken();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to determine badge styling based on source (Keep as is)
  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case 'DIRECT':
        return 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20'; // Green
      case 'AIRBNB':
        return 'bg-[#ff5a5f]/10 text-[#ff5a5f] border-[#ff5a5f]/20'; // Airbnb pink
      case 'BOOKING':
        return 'bg-[#003580]/10 text-[#003580] border-[#003580]/20'; // Booking.com blue
      default:
        return '';
    }
  };

  // Function to handle booking deletion with CSRF token
  const handleDelete = async () => {
    try {
      // Always get a fresh token right before deletion
      resetCsrfToken(); // Clear any cached token
      const freshToken = await getCsrfToken(true); // Force refresh
      
      console.log("Fresh CSRF token for deletion:", freshToken.substring(0, 5) + "...");
      
      await deleteBooking(booking.id, freshToken);
      toast.success('Booking deleted successfully');
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete booking');
    }
  };

  // Handle invoice download
  const handleDownloadInvoice = async () => {
    try {
      toast.info('Generating invoice...');
      
      // We'll rely on authentication instead of CSRF token
      const response = await generateInvoice(booking.id, 'not-used');

      if (!response) {
        throw new Error('No response received from server');
      }

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

      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${booking.guest_name}-${format(new Date(booking.start_date), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      toast.success('Invoice generated successfully');
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate invoice'
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="mb-3">{booking.guest_name}</CardTitle>
            <CardDescription>
              {formattedStartDate} - {formattedEndDate}
            </CardDescription>
            
          </div>
          <div className="text-right">
            <div className="text-[#ff5a5f] font-bold">
              €{booking.total_amount?.toLocaleString()}
            </div>
            {booking.prepayment > 0 && (
              <div className="text-gray-500 text-sm">
                (€{booking.prepayment?.toLocaleString()})
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {(!hideNotes && booking.notes) && (
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Notes:</span> {booking.notes}
          </p>
        </CardContent>
      )}
      {!hideFooter && (
        <CardFooter className="flex justify-between gap-2 pt-2">
          {/* Source icons on the left */}
          <div className="flex items-center">
            {booking.source === 'AIRBNB' && (
              <Image
                src="/airbnb-icon.svg"
                alt="Airbnb"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            )}
            {booking.source === 'BOOKING' && (
              <Image
                src="/booking-icon.svg"
                alt="Booking.com"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            )}
            {booking.source === 'DIRECT' && (
              <Image
                src="/euro-icon.svg"
                alt="Cash"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            )}
          </div>
          
          {/* Icons on the right */}
          <div className="flex gap-2">
            <FileText
              className="h-6 w-6 text-[#ff5a5f] cursor-pointer transition-all duration-300 ease-in-out transform
                        hover:scale-110 active:scale-95"
              onClick={handleDownloadInvoice}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Trash2 className="h-6 w-6 text-[#ff5a5f] cursor-pointer" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the booking for {booking.guest_name}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                    className='hover:bg-[#FF5A5F]/90'
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button onClick={onEdit} className="p-0 bg-transparent border-none">
              <Pencil className="h-6 w-6 transition-all duration-300 ease-in-out transform
                          text-[#ff5a5f] hover:scale-110
                          active:scale-95 active:rotate-12 cursor-pointer" />
            </button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
