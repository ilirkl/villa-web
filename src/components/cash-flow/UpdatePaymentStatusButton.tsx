// src/components/cash-flow/UpdatePaymentStatusButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UpdatePaymentStatusButtonProps {
  id: string;
  type: 'booking' | 'expense';
  dictionary: any;
}

export function UpdatePaymentStatusButton({ 
  id, 
  type, 
  dictionary 
}: UpdatePaymentStatusButtonProps) {
  const handleMarkAsPaid = async () => {
    try {
      const response = await fetch('/api/cash-flow/update-payment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          type,
          payment_status: 'Paid',
        }),
      });

      if (response.ok) {
        toast.success(dictionary.status_updated || 'Status updated successfully');
        window.location.reload(); // Refresh to show updated data
      } else {
        toast.error(dictionary.error_updating_status || 'Error updating status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(dictionary.error_updating_status || 'Error updating status');
    }
  };

  return (
    <Button 
      size="sm" 
      onClick={handleMarkAsPaid}
      className="bg-green-600 hover:bg-green-700"
    >
      {dictionary.mark_as_paid || 'Mark as Paid'}
    </Button>
  );
}