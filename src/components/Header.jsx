import { Coins, User, LogIn, LayoutGrid, LogOut, Info } from 'lucide-react';
import VisionNav from './VisionNav';

export default function Header({ 
  isAdminMode, 
  setIsAdminMode, 
  onLogout, 
  userCredits, 
  onOpenPurchaseModal,
  theme,
  currentUser,
  onOpenAuthModal,
  onOpenAccountCentre
}) {

  const handleLogoClick = () => {
    // Disabled the 5-click backdoor shortcut to prevent normal users from discovering the admin panel.
    if (isAdminMode) {
      setIsAdminMode(false);
    }
  };

  const navItems = isAdminMode ? [
    { icon: <LayoutGrid size={14} />, label: 'catalog view', onClick: () => setIsAdminMode(false) },
    { icon: <LogOut size={14} />,     label: 'logout',       onClick: onLogout }
  ] : [
    {
      icon: <Info size={14} />,
      label: 'about us',
      onClick: () => {
        const aboutEl = document.getElementById('about-section');
        if (aboutEl) {
          aboutEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    {
      icon: <Coins size={14} />,
      label: `${userCredits} credits`,
      onClick: onOpenPurchaseModal
    },
    {
      icon: currentUser ? <User size={14} /> : <LogIn size={14} />,
      label: currentUser ? 'account' : 'sign in',
      onClick: currentUser ? onOpenAccountCentre : onOpenAuthModal
    }
  ];

  return (
    <VisionNav
      logoText={isAdminMode ? 'admin: pg.wala' : 'pg.wala'}
      onLogoClick={handleLogoClick}
      items={navItems}
      theme={theme}
    />
  );
}
