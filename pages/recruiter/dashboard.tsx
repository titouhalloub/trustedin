import RecruiterDashboardLayout from './RecruiterDashboardLayout';

const DashboardPage = () => {
  return (
    <RecruiterDashboardLayout>
      <h1 className="text-2xl font-bold">Welcome to your Recruiter Dashboard</h1>
      <p className="text-muted-foreground">Here you can manage your candidates, job postings, and view analytics.</p>
      {/* Placeholder for dashboard widgets */}
    </RecruiterDashboardLayout>
  );
};

export default DashboardPage;
