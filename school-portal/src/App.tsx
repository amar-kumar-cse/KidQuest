import React, { useState } from 'react';

const STUDENTS = [
  { id: 1, name: 'Alice Smith', xp: 4500, level: 8, status: 'Active', trend: '+150 this week' },
  { id: 2, name: 'Bobby Jones', xp: 3200, level: 6, status: 'Active', trend: '+50 this week' },
  { id: 3, name: 'Charlie Day', xp: 800, level: 2, status: 'Needs Help', trend: '0 this week' },
  { id: 4, name: 'Diana Prince', xp: 9500, level: 12, status: 'Exceling', trend: '+800 this week' },
];

function App() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-indigo-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-wider text-indigo-200">
            KidQuest<span className="text-amber-400">.EDU</span>
          </h1>
          <p className="text-indigo-400 text-sm mt-1">Teacher Portal</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {['Overview', 'Students', 'Assignments', 'Analytics', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-indigo-900 font-bold text-lg">
              TM
            </div>
            <div>
              <p className="font-bold text-sm">Mr. Teacher</p>
              <p className="text-xs text-indigo-300">Grade 4 Science</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-5 flex items-center justify-between z-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
            <p className="text-slate-500 text-sm">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100">
              + New Assignment
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <span className="text-slate-500 font-semibold mb-1">Total Students</span>
              <span className="text-4xl font-black text-slate-800">24</span>
              <span className="text-sm text-green-500 font-medium mt-2">↑ 2 from last month</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <span className="text-slate-500 font-semibold mb-1">Class Average Level</span>
              <span className="text-4xl font-black text-indigo-600">Lvl 7</span>
              <span className="text-sm text-slate-400 font-medium mt-2">Consistent progress</span>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 rounded-2xl shadow-md flex flex-col text-white">
              <span className="font-semibold mb-1 opacity-90">Pending Reviews</span>
              <span className="text-4xl font-black">12</span>
              <span className="text-sm font-medium mt-2 opacity-90">Homework assignments submitted</span>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Student Roster</h3>
              <input 
                type="text" 
                placeholder="Search students..." 
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Total XP</th>
                    <th className="px-6 py-4 font-semibold">Level</th>
                    <th className="px-6 py-4 font-semibold">Weekly Trend</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STUDENTS.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                      <td className="px-6 py-4 text-slate-600">{student.xp.toLocaleString()} XP</td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
                          {student.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-green-600 font-medium text-sm">{student.trend}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          student.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                          student.status === 'Needs Help' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-indigo-600 font-semibold text-sm hover:underline">View All Students →</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
