import React, { useState, useEffect } from 'react';
import { fetchPublicProfileBySlug } from '../lib/data';

export default function PublicOrgPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPublicProfileBySlug(slug).then(setProfile).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-500">Profile not found.</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {profile.coverImageUrl && <img src={profile.coverImageUrl} alt="" className="w-full h-48 object-cover rounded-xl mb-6" />}
        <h1 className="text-3xl font-bold text-gray-900">{profile.companyName}</h1>
        {profile.tagline && <p className="text-lg text-gray-600 mt-1">{profile.tagline}</p>}
        <div className="flex gap-6 mt-4 text-sm text-gray-500">
          {profile.yearsExperience && <span>{profile.yearsExperience} years experience</span>}
          {profile.eventsExecuted && <span>{profile.eventsExecuted} events executed</span>}
          {profile.city && <span>{profile.city}</span>}
        </div>
        {profile.about && <p className="mt-6 text-gray-700 leading-relaxed">{profile.about}</p>}
        {(profile.servicesOffered || []).length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.servicesOffered.map((s: string) => (
              <span key={s} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">{s}</span>
            ))}
          </div>
        )}
        <div className="mt-8 flex gap-4 text-sm text-gray-500">
          {profile.phone && <span>{profile.phone}</span>}
          {profile.email && <span>{profile.email}</span>}
          {profile.website && <a href={profile.website} className="text-blue-600 hover:underline">{profile.website}</a>}
        </div>
      </div>
    </div>
  );
}
