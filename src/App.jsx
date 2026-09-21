import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'


import Login from './adminSite/adminLogin';
import Dashboard from './adminSite/adminDashboard';
import BaristaLogin from './baristaSite/baristaLogin';
import BaristaDashboard from './baristaSite/baristaDashboard';


function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 font-sans text-gray-100">
      <div className="p-8 bg-gray-900/80 border border-gray-800 shadow-2xl rounded-3xl max-w-md w-full text-center space-y-6 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">☕ Coffee Shop POS</h1>
        <p className="text-gray-400 text-sm">Select which interface you want to open:</p>
        
        <div className="flex flex-col gap-3">
          <Link 
            to="/barista/login" 
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition shadow-lg shadow-amber-900/20"
          >
            Open Barista / Cashier POS (Tablet)
          </Link>
          <Link 
            to="/admin/login" 
            className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition border border-gray-700"
          >
            Open Admin Dashboard (Login Required)
          </Link>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Created by <span className="text-amber-500 font-medium">Barista Ian G.</span>
      </div>
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0)

 return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/barista/login" element={<BaristaLogin />} />
        <Route path="/barista/dashboard" element={<BaristaDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
