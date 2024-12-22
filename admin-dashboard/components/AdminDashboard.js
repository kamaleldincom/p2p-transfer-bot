import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeTransactions: 0,
    completionRate: '0%'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, txRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/transactions')
        ]);
        const [usersData, txData] = await Promise.all([
          usersRes.json(),
          txRes.json()
        ]);
        setUsers(usersData);
        setTransactions(txData);
        setMetrics({
          totalUsers: usersData.length,
          activeTransactions: txData.length,
          completionRate: calculateCompletionRate(txData)
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const calculateCompletionRate = (txData) => {
    if (!Array.isArray(txData)) return '0%';
    const completed = txData.filter(tx => tx.status === 'completed')?.length || 0;
    return txData.length ? `${((completed / txData.length) * 100).toFixed(1)}%` : '0%';
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: currentStatus === 'active' ? 'suspended' : 'active' })
      });
      const updatedUser = await res.json();
      setUsers(users.map(u => u.userId === userId ? updatedUser : u));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const cancelTransaction = async (transactionId) => {
    try {
      await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, status: 'cancelled' })
      });
      setTransactions(transactions.filter(tx => tx.transactionId !== transactionId));
    } catch (error) {
      console.error('Error canceling transaction:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="mb-4">
        <div className="border-b">
          <div className="flex space-x-4">
            {['users', 'transactions', 'metrics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trust Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.userId}>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.trustScore}</td>
                    <td className="px-6 py-4">{user.status}</td>
                    <td className="px-6 py-4">
                      <button 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => toggleUserStatus(user.userId, user.status)}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initiator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map(tx => (
                  <tr key={tx.transactionId}>
                    <td className="px-6 py-4">{tx?.transactionId || tx?.id || 'N/A'}</td>
                    <td className="px-6 py-4">{tx?.initiator?.userId || tx?.initiator || 'N/A'}</td>
                    <td className="px-6 py-4">{tx?.recipient?.userId || tx?.recipient || 'N/A'}</td>
                    <td className="px-6 py-4">{tx?.initiator?.amount || tx?.amount || 'N/A'}</td>
                    <td className="px-6 py-4">{tx.status}</td>
                    <td className="px-6 py-4">
                      <button 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => cancelTransaction(tx.transactionId)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-3xl font-bold">{metrics.totalUsers}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Active Transactions</h3>
            <p className="text-3xl font-bold">{metrics.activeTransactions}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold">{metrics.completionRate}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;