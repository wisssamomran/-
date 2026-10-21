import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Search,
  Plus,
  Heart,
  HelpCircle,
  User,
  Building,
  FileCheck,
  ShieldCheck,
  Settings,
  Grid,
  Flag,
  Headphones,
  BookOpen,
  CalendarCheck
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isProminent?: boolean;
}

interface BottomNavBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth
}) => {
  const {
    currentUser,
    favorites,
    listings,
    reports,
    tickets,
    requests,
    bookings,
    verificationRequests
  } = useApp();

  const isVisitor = currentUser.role === 'visitor';

  // Dynamic Badges
  const pendingModerationCount = listings.filter(l => l.status === 'under_review').length;
  const pendingVerificationCount = verificationRequests.filter(v => v.status === 'under_review').length;
  const newReportsCount = reports.filter(r => r.status === 'new').length;
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const myActionableAdsCount = listings.filter(
    l => l.advertiser.id === currentUser.id && (l.status === 'needs_changes' || l.status === 'under_review')
  ).length;

  const seekerActiveBookingsCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'active').length;
  const incomingRequestsCount = requests.filter(r => r.status === 'pending' && (
    currentUser.role === 'system_admin' || r.advertiserId === currentUser.id
  )).length;

  // Strict 1:1 Implementation of the 10 User Roles Bottom Bar Matrix
  const getTabs = (): TabItem[] => {
    switch (currentUser.role) {
      // 1. الزائر غير المسجل (4 تبويبات - محجوب عنه أضف إعلان والمفضلة)
      case 'visitor':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'المساعدة', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'تسجيل الدخول', icon: <User className="w-5 h-5" /> }
        ];

      // 2. المستخدم المسجل والباحث عن عقار (5 تبويبات - حجوزاتي ومفضلة وحسابي)
      case 'seeker':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'bookings', label: 'حجوزاتي', icon: <CalendarCheck className="w-5 h-5" />, badge: seekerActiveBookingsCount },
          { id: 'favorites', label: 'المفضلة', icon: <Heart className="w-5 h-5" />, badge: favorites.length },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 3. المعلن الفرد الموثق (5 تبويبات مع الحجوزات وزر أضف إعلان مركزي بارز)
      case 'advertiser':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'my_ads', label: 'إعلاناتي', icon: <Grid className="w-5 h-5" />, badge: myActionableAdsCount },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'bookings', label: 'الحجوزات', icon: <CalendarCheck className="w-5 h-5" />, badge: incomingRequestsCount },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 4. مدير المنشأة العقارية (5 تبويبات: إدارة المنشأة، أضف إعلان مركزي، إعلانات المنشأة)
      case 'org_manager':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'organization', label: 'المنشأة', icon: <Building className="w-5 h-5" /> },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'my_ads', label: 'إعلاناتي', icon: <Grid className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 5. وكيل المنشأة العقارية (5 تبويبات: إعلاناته المسندة، إضافة إعلان مفوض، البحث)
      case 'org_agent':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'my_ads', label: 'إعلاناتي', icon: <Grid className="w-5 h-5" /> },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 6. مراجع المحتوى (5 تبويبات: طابور المراجعة، البحث، سياسات النشر)
      case 'moderator':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'moderation', label: 'مراجعة الإعلانات', icon: <FileCheck className="w-5 h-5" />, badge: pendingModerationCount },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'سياسات النشر', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 7. مسؤول التحقق والمطابقة (5 تبويبات: لوحة التحقق، البحث، المعايير)
      case 'verifier':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'verification', label: 'لوحة التحقق', icon: <ShieldCheck className="w-5 h-5" />, badge: pendingVerificationCount },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'المعايير', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 8. مسؤول البلاغات والقضايا (5 تبويبات: لوحة البلاغات، البحث، السياسات)
      case 'reporter_admin':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'reports', label: 'لوحة البلاغات', icon: <Flag className="w-5 h-5" />, badge: newReportsCount },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'السياسات', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 9. ممثل الدعم الفني (5 تبويبات: تذاكر الدعم، البحث، الأسئلة الشائعة)
      case 'support':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'support', label: 'تذاكر الدعم', icon: <Headphones className="w-5 h-5" />, badge: openTicketsCount },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'الأسئلة الشائعة', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 10. مدير النظام العام (5 تبويبات: لوحة الإدارة، الرقابة، البلاغات)
      case 'system_admin':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'admin', label: 'لوحة الإدارة', icon: <Settings className="w-5 h-5" /> },
          { id: 'moderation', label: 'المراجعة', icon: <FileCheck className="w-5 h-5" />, badge: pendingModerationCount },
          { id: 'reports', label: 'البلاغات', icon: <Flag className="w-5 h-5" />, badge: newReportsCount },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      default:
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'help', label: 'المساعدة', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'تسجيل الدخول', icon: <User className="w-5 h-5" /> }
        ];
    }
  };

  const tabs = getTabs();

  const handleTabClick = (tabId: string) => {
    onNavigate(tabId);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 py-1 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = currentView === tab.id;

          // Prominent Center "Add Listing" Button for permitted roles
          if (tab.isProminent) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="relative -mt-6 flex flex-col items-center group cursor-pointer focus:outline-hidden"
                title="إضافة إعلان جديد"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#12A889] to-emerald-400 text-white flex items-center justify-center shadow-lg border-3 border-white group-hover:scale-105 group-active:scale-95 transition-all">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] mt-1 font-black text-[#16324F] leading-tight">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#12A889] font-black'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] mt-1 leading-tight tracking-tight whitespace-nowrap ${
                  isActive ? 'font-black text-[#12A889]' : ''
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#12A889] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
