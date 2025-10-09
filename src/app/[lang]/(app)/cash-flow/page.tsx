// src/app/[lang]/(app)/cash-flow/page.tsx

import { getDictionary } from '@/lib/dictionary';
import { CashFlowData } from '@/components/cash-flow/CashFlowData';

export default async function CashFlowPage({ params }: { params: { lang: string } }) {
  const dictionary = await getDictionary(params.lang as 'en' | 'sq');
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {dictionary.cash_flow_report || 'Cash Flow Report'}
        </h1>
        <p className="text-muted-foreground">
          {dictionary.cash_flow_description || 'Manage pending payments and track your cash flow'}
        </p>
      </div>
      
      <CashFlowData params={params} dictionary={dictionary} />
    </div>
  );
}