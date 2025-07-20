import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function Logo({ 
  className = '', 
  width = 40, 
  height = 40, 
  priority = false 
}: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="YapBattle Logo"
      width={width}
      height={height}
      priority={priority}
      className={`rounded-lg ${className}`}
    />
  );
} 