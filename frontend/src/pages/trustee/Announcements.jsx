import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiEdit2, FiBell, FiX, FiCheckCircle, FiClock, FiSend, FiFileText, FiBarChart2, FiUsers, FiMapPin, FiMessageCircle, FiMail, FiSmartphone, FiSearch, FiUser, FiEye } from 'react-icons/fi';
import api from "../../utils/api";
import { useTableFeatures } from '../../hooks/useTableFeatures';
import TablePagination from '../../components/TablePagination';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Announcements = () => {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'analytics'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { hasManage } = usePermissions('Announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [trustees, setTrustees] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [branchManagers, setBranchManagers] = useState([]);
  const [accountants, setAccountants] = useState([]);
  const [documentHandlers, setDocumentHandlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newlyAddedId, setNewAddedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all', 'mine', 'others'
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const { user } = useAuth();

  const filteredAnnouncements = announcements.filter(ann => {
    const creatorId = ann.createdBy?._id || ann.createdBy;
    const isMine = creatorId && String(creatorId) === String(user?._id);
    
    if (ownershipFilter === 'mine') return isMine;
    if (ownershipFilter === 'others') return !isMine;
    return true;
  });

  const {
    searchTerm, setSearchTerm, sortConfig, handleSort,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalPages, paginatedData, totalItems
  } = useTableFeatures(filteredAnnouncements, ['title', 'subject', 'message', 'status']);

  const availableRoles = [
    "Chairman", "Vice Chairman", "Secretary", "Treasurer", "Branch Manager", 
    "Document Handler", "Donation Manager", "Event Manager", "Annadan Manager", "Trust Member"
  ];

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    message: '',
    priority: 'Normal',
    audienceType: ['All Users'],
    targetBranches: [],
    targetRoles: [],
    targetUsers: [],
    status: 'Published',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    whatsappIntegration: false,
    smsIntegration: false,
    emailIntegration: false,
    dashboardNotification: true,
  });

  // New Audience State
  const [audienceSettings, setAudienceSettings] = useState({
    allAdmins: false,
    specificAdmins: [],
    allTrustees: false,
    specificTrustees: [],
    allBranchManagers: false,
    specificBranchManagers: [],
    allAccountants: false,
    specificAccountants: [],
    allDocHandlers: false,
    specificDocHandlers: [],
    allDevotees: false
  });

  // Search states for target audiences
  const [searchAdmins, setSearchAdmins] = useState('');
  const [searchTr, setSearchTr] = useState('');
  const [searchBm, setSearchBm] = useState('');
  const [searchAcc, setSearchAcc] = useState('');
  const [searchDh, setSearchDh] = useState('');

  useEffect(() => {
    fetchAnnouncements();
    fetchBranches();
    fetchAdmins();
    fetchTrustees();
    fetchBranchManagers();
    fetchAccountants();
    fetchDocHandlers();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error("Failed to fetch announcements.", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  
  const fetchAdmins = async () => {
    try {
      const res = await api.get('/trustees/admins-list');
      setAdmins(res.data.data || []);
    } catch (err) {}
  };
  
  const fetchTrustees = async () => {
    try {
      const res = await api.get('/trustees/public');
      setTrustees(res.data.trustees || res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch trustees", err);
    }
  };

  const fetchBranchManagers = async () => {
    try {
      const res = await api.get('/trustees/branch-managers');
      setBranchManagers(res.data.branchManagers || res.data.data || []);
    } catch (err) {}
  };

  const fetchAccountants = async () => {
    try {
      const res = await api.get('/trustees/accountants');
      setAccountants(res.data.accountants || res.data.data || []);
    } catch (err) {}
  };

  const fetchDocHandlers = async () => {
    try {
      const res = await api.get('/trustees/document-admin');
      setDocumentHandlers(res.data.data || []);
    } catch (err) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const payload = { ...formData };
      payload.audienceType = [];
      payload.targetRoles = [];
      payload.targetUsers = [
        ...audienceSettings.specificAdmins,
        ...audienceSettings.specificTrustees,
        ...audienceSettings.specificBranchManagers,
        ...audienceSettings.specificAccountants,
        ...audienceSettings.specificDocHandlers
      ];

      if (audienceSettings.allAdmins) payload.targetRoles.push('Admin');
      if (audienceSettings.allTrustees) payload.audienceType.push('All Trust Members');
      if (audienceSettings.allBranchManagers) payload.targetRoles.push('BranchManager');
      if (audienceSettings.allAccountants) payload.targetRoles.push('Accountant');
      if (audienceSettings.allDocHandlers) payload.targetRoles.push('DocumentAdmin');

      let res;
      if (editingId) {
        res = await api.put(`/announcements/${editingId}`, payload);
      } else {
        res = await api.post('/announcements', payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      await fetchAnnouncements();
      
      if(res.data && res.data.data && res.data.data._id) {
        setNewAddedId(res.data.data._id);
        setTimeout(() => setNewAddedId(null), 5000); 
      }
      
    } catch (err) {
      alert(`Failed to broadcast announcement.\n\nServer said: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', subject: '', message: '', priority: 'Normal', audienceType: [],
      targetBranches: [], targetRoles: [], targetUsers: [], status: 'Published',
      publishDate: new Date().toISOString().split('T')[0], expiryDate: '',
      whatsappIntegration: false, smsIntegration: false, emailIntegration: false, dashboardNotification: true,
    });
    setAudienceSettings({
      allAdmins: false, specificAdmins: [],
      allTrustees: false, specificTrustees: [],
      allBranchManagers: false, specificBranchManagers: [],
      allAccountants: false, specificAccountants: [],
      allDocHandlers: false, specificDocHandlers: [],
      allDevotees: false
    });
  };

  const handleEdit = (ann) => {
    setEditingId(ann._id);
    setFormData({
      title: ann.title || '',
      subject: ann.subject || '',
      message: ann.message || '',
      priority: ann.priority || 'Normal',
      audienceType: ann.audienceType || [],
      targetBranches: ann.targetBranches || [],
      targetRoles: ann.targetRoles || [],
      targetUsers: ann.targetUsers || [],
      status: ann.status || 'Published',
      publishDate: ann.publishDate ? new Date(ann.publishDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expiryDate: ann.expiryDate ? new Date(ann.expiryDate).toISOString().split('T')[0] : '',
      whatsappIntegration: ann.whatsappIntegration || false,
      smsIntegration: ann.smsIntegration || false,
      emailIntegration: ann.emailIntegration || false,
      dashboardNotification: ann.dashboardNotification ?? true,
    });
    
    // Reverse map settings
    const tUsers = ann.targetUsers || [];
    setAudienceSettings({
      allAdmins: ann.targetRoles?.includes('Admin') || false,
      allTrustees: ann.audienceType?.includes('All Trust Members') || false,
      allBranchManagers: ann.targetRoles?.includes('BranchManager') || false,
      allAccountants: ann.targetRoles?.includes('Accountant') || false,
      allDocHandlers: ann.targetRoles?.includes('DocumentAdmin') || false,
      specificAdmins: admins.filter(a => tUsers.includes(a._id)).map(a => a._id),
      specificTrustees: trustees.filter(t => tUsers.includes(t._id)).map(t => t._id),
      specificBranchManagers: branchManagers.filter(b => tUsers.includes(b._id)).map(b => b._id),
      specificAccountants: accountants.filter(a => tUsers.includes(a._id)).map(a => a._id),
      specificDocHandlers: documentHandlers.filter(d => tUsers.includes(d._id)).map(d => d._id),
    });
    
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm("Delete this announcement permanently?")) {
      try {
        await api.delete(`/announcements/${id}`);
        fetchAnnouncements();
      } catch (err) {
        console.error("Failed to delete.", err);
      }
    }
  };

  const handleAudienceToggle = (field, isSpecific = false, id = null) => {
    setAudienceSettings(prev => {
      if (!isSpecific) {
        // Toggling the "All" checkbox
        const isChecked = !prev[field];
        return {
          ...prev,
          [field]: isChecked,
          // Clear specific selection if "All" is selected
          ...(isChecked && field === 'allTrustees' ? { specificTrustees: [] } : {}),
          ...(isChecked && field === 'allBranchManagers' ? { specificBranchManagers: [] } : {}),
          ...(isChecked && field === 'allAccountants' ? { specificAccountants: [] } : {}),
          ...(isChecked && field === 'allDocHandlers' ? { specificDocHandlers: [] } : {})
        };
      } else {
        // Toggling specific individual checkbox
        const specificArray = prev[field];
        const isSelected = specificArray.includes(id);
        const newArray = isSelected ? specificArray.filter(i => i !== id) : [...specificArray, id];
        
        // Uncheck the "All" equivalent if we are checking an individual
        const uncheckAll = {
          ...(field === 'specificTrustees' ? { allTrustees: false } : {}),
          ...(field === 'specificBranchManagers' ? { allBranchManagers: false } : {}),
          ...(field === 'specificAccountants' ? { allAccountants: false } : {}),
          ...(field === 'specificDocHandlers' ? { allDocHandlers: false } : {})
        };
        
        return {
          ...prev,
          [field]: newArray,
          ...uncheckAll
        };
      }
    });
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-saffron-500 rounded-full border-t-transparent animate-spin"></div></div>;

  const totalReads = announcements.reduce((acc, ann) => acc + (ann.totalRead || 0), 0);

  return (
    <div className="w-full space-y-6 text-gray-800 pb-12 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg text-white">
              <FiSend />
            </div>
            Communications & Broadcasts
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Enterprise announcement engine with omnichannel distribution.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 shadow-sm transition-all"
            />
          </div>
          <button onClick={handleOpenNew} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all whitespace-nowrap">
            <FiPlus /> New Announcement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 gap-1 w-full md:w-auto">
          <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <FiFileText className="inline mr-2" /> All Broadcasts
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex-1 md:flex-none md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <FiBarChart2 className="inline mr-2" /> Delivery Analytics
          </button>
        </div>
        
        {activeTab === 'list' && (
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button onClick={() => setOwnershipFilter('all')} className={`px-4 py-2 text-xs font-bold transition-colors ${ownershipFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>All</button>
            <button onClick={() => setOwnershipFilter('mine')} className={`px-4 py-2 text-xs font-bold border-l border-gray-200 transition-colors ${ownershipFilter === 'mine' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>My Broadcasts</button>
            <button onClick={() => setOwnershipFilter('others')} className={`px-4 py-2 text-xs font-bold border-l border-gray-200 transition-colors ${ownershipFilter === 'others' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Others</button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        
        {/* LIST TAB */}
        {activeTab === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {paginatedData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <FiBell className="mx-auto text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No announcements found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {paginatedData.map((ann, index) => {
                  const isHighlighted = newlyAddedId ? ann._id === newlyAddedId : (index === 0 && new Date() - new Date(ann.createdAt) < 60000);
                  
                  // Same background for all to keep a standard clean UI, only left stripe shows priority
                  const priorityBg = 'bg-white border-slate-100';

                  const timeAgo = (date) => {
                    if (!date) return '';
                    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                    let interval = seconds / 31536000;
                    if (interval > 1) return Math.floor(interval) + "y ago";
                    interval = seconds / 2592000;
                    if (interval > 1) return Math.floor(interval) + "mo ago";
                    interval = seconds / 86400;
                    if (interval > 1) return Math.floor(interval) + "d ago";
                    interval = seconds / 3600;
                    if (interval > 1) return Math.floor(interval) + "h ago";
                    interval = seconds / 60;
                    if (interval > 1) return Math.floor(interval) + "m ago";
                    return Math.floor(seconds) + "s ago";
                  };

                  return (
                    <motion.div 
                      key={ann._id} 
                      initial={isHighlighted ? { scale: 0.95, opacity: 0 } : {}}
                      animate={isHighlighted ? { scale: 1, opacity: 1 } : {}}
                      transition={{ duration: 0.4 }}
                      className={`rounded-xl border ${isHighlighted ? 'border-saffron-300 shadow-saffron-100 bg-saffron-50/50 ring-2 ring-saffron-400' : 'bg-white border-slate-200'} p-5 flex flex-col shadow-sm hover:shadow-md transition-all relative group`}
                    >
                      {/* Author Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3 items-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200 shrink-0">
                            {ann.createdBy?.profilePhoto ? (
                               <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${ann.createdBy.profilePhoto}`} className="w-full h-full object-cover" />
                            ) : (
                               <img src="/logo.png" className="w-full h-full object-contain p-1.5" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">
                              {ann.createdBy?.name || 'System Admin'}
                              {ann.createdBy?.role && <span className="text-slate-500 font-normal ml-1">• {ann.createdBy.role}</span>}
                            </h4>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                               <span>{timeAgo(ann.publishDate || ann.createdAt)}</span>
                               •
                               <span className="flex items-center gap-1"><FiUsers size={10} /> {ann.audienceType}</span>
                               • 
                               <span className={`px-1.5 py-0 text-[9px] font-bold uppercase rounded ${ann.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : ann.priority === 'Important' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>{ann.priority}</span>
                               
                               {isHighlighted && <span className="px-1.5 py-0 text-[9px] font-black uppercase tracking-widest rounded bg-saffron-500 text-white shadow-sm animate-pulse ml-1">NEW</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(ann)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Edit"><FiEdit2 size={16} /></button>
                          <button onClick={() => handleDelete(ann._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Delete"><FiTrash2 size={16} /></button>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="pl-1 md:pl-[60px] mb-2">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{ann.title}</h3>
                        {ann.subject && <p className="text-sm text-slate-600 font-semibold mb-2">{ann.subject}</p>}
                        
                        <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed mt-2">
                          {ann.message}
                        </div>
                      </div>

                      {/* Footer Stats & Tags */}
                      <div className="mt-3 pt-3 pl-1 md:pl-[60px] border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <FiEye /> {ann.totalRead || 0} views
                          </div>
                          <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border flex items-center gap-1 ${
                            ann.status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            ann.status === 'Scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {ann.status === 'Published' ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                            {ann.status}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <div className="flex gap-1.5">
                              {ann.dashboardNotification && <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="Dashboard"><FiBell /></div>}
                              {ann.emailIntegration && <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Email"><FiMail /></div>}
                              {ann.smsIntegration && <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-500 transition-colors" title="SMS"><FiSmartphone /></div>}
                           </div>
                           
                           {(ann.targetBranches?.length > 0 || ann.targetRoles?.length > 0 || ann.targetUsers?.length > 0) && (
                              <div className="flex gap-1.5 border-l border-slate-200 pl-3">
                                {ann.targetBranches?.length > 0 && <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{ann.targetBranches.length} Branches</span>}
                                {ann.targetRoles?.length > 0 && <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{ann.targetRoles.length} Roles</span>}
                                {ann.targetUsers?.length > 0 && <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{ann.targetUsers.length} Users</span>}
                              </div>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
            
            {paginatedData.length > 0 && (
              <div className="mt-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <TablePagination 
                  currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
                  totalItems={totalItems} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500 text-3xl">
              <FiBarChart2 />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delivery Analytics</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto">Track Dashboard Read Status, Email settings across your enterprise notifications.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sent</p>
                <p className="text-4xl font-black text-slate-900">{announcements.length}</p>
              </div>
              
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-1">Email Enabled</p>
                <p className="text-4xl font-black text-blue-700">{announcements.filter(a => a.emailIntegration).length}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{editingId ? 'Edit Broadcast' : 'Compose New Broadcast'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{editingId ? 'Update the details below.' : 'Fill out the details below to distribute your message.'}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                  <FiX className="text-xl" />
                </button>
              </div>
              
              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="announcementForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Content & Settings */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Announcement Title *</label>
                        <input required type="text" value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g., Upcoming Temple Renovation" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Subject (Optional)</label>
                        <input type="text" value={formData.subject} onChange={(e)=>setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Short description for notifications..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Message Content *</label>
                        <textarea required rows="8" value={formData.message} onChange={(e)=>setFormData({...formData, message: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none" placeholder="Write your full announcement here..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Priority & Status */}
                      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-slate-900 flex items-center gap-2"><FiClock className="text-indigo-500"/> Publishing</h4>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Status</label>
                          <select value={formData.status} onChange={(e)=>setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500">
                            <option value="Draft">Draft</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Published">Published (Immediate)</option>
                          </select>
                        </div>

                        {formData.status === 'Scheduled' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Publish Date</label>
                            <input type="date" value={formData.publishDate} onChange={(e)=>setFormData({...formData, publishDate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500" />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Priority</label>
                          <select value={formData.priority} onChange={(e)=>setFormData({...formData, priority: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500">
                            <option value="Normal">Normal</option>
                            <option value="Important">Important</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Multichannel Distribution */}
                      <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-slate-900 flex items-center gap-2"><FiMessageCircle className="text-emerald-500"/> Channels</h4>
                        
                        <div className="space-y-2">
                          <label className="flex items-center justify-between cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-700"><FiBell className="text-blue-500"/> Dashboard Push</span>
                            <input type="checkbox" checked={formData.dashboardNotification} onChange={(e)=>setFormData({...formData, dashboardNotification: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                          </label>
                          
                          <label className="flex items-center justify-between cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-700"><FiMail className="text-indigo-500"/> Email</span>
                            <input type="checkbox" checked={formData.emailIntegration} onChange={(e)=>setFormData({...formData, emailIntegration: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Settings */}
                  <div className="space-y-6">
                    {/* Audience Selection Redesigned */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100 h-full">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2"><FiUsers className="text-saffron-500"/> Audience Targeting</h4>
                      <p className="text-xs text-slate-500">Target specific roles. You can select an entire group or specific members within that group.</p>
                      
                      <div className="space-y-3">
                        
                        {/* Admins */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={audienceSettings.allAdmins} onChange={() => handleAudienceToggle('allAdmins')} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                              <span className="text-slate-800 font-bold">All Admins</span>
                            </label>
                            <div className="relative">
                              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input type="text" placeholder="Search specific admin..." value={searchAdmins} onChange={e => setSearchAdmins(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 w-full md:w-48" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-1 bg-white">
                            {admins.filter(a => (a.name || a.email || '').toLowerCase().includes(searchAdmins.toLowerCase())).map(a => (
                              <label key={a._id} className={`flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-50 p-1.5 rounded ${audienceSettings.specificAdmins.includes(a._id) ? 'bg-indigo-50/50' : ''}`}>
                                <input type="checkbox" checked={audienceSettings.specificAdmins.includes(a._id)} onChange={() => handleAudienceToggle('specificAdmins', true, a._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                <span className="text-slate-700 truncate">{a.name || a.email} <span className="text-slate-400">({a.role || 'Admin'})</span></span>
                              </label>
                            ))}
                            {admins.length === 0 && <span className="text-xs text-slate-400 p-2">No admins found.</span>}
                          </div>
                        </div>

                        {/* Trustees */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={audienceSettings.allTrustees} onChange={() => handleAudienceToggle('allTrustees')} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                              <span className="text-slate-800 font-bold">All Trustees</span>
                            </label>
                            <div className="relative">
                              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input type="text" placeholder="Search specific trustee..." value={searchTr} onChange={e => setSearchTr(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 w-full md:w-48" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-1 bg-white">
                            {trustees.filter(t => t._id !== user?._id && (t.name || t.email || '').toLowerCase().includes(searchTr.toLowerCase())).map(t => (
                              <label key={t._id} className={`flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-50 p-1.5 rounded ${audienceSettings.specificTrustees.includes(t._id) ? 'bg-indigo-50/50' : ''}`}>
                                <input type="checkbox" checked={audienceSettings.specificTrustees.includes(t._id)} onChange={() => handleAudienceToggle('specificTrustees', true, t._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                <span className="text-slate-700 truncate">{t.name || t.email} <span className="text-slate-400">({t.systemRole || 'Trustee'})</span></span>
                              </label>
                            ))}
                            {trustees.length === 0 && <span className="text-xs text-slate-400 p-2">No trustees found.</span>}
                          </div>
                        </div>

                        {/* Branch Managers */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={audienceSettings.allBranchManagers} onChange={() => handleAudienceToggle('allBranchManagers')} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                              <span className="text-slate-800 font-bold">All Branch Managers</span>
                            </label>
                            <div className="relative">
                              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input type="text" placeholder="Search specific manager..." value={searchBm} onChange={e => setSearchBm(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 w-full md:w-48" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-1 bg-white">
                            {branchManagers.filter(b => (b.name || b.email || '').toLowerCase().includes(searchBm.toLowerCase())).map(b => (
                              <label key={b._id} className={`flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-50 p-1.5 rounded ${audienceSettings.specificBranchManagers.includes(b._id) ? 'bg-indigo-50/50' : ''}`}>
                                <input type="checkbox" checked={audienceSettings.specificBranchManagers.includes(b._id)} onChange={() => handleAudienceToggle('specificBranchManagers', true, b._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                <span className="text-slate-700 truncate">{b.name || b.email}</span>
                              </label>
                            ))}
                            {branchManagers.length === 0 && <span className="text-xs text-slate-400 p-2">No branch managers found.</span>}
                          </div>
                        </div>

                        {/* Accountants */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={audienceSettings.allAccountants} onChange={() => handleAudienceToggle('allAccountants')} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                              <span className="text-slate-800 font-bold">All Accountants</span>
                            </label>
                            <div className="relative">
                              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input type="text" placeholder="Search specific accountant..." value={searchAcc} onChange={e => setSearchAcc(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 w-full md:w-48" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-1 bg-white">
                            {accountants.filter(a => (a.fullName || a.name || a.email || '').toLowerCase().includes(searchAcc.toLowerCase())).map(a => (
                              <label key={a._id} className={`flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-50 p-1.5 rounded ${audienceSettings.specificAccountants.includes(a._id) ? 'bg-indigo-50/50' : ''}`}>
                                <input type="checkbox" checked={audienceSettings.specificAccountants.includes(a._id)} onChange={() => handleAudienceToggle('specificAccountants', true, a._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                <span className="text-slate-700 truncate">{a.fullName || a.name || a.email} <span className="text-slate-400">({a.role || 'Accountant'})</span></span>
                              </label>
                            ))}
                            {accountants.length === 0 && <span className="text-xs text-slate-400 p-2">No accountants found.</span>}
                          </div>
                        </div>

                        {/* Document Handlers */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={audienceSettings.allDocHandlers} onChange={() => handleAudienceToggle('allDocHandlers')} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                              <span className="text-slate-800 font-bold">All Document Handlers</span>
                            </label>
                            <div className="relative">
                              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                              <input type="text" placeholder="Search specific handler..." value={searchDh} onChange={e => setSearchDh(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 w-full md:w-48" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-1 bg-white">
                            {documentHandlers.filter(d => (d.email || '').toLowerCase().includes(searchDh.toLowerCase())).map(d => (
                              <label key={d._id} className={`flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-50 p-1.5 rounded ${audienceSettings.specificDocHandlers.includes(d._id) ? 'bg-indigo-50/50' : ''}`}>
                                <input type="checkbox" checked={audienceSettings.specificDocHandlers.includes(d._id)} onChange={() => handleAudienceToggle('specificDocHandlers', true, d._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                <span className="text-slate-700 truncate">{d.email} <span className="text-slate-400">({d.role === 'document_admin' ? 'Document Handler' : (d.role || 'Document Handler')})</span></span>
                              </label>
                            ))}
                            {documentHandlers.length === 0 && <span className="text-xs text-slate-400 p-2">No document handlers found.</span>}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 font-bold transition-colors">Cancel</button>
                <button form="announcementForm" disabled={submitting || !formData.title || !formData.message} type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50">
                  {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><FiSend /> {editingId ? 'Update Broadcast' : 'Dispatch Broadcast'}</>}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default Announcements;
