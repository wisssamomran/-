import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Listing } from '../types';
import {
  Building2,
  Users,
  FileText,
  UserPlus,
  CheckCircle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Phone,
  Briefcase
} from 'lucide-react';

interface OrgDashboardPageProps {
  onSelectListing: (listing: Listing) => void;
}

export const OrgDashboardPage: React.FC<OrgDashboardPageProps> = ({ onSelectListing }) => {
  const { currentUser, organizations, listings, addOrgMember, toggleOrgMemberStatus, assignListingToAgent, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'listings' | 'members' | 'profile'>('listings');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'agent' | 'assistant'>('agent');

  // Find user's organization (or default to org-1)
  const currentOrg = organizations.find(o => o.id === currentUser.orgId) || organizations[0];

  // Organization listings
  const orgListings = listings.filter(l => l.advertiser.orgId === currentOrg.id);

  // If user is org_agent, filter to only assigned listings as required by spec!
  const visibleListings = currentUser.role === 'org_agent'
    ? orgListings.filter(l => l.assignedAgentId === currentUser.id || l.advertiser.id === currentUser.id)
    : orgListings;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      showToast('يرجى إدخال اسم الموظف ورقم هاتفه', 'warning');
      return;
    }

    addOrgMember(currentOrg.id, newMemberName.trim(), newMemberPhone.trim(), newMemberRole);
    setShowInviteModal(false);
    setNewMemberName('');
    setNewMemberPhone('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Org Profile Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-[#16324F]/10">
            <img src={currentOrg.logoUrl} alt={currentOrg.name} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>منشأة عقارية معتمدة</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">سجل تجاري: {currentOrg.commercialRegNo}</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-[#16324F]">{currentOrg.name}</h1>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>📍 {currentOrg.governorate} - {currentOrg.address}</span>
              <span>•</span>
              <span className="font-mono">هاتف: {currentOrg.phone}</span>
              <span>•</span>
              <span>المدير المسؤول: {currentOrg.managerName}</span>
            </div>
          </div>
        </div>

        {currentUser.role === 'org_manager' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2.5 bg-[#16324F] hover:bg-[#12A889] text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>دعوة وإضافة موظف للمنشأة</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-slate-400 text-xs block mb-1">إجمالي إعلانات المنشأة</span>
          <span className="text-2xl font-black text-[#16324F]">{orgListings.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-slate-400 text-xs block mb-1">الإعلانات المنشورة والنشطة</span>
          <span className="text-2xl font-black text-emerald-600">
            {orgListings.filter(l => l.status === 'published').length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-slate-400 text-xs block mb-1">فريق العمل والوكلاء</span>
          <span className="text-2xl font-black text-indigo-600">{currentOrg.members.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-slate-400 text-xs block mb-1">إجمالي المشاهدات المحققة</span>
          <span className="text-2xl font-black text-blue-600">
            {orgListings.reduce((sum, l) => sum + l.viewsCount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'listings' ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          إعلانات المنشأة ({visibleListings.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'members' ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          أعضاء وفريق العمل ({currentOrg.members.length})
        </button>
      </div>

      {/* Tab: Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-3">
          {currentUser.role === 'org_agent' && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-900 font-medium">
              ℹ️ تنبيه الصلاحية: بصفتك موظف إعلانات، يُعرض لك فقط نطاق التفويض المخصص لك والإعلانات المسندة إلى اسمك.
            </div>
          )}

          {visibleListings.map(listing => (
            <div
              key={listing.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={(listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-[#12A889]">{listing.listingNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {listing.status === 'published' ? 'منشور' : listing.status}
                    </span>
                    {listing.assignedAgentName && (
                      <span className="text-slate-500 font-medium">مسند إلى: {listing.assignedAgentName}</span>
                    )}
                  </div>
                  <h4
                    onClick={() => onSelectListing(listing)}
                    className="font-bold text-sm text-[#16324F] hover:text-[#12A889] cursor-pointer mt-0.5 line-clamp-1"
                  >
                    {listing.title}
                  </h4>
                  <div className="text-xs text-slate-500">
                    {listing.location?.city || ''} {listing.location?.district ? `- ${listing.location.district}` : ''} • {(listing.price || 0).toLocaleString()} {listing.currency || 'YER'}
                  </div>
                </div>
              </div>

              {/* Assignment controls for org manager */}
              {currentUser.role === 'org_manager' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">إسناد لموظف:</span>
                  <select
                    value={listing.assignedAgentId || ''}
                    onChange={e => {
                      const member = currentOrg.members.find(m => m.userId === e.target.value);
                      if (member) {
                        assignListingToAgent(listing.id, member.userId, member.name);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="">غير مسند</option>
                    {currentOrg.members.map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} ({m.roleInOrg === 'manager' ? 'مدير' : 'وكيل'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {currentOrg.members.map(member => (
            <div
              key={member.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[#16324F]">
                  {member.name.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#16324F]">{member.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        member.roleInOrg === 'manager'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {member.roleInOrg === 'manager' ? 'مدير المنشأة' : 'وكيل عقاري'}
                    </span>
                    {!member.isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        معطل
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    هاتف: {member.phone} • الإعلانات المسندة: {member.assignedListingCount}
                  </div>
                </div>
              </div>

              {currentUser.role === 'org_manager' && member.roleInOrg !== 'manager' && (
                <button
                  onClick={() => toggleOrgMemberStatus(currentOrg.id, member.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    member.isActive
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {member.isActive ? 'تعطيل الحساب' : 'إعادة التفعيل'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="font-black text-base text-[#16324F]">إضافة موظف / وكيل جديد للمنشأة</h3>
            <p className="text-xs text-slate-500">
              سيتم إنشاء عضوية مستقلة للموظف وتمكينه من إدارة الإعلانات التي تسندها إليه فقط.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف الكامل:</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="محمد أحمد..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم هاتف الموظف:</label>
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={e => setNewMemberPhone(e.target.value)}
                  placeholder="770000000"
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-left font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الدور الوظيفي في المنشأة:</label>
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="agent">وكيل إعلانات ومبيعات</option>
                  <option value="assistant">مساعد إدخال بيانات</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#16324F] hover:bg-[#12A889] text-white font-bold rounded-xl shadow-xs"
                >
                  إضافة العضوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
