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
import { Pencil, Trash2, Tag, FileText } from 'lucide-react';
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

interface BookingCardProps {
  booking: Booking;
  formattedStartDate: string; // Add this prop
  formattedEndDate: string;   // Add this prop
  hideFooter?: boolean;
  hideNotes?: boolean;
  onDelete?: () => void;
  onEdit?: () => void; // Add this prop
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

  // Keep handleDelete as is
  const handleDelete = async () => {
    try {
      await deleteBooking(booking.id);
      toast.success("Booking Deleted", {
        description: `Booking for ${booking.guest_name} was deleted successfully.`
      });
      onDelete?.();
    } catch (error: any) {
      toast.error("Deletion Failed", {
        description: error.message || "Failed to delete booking.",
      });
    }
  };

  // Keep handleDownloadInvoice as is - formatting here happens on user interaction, not during initial render/hydration
  const handleDownloadInvoice = async () => {
    try {
      toast.info('Generating invoice...');

      const response = await generateInvoice(booking.id);

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
        // This date formatting for the filename is generally safe as it's post-hydration
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
          {/* Source badge on the left */}
          <Badge 
            variant="outline" 
            className={`${getSourceBadgeStyle(booking.source)}`}
          >
            <Tag className="h-3 w-3 mr-1" />
            {booking.source}
          </Badge>
          
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
