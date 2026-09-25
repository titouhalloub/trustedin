import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavItemProps {
  href: string;
  label: string;
  count?: number;
  isActive: boolean;
}

const NavItem = ({ href, label, count, isActive }: NavItemProps) => (
  <Link
    href={href}
    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`}
  >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            isActive ? 'bg-primary-foreground text-primary' : 'bg-muted'
          }`}
        >
          {count}
        </span>
      )}
  </Link>
);

interface ProfileNavigationProps {
  stats: {
    activity: number;
    likes: number;
    media: number;
  };
}

export const ProfileNavigation = ({ stats }: ProfileNavigationProps) => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav className="mt-6 flex items-center gap-2 border-b pb-2">
      <NavItem href="/profile" label="Activity" count={stats.activity} isActive={currentPath === '/profile'} />
      <NavItem href="/profile/likes" label="Likes" count={stats.likes} isActive={currentPath === '/profile/likes'} />
      <NavItem href="/profile/media" label="Media" count={stats.media} isActive={currentPath === '/profile/media'} />
    </nav>
  );
};