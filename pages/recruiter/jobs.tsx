import RecruiterDashboardLayout from './RecruiterDashboardLayout';
import { JobPostings } from '@/components/recruiter/JobPostings';

const JobPostingsPage = () => {
  return (
    <RecruiterDashboardLayout>
      <JobPostings />
    </RecruiterDashboardLayout>
  );
};

export default JobPostingsPage;
