'use client';

import { useAuth } from '@/components/AuthProvider';
import { LeadsPanel } from '@/components/LeadsPanel';

export default function ProspectosPage() {
  const { perfil } = useAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <LeadsPanel gymId={perfil?.gym_id} userId={perfil?.id} />
    </div>
  );
}
