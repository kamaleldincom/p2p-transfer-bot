import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';

// Define types for our statistics
interface DashboardStats {
  users: number;
  activeTransactions: number;
  disputes: number;
  recentTransactions: Array<{
    transactionId: string;
    amount: number;
    status: string;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    activeTransactions: 0,
    disputes: 0,
    recentTransactions: []
  });
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    if (!localStorage.getItem('adminAuth')) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-600">Total Users</h3>
            <p className="text-3xl font-bold mt-2">{stats.users}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-600">Active Transactions</h3>
            <p className="text-3xl font-bold mt-2">{stats.activeTransactions}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-600">Open Disputes</h3>
            <p className="text-3xl font-bold mt-2">{stats.disputes}</p>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentTransactions.map((tx) => (
                    <tr key={tx.transactionId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{tx.transactionId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{tx.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{tx.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}