import RecruiterDashboardLayout from '../RecruiterDashboardLayout';
import withSubscription from '@/components/withSubscription';
import { CreateJobForm } from '@/components/recruiter/CreateJobForm';

const CreateJobPage = () => {
  return (
    <RecruiterDashboardLayout>
      <CreateJobForm />
    </RecruiterDashboardLayout>
  );
};

export default withSubscription(CreateJobPage);
