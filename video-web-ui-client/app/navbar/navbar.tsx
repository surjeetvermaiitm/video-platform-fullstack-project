import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    // <>
    <nav className="flex justify-between items-center p-[1em]">
      <Link href="/">
        <Image
          width={90}
          height={20}
          src="/youtube-logo.svg"
          alt="YouTube Logo"
        />
      </Link>
    </nav>
    // </>
  );
}
