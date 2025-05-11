'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { syncAirbnbIcal, syncBookingComIcal } from '@/lib/actions/ical-sync';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function IcalSettings({ 
  initialAirbnbUrl = '', 
  initialBookingComUrl = '', 
  dictionary,
  onUrlChange
}: { 
  initialAirbnbUrl?: string, 
  initialBookingComUrl?: string, 
  dictionary: any,
  onUrlChange?: (airbnbUrl: string, bookingComUrl: string) => void
}) {
  const [airbnbIcalUrl, setAirbnbIcalUrl] = useState(initialAirbnbUrl);
  const [bookingComIcalUrl, setBookingComIcalUrl] = useState(initialBookingComUrl);
  const [isSyncingAirbnb, setIsSyncingAirbnb] = useState(false);
  const [isSyncingBookingCom, setIsSyncingBookingCom] = useState(false);

  // Update parent component when URLs change
  const handleAirbnbUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setAirbnbIcalUrl(newUrl);
    if (onUrlChange) {
      onUrlChange(newUrl, bookingComIcalUrl);
    }
  };

  const handleBookingComUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setBookingComIcalUrl(newUrl);
    if (onUrlChange) {
      onUrlChange(airbnbIcalUrl, newUrl);
    }
  };

  const syncAirbnb = async () => {
    if (!airbnbIcalUrl) {
      toast.error(dictionary.please_enter_ical_url || 'Please enter an Airbnb iCal URL first');
      return;
    }
    
    setIsSyncingAirbnb(true);
    try {
      const result = await syncAirbnbIcal(airbnbIcalUrl);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Error syncing Airbnb iCal:', error);
      toast.error(dictionary.error_syncing || 'Error syncing with Airbnb');
    } finally {
      setIsSyncingAirbnb(false);
    }
  };

  const syncBookingCom = async () => {
    if (!bookingComIcalUrl) {
      toast.error(dictionary.please_enter_booking_com_ical_url || 'Please enter a Booking.com iCal URL first');
      return;
    }
    
    setIsSyncingBookingCom(true);
    try {
      const result = await syncBookingComIcal(bookingComIcalUrl);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Error syncing Booking.com iCal:', error);
      toast.error(dictionary.error_syncing_booking_com || 'Error syncing with Booking.com');
    } finally {
      setIsSyncingBookingCom(false);
    }
  };

  return (
    <Card className="mb-8"> {/* Added margin-bottom for spacing */}
      <CardHeader>
        <CardTitle>{dictionary.calendar_sync || 'Calendar Sync'}</CardTitle>
        <CardDescription>
          {dictionary.calendar_sync_description || 'Sync your bookings automatically using iCal'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="airbnb">
          <TabsList className="mb-4">
            <TabsTrigger value="airbnb">Airbnb</TabsTrigger>
            <TabsTrigger value="bookingcom">Booking.com</TabsTrigger>
          </TabsList>
          
          <TabsContent value="airbnb">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="airbnb-ical-url" className="text-sm font-medium">
                  {dictionary.airbnb_ical_url || 'Airbnb iCal URL'}
                </label>
                <Input
                  id="airbnb-ical-url"
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={airbnbIcalUrl}
                  onChange={handleAirbnbUrlChange}
                />
                <p className="text-xs text-muted-foreground">
                  {dictionary.find_airbnb_ical_url_instructions || 'Find this in your Airbnb hosting dashboard under Calendar > Export Calendar'}
                </p>
              </div>
              <div className="flex justify-end items-center pb-2">
                <Button 
                  variant="outline" 
                  onClick={syncAirbnb} 
                  disabled={isSyncingAirbnb}
                  size="sm"
                >
                  {isSyncingAirbnb 
                    ? (dictionary.syncing || 'Syncing...') 
                    : (dictionary.sync_airbnb_now || 'Sync Airbnb Now')}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bookingcom">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="bookingcom-ical-url" className="text-sm font-medium">
                  {dictionary.booking_com_ical_url || 'Booking.com iCal URL'}
                </label>
                <Input
                  id="bookingcom-ical-url"
                  placeholder="https://admin.booking.com/hotel/hoteladmin/ical/..."
                  value={bookingComIcalUrl}
                  onChange={handleBookingComUrlChange}
                />
                <p className="text-xs text-muted-foreground">
                  {dictionary.find_booking_com_ical_url_instructions || 'Find this in your Booking.com extranet under Calendar > Sync calendars > Export calendar'}
                </p>
              </div>
              <div className="flex justify-end items-center pb-2">
                <Button 
                  variant="outline" 
                  onClick={syncBookingCom} 
                  disabled={isSyncingBookingCom}
                  size="sm"
                >
                  {isSyncingBookingCom 
                    ? (dictionary.syncing || 'Syncing...') 
                    : (dictionary.sync_booking_com_now || 'Sync Booking.com Now')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}








