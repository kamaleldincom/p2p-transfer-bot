import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === 'admin') {
      // Basic auth for MVP
      localStorage.setItem('adminAuth', 'true');
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4 w-96 p-8 shadow-lg rounded">
        <h1 className="text-2xl font-bold text-center">Admin Login</h1>
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 border rounded"
          onChange={e => setCredentials({...credentials, username: e.target.value})}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          onChange={e => setCredentials({...credentials, password: e.target.value})}
        />
        <button className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
      </form>
    </div>
  );
}