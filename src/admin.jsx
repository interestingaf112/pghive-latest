import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  fetchAllPGs, 
  createPGListing, 
  updatePGListing, 
  deletePGListing, 
  getAdminPGContactDetails, 
  subscribeToAuth, 
  logoutAdminSession,
  isFirebaseActive 
} from './firebase';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

function AdminApp() {
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pg_hub_theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pg_hub_theme', theme);
  }, [theme]);

  // Admin User state initialized from localStorage
  const [adminUser, setAdminUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_session_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Error loading admin session:", e);
        }
      }
    }
    return null;
  });

  // Sync Admin User state to localStorage
  useEffect(() => {
    if (adminUser) {
      localStorage.setItem('admin_session_user', JSON.stringify(adminUser));
    } else {
      localStorage.removeItem('admin_session_user');
    }
  }, [adminUser]);

  // Load active listings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAllPGs();
        setPgs(data);
      } catch (err) {
        console.error("Error loading admin listings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Subscribe to auth state updates
    const adminEmail = (import.meta.env?.VITE_ADMIN_USER || '').trim().toLowerCase();
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        const userEmail = (user.email || '').trim().toLowerCase();
        const isEmailAdmin = userEmail && adminEmail && userEmail === adminEmail;
        const isUidAdmin = user.uid === 'local-admin';

        if (isEmailAdmin || isUidAdmin) {
          setAdminUser(user);
        }
      } else {
        setAdminUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Database handlers
  const handleAddPG = async (pgData, imageFiles) => {
    const newListing = await createPGListing(pgData, imageFiles);
    const data = await fetchAllPGs();
    setPgs(data);
    return newListing;
  };

  const handleUpdatePG = async (pgId, pgData, imageFilesOrUrls) => {
    const updatedListing = await updatePGListing(pgId, pgData, imageFilesOrUrls);
    const data = await fetchAllPGs();
    setPgs(data);
    return updatedListing;
  };

  const handleDeletePG = async (pgId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this PG listing?");
    if (!confirmDelete) return;

    try {
      await deletePGListing(pgId);
      const data = await fetchAllPGs();
      setPgs(data);
    } catch (err) {
      alert("Error deleting listing: " + err.message);
    }
  };

  const handleLogout = async () => {
    await logoutAdminSession();
    setAdminUser(null);
    localStorage.removeItem('admin_session_user');
    // Redirect back to homepage on logout
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ border: '4px solid rgba(0,0,0,0.1)', borderTop: '4px solid var(--colors-primary, #1a73e8)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--colors-muted, #5f6368)' }}>Loading Host Portal...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--colors-canvas)' }}>
      {/* Header bar for separate Admin dashboard */}
      <header style={{ borderBottom: '1px solid var(--colors-hairline)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--colors-surface-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo-cropped.png" alt="PGhive Logo" style={{ height: '32px' }} />
          <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--colors-ink)' }}>Host Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {adminUser && (
            <>
              <span style={{ fontSize: '13px', color: 'var(--colors-muted)' }}>Logged in as <strong>{adminUser.email || adminUser.username}</strong></span>
              <button 
                onClick={handleLogout} 
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: '1px solid var(--colors-hairline)',
                  backgroundColor: 'var(--colors-surface-soft)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Sign Out
              </button>
            </>
          )}
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: 'var(--colors-primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Visit Marketplace
          </button>
        </div>
      </header>
      
      <main style={{ flexGrow: 1, padding: '24px 0' }}>
        <AdminDashboard 
          adminUser={adminUser}
          onLoginSuccess={(user) => {
            setAdminUser(user);
            localStorage.setItem('admin_session_user', JSON.stringify(user));
          }}
          pgs={pgs}
          onAddPG={handleAddPG}
          onUpdatePG={handleUpdatePG}
          getAdminPGContactDetails={getAdminPGContactDetails}
          onDeletePG={handleDeletePG}
          isFirebaseActive={isFirebaseActive}
        />
      </main>
    </div>
  );
}

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  createRoot(rootElement).render(<AdminApp />);
}
