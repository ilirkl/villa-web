// Add this export at the top of the file
export const revalidate = 3600; // Revalidate every hour

// Add a default export for your page component
export default function VillasPage({ params }: { params: { lang: string } }) {
  return (
    <div>
      {/* Your villas page content */}
    </div>
  );
}
