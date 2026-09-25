import Image from 'next/image';
import Link from 'next/link';
import logoSrc from '../assets/logo.svg';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" aria-label="Back to homepage" className={`inline-block ${className}`}>
      <div className="w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64">
        <Image
          src={logoSrc}
          alt="Trustedin Logo"
          width={156} // intrinsic width
          height={34} // intrinsic height
          style={{ width: '100%', height: 'auto' }}
          priority
        />
      </div>
    </Link>
  );
}
