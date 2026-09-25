import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CandidateCard } from '@/components/marketplace/CandidateCard';

export const CandidateSearch = () => {
  const [keywords, setKeywords] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const queryParams = new URLSearchParams({
      keywords,
      skills,
      location,
    });

    try {
      const response = await fetch(`/api/recruiter/search?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error('Error fetching search results');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Top Talent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Keywords (e.g., job title, industry)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <Input
              placeholder="Skills (e.g., React, Node.js)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Button type="submit" className="lg:col-start-4">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Search Results</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        ) : (
          <p>No results found.</p>
        )}
      </div>
    </div>
  );
};
