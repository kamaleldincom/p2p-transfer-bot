import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex h-screen">
      <nav className="w-64 bg-gray-800 text-white p-4">
        <div className="text-xl font-bold mb-8">Admin Panel</div>
        <div className="space-y-2">
          <Link href="/dashboard" className="block p-2 hover:bg-gray-700 rounded">
            Dashboard
          </Link>
          <Link href="/users" className="block p-2 hover:bg-gray-700 rounded">
            Users
          </Link>
          <Link href="/transactions" className="block p-2 hover:bg-gray-700 rounded">
            Transactions
          </Link>
          <Link href="/disputes" className="block p-2 hover:bg-gray-700 rounded">
            Disputes
          </Link>
        </div>
      </nav>
      <main className="flex-1 p-8 bg-gray-100">{children}</main>
    </div>
  );
}