import React, { useState, useEffect, useRef } from 'react';
import { Database, LayoutDashboard, Users, Rss, MessageSquare, Settings, Search, Download, CheckCircle, Clock, Check, ChevronRight, LogIn, UserPlus, Upload, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeView, setActiveView] = useState('dashboard');
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Registration / Entry form states
  const [entryName, setEntryName] = useState('');
  const [entryEmpId, setEntryEmpId] = useState('');
  const [entryFaculty, setEntryFaculty] = useState('');
  const [entryDept, setEntryDept] = useState('');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryDob, setEntryDob] = useState('');
  const [entryHeight, setEntryHeight] = useState('');
  const [entryBloodGroup, setEntryBloodGroup] = useState('');
  const [entryAddress, setEntryAddress] = useState('');
  const [entryStaffType, setEntryStaffType] = useState('Academic');
  const [entryPhoto, setEntryPhoto] = useState('');
  const [entryCv, setEntryCv] = useState('');

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user && !isGuest) return;
    const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staff);
    });
    
    const qMessages = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNewsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeStaff();
      unsubMessages();
      unsubNews();
    };
  }, [user]);

  useEffect(() => {
    if (activeView === 'news') {
      if (audioRef.current && !isAudioMuted) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log('Audio auto-play blocked by browser', e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [activeView, isAudioMuted]);

  const isAdmin = user?.email?.toLowerCase() === 'brossj50@gmail.com' || staffList.some(s => s.email === user?.email && s.role === 'admin');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, { displayName: authName });
        
        // Save additional user data to firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: authName,
          phone: authPhone,
          email: authEmail,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderEmail: user.email,
        senderName: user.displayName || 'User',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddNews = async () => {
    if (!newsTitle.trim() || !newsContent.trim() || !user) return;
    try {
      if (editingNewsId) {
        await updateDoc(doc(db, 'news', editingNewsId), {
          title: newsTitle,
          content: newsContent
        });
        setEditingNewsId(null);
      } else {
        await addDoc(collection(db, 'news'), {
          title: newsTitle,
          content: newsContent,
          author: user.displayName || user.email,
          createdAt: serverTimestamp()
        });
      }
      setNewsTitle('');
      setNewsContent('');
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!window.confirm("Are you sure you want to delete this news post?")) return;
    try {
      await deleteDoc(doc(db, 'news', newsId));
    } catch(err) {
      console.error(err);
    }
  };

  const handleEditNews = (news: any) => {
    setNewsTitle(news.title);
    setNewsContent(news.content);
    setEditingNewsId(news.id);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch(err) {
      console.error(err);
    }
  };

  const handleMakeAdmin = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        role: 'admin'
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleManualEntry = async () => {
    if (!entryName.trim() || !entryEmpId.trim() || !entryDept.trim() || !entryFaculty.trim()) return;
    try {
      await addDoc(collection(db, 'staff'), {
        name: entryName,
        employeeId: entryEmpId,
        faculty: entryFaculty,
        department: entryDept,
        phone: entryPhone,
        dob: entryDob,
        height: entryHeight,
        bloodGroup: entryBloodGroup,
        address: entryAddress,
        staffType: entryStaffType,
        photoUrl: entryPhoto,
        cvUrl: entryCv,
        email: isAdmin ? '' : (user?.email || ''),
        status: isAdmin ? 'Approved' : 'Submitted',
        createdAt: serverTimestamp(),
      });
      setEntryName('');
      setEntryEmpId('');
      setEntryFaculty('');
      setEntryDept('');
      setEntryPhone('');
      setEntryDob('');
      setEntryHeight('');
      setEntryBloodGroup('');
      setEntryAddress('');
      setEntryStaffType('Academic');
      setEntryPhoto('');
      setEntryCv('');
      alert("Details successfully submitted!");
    } catch(err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) { // skip header
        const line = lines[i].trim();
        if (!line) continue;
        const [name, empId, dept] = line.split(',');
        if (name && empId) {
          await addDoc(collection(db, 'staff'), {
             name: name.trim(),
             employeeId: empId.trim(),
             department: dept?.trim() || 'General',
             status: 'Approved',
             createdAt: serverTimestamp()
          });
        }
      }
      alert("CSV data uploaded successfully!");
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const departmentCounts = staffList.reduce((acc, curr) => {
    const dept = curr.department || 'Unspecified';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const facultyCounts = staffList.reduce((acc, curr) => {
    const fac = curr.faculty || 'Unspecified';
    acc[fac] = (acc[fac] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const facultyChartData = Object.keys(facultyCounts).map(fac => ({ name: fac, value: facultyCounts[fac] }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" style={{ backgroundColor: '#f8fafc' }}>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center bg-slate-50">
               <img src="/Absu.jpg" alt="ABSU Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ABSU&background=0D8ABC&color=fff'; }} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">ABSU STAFF DATABASE</h1>
            <p className="text-xs text-slate-500">
              {authMode === 'signin' ? 'Sign in to access the staff portal.' : 'Register for an account.'}
            </p>
          </div>
          
          {authError && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">{authError}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            {authMode === 'signup' && (
              <>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  required 
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors flex items-center justify-center gap-2 text-sm mt-2"
            >
              {authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          
          <div className="mt-4 text-center flex flex-col gap-2">
            <button 
              onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
              className="text-xs text-blue-600 hover:underline"
            >
              {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
            <button 
              onClick={() => setIsGuest(true)}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-slate-50" style={{ backgroundColor: '#f8fafc' }}>
      <audio ref={audioRef} src="https://www.chosic.com/wp-content/uploads/2020/07/Art-Of-Silence_V2.mp3" loop />
      
      {/* Sidebar */}
      <nav className="w-56 bg-slate-900 flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden shadow bg-white flex shrink-0">
               <img src="/Absu.jpg" alt="ABSU Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ABSU&background=0D8ABC&color=fff'; }} />
            </div>
            <span className="text-white font-bold text-xs tracking-wide leading-tight">ABSU STAFF<br/>DATABASE</span>
          </div>
        </div>
        <div className="flex-1 py-4">
          <div className="px-4 mb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Main Navigation</div>
          <button onClick={() => setActiveView('dashboard')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'dashboard' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => setActiveView('directory')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'directory' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <Users className="w-4 h-4" /> Staff Directory
          </button>
          <button onClick={() => setActiveView('entry')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'entry' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <UserPlus className="w-4 h-4" /> {isAdmin ? 'Add Staff' : 'My Details'}
          </button>
          <button 
            onClick={() => {
              setActiveView('news');
              if (audioRef.current && !isAudioMuted) {
                audioRef.current.volume = 0.3;
                audioRef.current.play().catch(e => {
                  console.log('Play blocked, mutating fallback:', e);
                  setIsAudioMuted(true);
                });
              }
            }} 
            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'news' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}
          >
            <Rss className="w-4 h-4" /> News Feed
          </button>
          <button onClick={() => setActiveView('messages')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'messages' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <MessageSquare className="w-4 h-4" /> Messages
            <span className="ml-auto bg-red-500 text-[10px] px-1.5 rounded-full text-white font-bold">4</span>
          </button>
          <div className="px-4 mt-6 mb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">System</div>
          <button onClick={() => setActiveView('settings')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${activeView === 'settings' ? 'text-blue-400 bg-slate-800/50 border-r-4 border-blue-500' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
        <div className="p-4 mt-auto border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
            if (user) {
              signOut(auth);
            } else {
              setIsGuest(false);
            }
          }}>
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{user?.displayName?.charAt(0) || 'G'}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium text-white truncate">{user?.displayName || (user ? 'User' : 'Guest')}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email || 'Not signed in'}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold text-slate-800">
            {activeView === 'dashboard' && 'Analytics Dashboard'}
            {activeView === 'directory' && 'Staff Directory'}
            {activeView === 'news' && 'News Feed'}
            {activeView === 'messages' && 'Messages & Chat'}
            {activeView === 'settings' && 'System Settings'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input type="text" placeholder="Search records..." className="pl-8 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-xs w-64 focus:ring-2 focus:ring-blue-500 outline-none" />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>
            {isAdmin && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded shadow-sm transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && (
          <div className="flex-1 p-6 space-y-6 overflow-auto">
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Staff (DB)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{staffList.length}</span>
                  <span className="text-emerald-500 text-xs font-bold">+Live</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[100%]"></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Approval</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{staffList.filter(s => s.status === 'Submitted' || s.status === 'Draft').length}</span>
                  <span className="text-amber-500 text-xs font-bold">Action Req.</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(staffList.filter(s => s.status !== 'Approved').length / Math.max(staffList.length, 1)) * 100}%`}}></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Departments</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{Object.keys(departmentCounts).length}</span>
                  <span className="text-slate-400 text-xs">Active units</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[100%]"></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Faculties</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{Object.keys(facultyCounts).length}</span>
                  <span className="text-blue-500 text-xs font-bold">Recorded</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[100%]"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Pie Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Staff per Faculty</h3>
                 </div>
                 <div className="flex-1 min-h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={facultyChartData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                       >
                         {facultyChartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         itemStyle={{ color: '#1e293b' }}
                       />
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </div>

            {/* Table */}
            <div className="col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Staff Registrations (Firebase)</h3>
                <button onClick={() => setActiveView('directory')} className="text-[10px] font-bold text-blue-600 hover:underline">View Full Directory</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                      <th className="px-5 py-3 whitespace-nowrap">ID Number</th>
                      <th className="px-5 py-3 whitespace-nowrap">Department</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 whitespace-nowrap">Date Added</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.length === 0 ? (
                       <tr><td colSpan={6} className="px-5 py-4 text-center text-xs text-slate-500">No live data yet. Staff registered through the mobile app will appear here.</td></tr>
                    ) : (
                      staffList.slice(0, 5).map((staff) => (
                      <tr key={staff.id} className="text-xs hover:bg-slate-50">
                        <td className="px-5 py-2.5 flex items-center gap-3">
                          <div className={`w-7 h-7 rounded ${staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold text-[10px]`}>
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="font-semibold text-slate-900 whitespace-nowrap">{staff.name}</div>
                        </td>
                        <td className="px-5 py-2.5 text-slate-500 font-mono whitespace-nowrap">{staff.employeeId}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">{staff.department}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            staff.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {staff.status}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                          {staff.createdAt?.toDate ? staff.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          {isAdmin && staff.role !== 'admin' && (
                            <button onClick={() => handleMakeAdmin(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 mr-2 border border-emerald-200 rounded text-[10px]">Make Admin</button>
                          )}
                          <button className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1">Review</button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'directory' && (
          <div className="flex-1 p-6 overflow-auto">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Full Staff Directory</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                        <th className="px-5 py-3 whitespace-nowrap">ID Number</th>
                        <th className="px-5 py-3 whitespace-nowrap">Department</th>
                        <th className="px-5 py-3 whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Date Added</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.length === 0 ? (
                         <tr><td colSpan={6} className="px-5 py-4 text-center text-xs text-slate-500">No live data yet. Staff registered through the mobile app will appear here.</td></tr>
                      ) : (
                        staffList.map((staff) => (
                        <tr key={staff.id} className="text-xs hover:bg-slate-50">
                          <td className="px-5 py-2.5 flex items-center gap-3">
                            <div className={`w-7 h-7 rounded ${staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold text-[10px]`}>
                              {staff.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="font-semibold text-slate-900 whitespace-nowrap">{staff.name}</div>
                          </td>
                          <td className="px-5 py-2.5 text-slate-500 font-mono whitespace-nowrap">{staff.employeeId}</td>
                          <td className="px-5 py-2.5 whitespace-nowrap">{staff.department}</td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                              staff.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {staff.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                            {staff.createdAt?.toDate ? staff.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            {isAdmin && staff.role !== 'admin' && (
                              <button onClick={() => handleMakeAdmin(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 mr-2 border border-emerald-200 rounded text-[10px]">Make Admin</button>
                            )}
                            <button className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1">Review</button>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {activeView === 'messages' && (
          <div className="flex-1 p-6 flex flex-col overflow-hidden h-full">
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex overflow-hidden min-h-[400px]">
                  <div className="w-1/3 border-r border-slate-200 bg-slate-50">
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700">Recent Chats</div>
                     <div className="p-3 border-b border-slate-100 flex items-center gap-3 cursor-pointer bg-white">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">HR</div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold truncate">HR Department</div>
                            <div className="text-[10px] text-slate-500 truncate">Please review the new policy.</div>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-white">
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700">Company Chat</div>
                     <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
                        {chatMessages.length === 0 && (
                          <div className="text-center text-slate-400 text-xs py-4">No messages yet. Start the conversation!</div>
                        )}
                        {chatMessages.map(msg => {
                          const isMe = msg.senderEmail === user?.email;
                          return (
                            <div key={msg.id} className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold">{msg.senderName}</span>
                                {isAdmin && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="text-[9px] text-red-500 hover:text-red-700">Delete</button>
                                )}
                              </div>
                              <div className={`px-3 py-2 rounded-lg text-xs text-slate-800 ${isMe ? 'bg-blue-100 text-blue-900' : 'bg-slate-100'}`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                     </div>
                     {user ? (
                       <div className="p-3 border-t border-slate-200 flex gap-2">
                           <input 
                             type="text" 
                             placeholder="Type a message..." 
                             className="flex-1 px-3 py-1.5 bg-slate-100 rounded-md text-xs border-none outline-none focus:ring-1 focus:ring-blue-500" 
                             value={newMessage}
                             onChange={(e) => setNewMessage(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                           />
                           <button onClick={handleSendMessage} className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50" disabled={!newMessage.trim()}>Send</button>
                       </div>
                     ) : (
                       <div className="p-3 border-t border-slate-200 text-center text-xs text-slate-500">
                         Please sign in to participate in the chat.
                       </div>
                     )}
                  </div>
              </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 p-6 overflow-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
                  <div className="p-5 border-b border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800">System Settings</h3>
                      <p className="text-xs text-slate-500">Manage your application preferences and configurations.</p>
                  </div>
                  <div className="p-5 space-y-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
                         <input type="text" value="Abia State University" disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 cursor-not-allowed outline-none" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email Notifications</label>
                         <div className="flex items-center gap-2 mt-2">
                             <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                             <span className="text-xs text-slate-600">Email me when a new staff member registers</span>
                         </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                         {settingsSaved && <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><Check className="w-4 h-4"/> Saved!</span>}
                         <button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition-colors">Save Changes</button>
                      </div>
                  </div>
              </div>
          </div>
        )}

        {activeView === 'entry' && (
          <div className="flex-1 p-6 overflow-auto">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6">{isAdmin ? 'Staff Management Entry' : 'Submit My Details'}</h2>
                
                {isAdmin ? (
                   <div className="space-y-8">
                      <div className="border-b border-slate-200 pb-8">
                         <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Manual Entry</h3>
                         <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                                 <input type="text" value={entryName} onChange={(e) => setEntryName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. John Doe" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                                 <input type="text" value={entryEmpId} onChange={(e) => setEntryEmpId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. EMP-2023-001" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Faculty</label>
                                 <input type="text" value={entryFaculty} onChange={(e) => setEntryFaculty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Science" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                                 <input type="text" value={entryDept} onChange={(e) => setEntryDept(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Operations" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                                 <input type="text" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. +234 800 000 0000" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                                 <input type="date" value={entryDob} onChange={(e) => setEntryDob(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
                                 <input type="text" value={entryHeight} onChange={(e) => setEntryHeight(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. 175" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                                 <select value={entryBloodGroup} onChange={(e) => setEntryBloodGroup(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none">
                                    <option value="">Select...</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Staff Type</label>
                                 <div className="flex items-center gap-4 py-2 text-xs">
                                    <label className="flex items-center gap-1"><input type="radio" name="staffTypeAdmin" value="Academic" checked={entryStaffType === 'Academic'} onChange={(e) => setEntryStaffType(e.target.value)} /> Academic</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="staffTypeAdmin" value="Non-Academic" checked={entryStaffType === 'Non-Academic'} onChange={(e) => setEntryStaffType(e.target.value)} /> Non-Academic</label>
                                 </div>
                              </div>
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                               <textarea value={entryAddress} onChange={(e) => setEntryAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20" placeholder="Full residential address" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Photograph</label>
                                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setEntryPhoto)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100" />
                               </div>
                               <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">CV (Optional)</label>
                                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setEntryCv)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100" />
                               </div>
                            </div>
                            <button onClick={handleManualEntry} disabled={!entryName.trim() || !entryEmpId.trim() || !entryDept.trim() || !entryFaculty.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50">Add Staff Member</button>
                         </div>
                      </div>
                      <div>
                         <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Upload className="w-4 h-4" /> Bulk Upload (CSV)</h3>
                         <p className="text-xs text-slate-500 mb-4">Upload a CSV file with columns: Name, Employee ID, Department (no headers).</p>
                         <input type="file" accept=".csv" onChange={handleCsvUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      </div>
                   </div>
                ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 mb-4">Please submit your details below. Your submission will be reviewed by an administrator.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                           <input type="text" value={user?.email || ''} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 cursor-not-allowed outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                           <input type="text" value={entryName} onChange={(e) => setEntryName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Jane Doe" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                           <input type="text" value={entryEmpId} onChange={(e) => setEntryEmpId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. EMP-2023-123" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Faculty</label>
                           <input type="text" value={entryFaculty} onChange={(e) => setEntryFaculty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Arts" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                           <input type="text" value={entryDept} onChange={(e) => setEntryDept(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Engineering" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                           <input type="text" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. +234 800 000 0000" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                           <input type="date" value={entryDob} onChange={(e) => setEntryDob(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
                           <input type="text" value={entryHeight} onChange={(e) => setEntryHeight(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. 175" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                           <select value={entryBloodGroup} onChange={(e) => setEntryBloodGroup(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none">
                              <option value="">Select...</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">Staff Type</label>
                           <div className="flex items-center gap-4 py-2 text-xs">
                              <label className="flex items-center gap-1"><input type="radio" name="staffTypeUser" value="Academic" checked={entryStaffType === 'Academic'} onChange={(e) => setEntryStaffType(e.target.value)} /> Academic</label>
                              <label className="flex items-center gap-1"><input type="radio" name="staffTypeUser" value="Non-Academic" checked={entryStaffType === 'Non-Academic'} onChange={(e) => setEntryStaffType(e.target.value)} /> Non-Academic</label>
                           </div>
                        </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                         <textarea value={entryAddress} onChange={(e) => setEntryAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20" placeholder="Full residential address" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Photograph</label>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setEntryPhoto)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100" />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">CV (Optional)</label>
                            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setEntryCv)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100" />
                         </div>
                      </div>

                      <button onClick={handleManualEntry} disabled={!entryName.trim() || !entryEmpId.trim() || !entryDept.trim() || !entryFaculty.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-700 disabled:opacity-50">Submit My Details</button>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeView === 'news' && (
          <div className="flex-1 p-0 overflow-auto relative">
              {/* Immersive background layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-800 to-black z-0 pointer-events-none">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
              </div>
              
              <div className="relative z-10 min-h-full p-8 md:p-12 max-w-5xl mx-auto flex flex-col">
                  
                  <div className="flex items-center justify-between mb-12">
                     <div>
                        <h2 className="text-4xl font-serif text-white mb-2 tracking-tight">University Announcements</h2>
                        <p className="text-indigo-200 text-sm font-light">Stay inspired. Stay informed.</p>
                     </div>
                     <button 
                        onClick={() => {
                          setIsAudioMuted(!isAudioMuted);
                          if (!isAudioMuted && audioRef.current) audioRef.current.pause();
                          if (isAudioMuted && audioRef.current) audioRef.current.play();
                        }}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all shadow-lg"
                        title={isAudioMuted ? "Unmute Ambient Audio" : "Mute Ambient Audio"}
                     >
                        {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                     </button>
                  </div>

                  {isAdmin && (
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 mb-12">
                      <h3 className="text-sm font-bold text-white mb-4 tracking-wide uppercase">Publish Excellence</h3>
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Headline" 
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-1 focus:ring-white/30 outline-none transition-all"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                        />
                        <textarea 
                          placeholder="Craft an inspiring message..." 
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-1 focus:ring-white/30 outline-none h-32 resize-none transition-all font-serif"
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <button 
                            onClick={handleAddNews}
                            disabled={!newsTitle.trim() || !newsContent.trim()}
                            className="bg-white text-slate-900 px-6 py-2.5 rounded-full text-xs font-bold hover:bg-indigo-50 disabled:opacity-50 shadow-lg shadow-white/10 transition-all tracking-wide"
                          >
                            {editingNewsId ? 'Update Globally' : 'Publish Globally'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {newsList.length === 0 ? (
                    <div className="text-center text-white/50 text-sm font-serif italic py-12">The canvas is clear. Waiting for a spark of inspiration.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {newsList.map(news => (
                        <div key={news.id} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all shadow-xl group">
                             <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                   <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-200 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/30">Dispatch</span>
                                   <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                                     {news.createdAt?.toDate ? news.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Just now'}
                                   </span>
                               </div>
                               {isAdmin && (
                                 <div className="flex gap-2">
                                   <button onClick={() => handleEditNews(news)} className="text-[10px] text-indigo-300 hover:text-white uppercase tracking-wider font-bold">Edit</button>
                                   <button onClick={() => handleDeleteNews(news.id)} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold">Delete</button>
                                 </div>
                               )}
                             </div>
                             <h3 className="text-xl font-serif text-white mb-3 leading-snug group-hover:text-indigo-200 transition-colors">{news.title}</h3>
                             <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-light">{news.content}</p>
                             <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                               <span className="text-[10px] text-white/40 uppercase tracking-widest">Authored by</span>
                               <span className="text-xs text-white/90 font-medium">{news.author}</span>
                             </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
          </div>
        )}
      </main>
    </div>
  );
}
