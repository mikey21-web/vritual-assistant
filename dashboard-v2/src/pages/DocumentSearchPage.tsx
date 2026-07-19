import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Search, FileText, RefreshCw } from 'lucide-react';

const SOURCE_LINKS: Record<string, string> = {
  MEDIA_FILE: '#/media',
  GENERATED_DOCUMENT: '#/documents',
  BUYER_DOCUMENT: '#/documents',
};

export default function DocumentSearchPage() {
  const [query, setQuery] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ q: query });
      if (sourceType) params.set('sourceType', sourceType);
      setResults(await api(`/document-search/search?${params.toString()}`));
      setSearched(true);
    } catch (e: any) {
      setError(true);
      toast.error(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Search</h1>
        <p className="text-sm text-muted-foreground">Search across media files, generated documents, and buyer documents</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, type, tags..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={sourceType}
          onChange={e => setSourceType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="MEDIA_FILE">Media File</option>
          <option value="GENERATED_DOCUMENT">Generated Document</option>
          <option value="BUYER_DOCUMENT">Buyer Document</option>
        </select>
        <Button onClick={search}>Search</Button>
        <Button variant="outline" size="icon" title="Refresh" onClick={search}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading && <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}

      {!loading && error && (
        <Card><CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load search results.</p>
          <Button variant="outline" onClick={search}>Retry</Button>
        </CardContent></Card>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">No documents found.</CardContent></Card>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r: any) => (
            <a key={r.id} href={SOURCE_LINKS[r.sourceType] || '#'} className="block">
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.searchableText}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{r.sourceType.replace(/_/g, ' ')}</Badge>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
