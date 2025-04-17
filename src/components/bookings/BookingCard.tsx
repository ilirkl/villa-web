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
import { format } from 'date-fns';
import { Pencil, Trash2, Tag } from 'lucide-react';
import { deleteBooking } from '@/lib/actions/bookings';
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

interface BookingCardProps {
  booking: Booking;
  hideFooter?: boolean;
  hideNotes?: boolean;
  onDelete?: () => void;  // Add onDelete prop
}

export function BookingCard({ 
  booking, 
  hideFooter = false,
  hideNotes = false,
  onDelete
}: BookingCardProps) {
  // Add a function to determine badge styling based on source
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

  const handleDelete = async () => {
    try {
      await deleteBooking(booking.id);
      toast.success("Booking Deleted", {
        description: `Booking for ${booking.guest_name} was deleted successfully.`
      });
      // Call the refresh function after successful deletion
      onDelete?.();
    } catch (error: any) {
      toast.error("Deletion Failed", {
        description: error.message || "Failed to delete booking.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="mb-3">{booking.guest_name}</CardTitle>
            <CardDescription>
              {format(new Date(booking.start_date), 'dd MMM')} - {format(new Date(booking.end_date), 'dd MMM')}
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
        <CardFooter className="flex justify-between items-center">
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 text-xs ${getSourceBadgeStyle(booking.source)}`}
          >
            <Tag className="h-3 w-3" />
            {booking.source}
          </Badge>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Trash2 className="h-6 w-6 text-[#ff5a5f]" /> 
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
                  <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                       Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Link href={`/bookings/${booking.id}/edit`}>
              <Pencil className="h-6 w-6 transition-all duration-300 ease-in-out transform 
                            text-[#ff5a5f] hover:scale-110 
                            active:scale-95 active:rotate-12" /> 
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
