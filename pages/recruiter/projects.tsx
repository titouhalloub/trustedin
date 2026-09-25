import RecruiterDashboardLayout from './RecruiterDashboardLayout';
import { ProjectManagement } from '@/components/recruiter/ProjectManagement';

const ProjectsPage = () => {
  return (
    <RecruiterDashboardLayout>
      <ProjectManagement />
    </RecruiterDashboardLayout>
  );
};

export default ProjectsPage;