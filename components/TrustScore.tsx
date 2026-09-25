import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrustScoreProps {
  score: number;
}

const TrustScore = ({ score }: TrustScoreProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Score</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-5xl font-bold text-blue-600">{score}</div>
        <p className="text-sm text-gray-500">out of 100</p>
      </CardContent>
    </Card>
  );
};

export default TrustScore;