import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import RecruiterDashboardLayout from '../../RecruiterDashboardLayout';
import withSubscription from '@/components/withSubscription';
import { CandidatePipeline } from '@/components/recruiter/CandidatePipeline';

const ApplicantsPage = ({ job }: { job: any }) => {
  return (
    <RecruiterDashboardLayout>
      <h1 className="text-2xl font-bold mb-4">Applicants for {job.title}</h1>
      <CandidatePipeline applicants={job.applicants} jobId={job.id} />
    </RecruiterDashboardLayout>
  );
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { id } = ctx.params!;
  const supabase = createPagesServerClient(ctx);

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, applicants:job_applications(*, candidate:profiles(*))')
    .eq('id', id)
    .single();

  if (error || !job) {
    console.error('Error fetching job and applicants:', error);
    return { notFound: true };
  }

  return {
    props: {
      job,
    },
  };
};

export default withSubscription(ApplicantsPage);
