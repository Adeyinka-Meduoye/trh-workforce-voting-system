import React, { useState, useEffect } from 'react';
import {
  LegacyWinnerRecord,
  Organisation,
  Department,
  VotingScopeType
} from '../../types';
import {
  getLegacyWinners,
  createLegacyWinner,
  updateLegacyWinner,
  deleteLegacyWinner,
  getOrganisations,
  getDepartments
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Trophy,
  Plus,
  Search,
  Calendar,
  Building2,
  Layers,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Crown,
  Filter,
  User,
  Users,
  Quote,
  Globe
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

interface LegacyHallOfFameManagerProps {
  onNavigateToPublicHallOfFame?: () => void;
}

export const LegacyHallOfFameManager: React.FC<LegacyHallOfFameManagerProps> = ({
  onNavigateToPublicHallOfFame
}) => {
  const { userProfile, adminUser, isSuperAdmin } = useAuth();
  const { notifyAction, confirmAction } = useActionModal();

  const [records, setRecords] = useState<LegacyWinnerRecord[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LegacyWinnerRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    photoUrl: '',
    organisationId: '',
    organisationName: '',
    departmentId: '',
    departmentName: '',
    isJointWinner: false,
    secondaryDepartmentId: '',
    secondaryDepartmentName: '',
    jointWinnerName: '',
    jointWinnerRole: '',
    jointWinnerPhotoUrl: '',
    month: 'January',
    year: new Date().getFullYear(),
    scopeType: 'department' as VotingScopeType,
    unitId: '',
    unitName: '',
    awardCategory: 'departmental' as string,
    awardScope: 'Departmental',
    awardTitle: 'Worker of the Month',
    roleOrTitle: '',
    citation: '',
    votesCount: ''
  });

  const loadAll = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const [legacyList, orgList, deptList] = await Promise.all([
        getLegacyWinners(forceRefresh),
        getOrganisations(false, forceRefresh),
        getDepartments(undefined, false, forceRefresh)
      ]);
      setRecords(legacyList);
      setOrganisations(orgList);
      setDepartments(deptList);
    } catch (e) {
      console.error('Error loading legacy winners data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.key || detail.key.includes('legacy') || detail.key.includes('winner')) {
        loadAll(false);
      }
    };

    window.addEventListener('trh_cache_sync', handleSync);
    return () => {
      window.removeEventListener('trh_cache_sync', handleSync);
    };
  }, []);

  const openAddModal = () => {
    setEditingRecord(null);
    const defaultOrg = organisations.length > 0 ? organisations[0] : null;
    const defaultDepts = defaultOrg ? departments.filter((d) => d.organisationId === defaultOrg.id) : [];
    const defaultDept = defaultDepts.length > 0 ? defaultDepts[0] : null;

    setFormData({
      name: '',
      photoUrl: '',
      organisationId: defaultOrg?.id || '',
      organisationName: defaultOrg?.name || 'The Reinvention House',
      departmentId: defaultDept?.id || '',
      departmentName: defaultDept?.name || '',
      isJointWinner: false,
      secondaryDepartmentId: '',
      secondaryDepartmentName: '',
      jointWinnerName: '',
      jointWinnerRole: '',
      jointWinnerPhotoUrl: '',
      month: MONTH_NAMES[new Date().getMonth()],
      year: new Date().getFullYear(),
      scopeType: 'department',
      unitId: '',
      unitName: '',
      awardCategory: 'departmental',
      awardScope: 'Departmental',
      awardTitle: 'Worker of the Month',
      roleOrTitle: '',
      citation: '',
      votesCount: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec: LegacyWinnerRecord) => {
    setEditingRecord(rec);
    const inferredScope: VotingScopeType =
      rec.scopeType ||
      (rec.awardScope?.toLowerCase().includes('church') || rec.awardCategory === 'innovative'
        ? 'church'
        : rec.awardScope?.toLowerCase().includes('organisation') || rec.awardScope?.toLowerCase().includes('organization') || rec.awardCategory === 'organisation'
        ? 'organisation'
        : rec.awardScope?.toLowerCase().includes('workforce') || rec.awardCategory === 'workforce_wide'
        ? 'workforce'
        : rec.unitName || rec.unitId || rec.awardScope?.toLowerCase().includes('unit') || rec.awardCategory === 'unit'
        ? 'unit'
        : 'department');

    setFormData({
      name: rec.name,
      photoUrl: rec.photoUrl || '',
      organisationId: rec.organisationId || '',
      organisationName: rec.organisationName || '',
      departmentId: rec.departmentId || '',
      departmentName: rec.departmentName || '',
      isJointWinner: Boolean(rec.isJointWinner || rec.secondaryDepartmentId || rec.jointWinnerName),
      secondaryDepartmentId: rec.secondaryDepartmentId || '',
      secondaryDepartmentName: rec.secondaryDepartmentName || '',
      jointWinnerName: rec.jointWinnerName || '',
      jointWinnerRole: rec.jointWinnerRole || '',
      jointWinnerPhotoUrl: rec.jointWinnerPhotoUrl || '',
      month: rec.month || 'January',
      year: rec.year || new Date().getFullYear(),
      scopeType: inferredScope,
      unitId: rec.unitId || '',
      unitName: rec.unitName || '',
      awardCategory:
        rec.awardCategory ||
        (inferredScope === 'church'
          ? 'innovative'
          : inferredScope === 'workforce'
          ? 'workforce_wide'
          : inferredScope === 'organisation'
          ? 'organisation'
          : inferredScope === 'unit'
          ? 'unit'
          : 'departmental'),
      awardScope:
        rec.awardScope ||
        (inferredScope === 'church'
          ? 'Church-wide'
          : inferredScope === 'workforce'
          ? 'Workforce-wide'
          : inferredScope === 'organisation'
          ? 'Organisation-wide'
          : inferredScope === 'unit'
          ? 'Unit'
          : 'Departmental'),
      awardTitle:
        rec.awardTitle ||
        (inferredScope === 'church'
          ? 'Innovative Worker of the Month'
          : inferredScope === 'workforce'
          ? 'Worker of the Month (All Departments)'
          : 'Worker of the Month'),
      roleOrTitle: rec.roleOrTitle || '',
      citation: rec.citation || '',
      votesCount: rec.votesCount !== undefined ? String(rec.votesCount) : ''
    });
    setIsModalOpen(true);
  };

  const handleOrgChange = (orgId: string) => {
    const org = organisations.find((o) => o.id === orgId);
    const orgDepts = departments.filter((d) => d.organisationId === orgId);
    setFormData((prev) => ({
      ...prev,
      organisationId: orgId,
      organisationName: org ? org.name : prev.organisationName,
      departmentId: orgDepts.length > 0 ? orgDepts[0].id : '',
      departmentName: orgDepts.length > 0 ? orgDepts[0].name : '',
      secondaryDepartmentId: '',
      secondaryDepartmentName: ''
    }));
  };

  const handleDeptChange = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    setFormData((prev) => ({
      ...prev,
      departmentId: deptId,
      departmentName: dept ? dept.name : prev.departmentName
    }));
  };

  const handleSecondaryDeptChange = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    setFormData((prev) => ({
      ...prev,
      secondaryDepartmentId: deptId,
      secondaryDepartmentName: dept ? dept.name : prev.secondaryDepartmentName
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notifyAction('Validation Error', 'Winner full name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Administrator',
        email: userProfile?.email
      };

      const deptNames: string[] = [];
      if (formData.departmentName.trim()) deptNames.push(formData.departmentName.trim());
      if (
        formData.isJointWinner &&
        formData.secondaryDepartmentName.trim() &&
        formData.secondaryDepartmentName.trim() !== formData.departmentName.trim()
      ) {
        deptNames.push(formData.secondaryDepartmentName.trim());
      }

      const deptIds: string[] = [];
      if (formData.departmentId) deptIds.push(formData.departmentId);
      if (
        formData.isJointWinner &&
        formData.secondaryDepartmentId &&
        formData.secondaryDepartmentId !== formData.departmentId
      ) {
        deptIds.push(formData.secondaryDepartmentId);
      }

      const payload = {
        name: formData.name.trim(),
        photoUrl: formData.photoUrl.trim() || undefined,
        organisationId: formData.organisationId || undefined,
        organisationName: formData.organisationName.trim() || 'The Reinvention House',
        departmentId: formData.departmentId || undefined,
        departmentName: formData.departmentName.trim() || undefined,
        secondaryDepartmentId: formData.isJointWinner ? (formData.secondaryDepartmentId || undefined) : undefined,
        secondaryDepartmentName: formData.isJointWinner ? (formData.secondaryDepartmentName.trim() || undefined) : undefined,
        departmentIds: deptIds.length > 0 ? deptIds : undefined,
        departmentNames: deptNames.length > 0 ? deptNames : undefined,
        scopeType: formData.scopeType,
        unitId: formData.unitId || undefined,
        unitName: formData.unitName.trim() || undefined,
        isJointWinner: formData.isJointWinner,
        jointWinnerName: formData.isJointWinner && formData.jointWinnerName.trim() ? formData.jointWinnerName.trim() : undefined,
        jointWinnerRole: formData.isJointWinner && formData.jointWinnerRole.trim() ? formData.jointWinnerRole.trim() : undefined,
        jointWinnerPhotoUrl: formData.isJointWinner && formData.jointWinnerPhotoUrl.trim() ? formData.jointWinnerPhotoUrl.trim() : undefined,
        month: formData.month,
        year: Number(formData.year),
        awardCategory: formData.awardCategory,
        awardScope:
          formData.awardScope ||
          (formData.scopeType === 'church'
            ? 'Church-wide'
            : formData.scopeType === 'workforce'
            ? 'Workforce-wide'
            : formData.scopeType === 'organisation'
            ? 'Organisation-wide'
            : formData.scopeType === 'unit'
            ? 'Unit'
            : 'Departmental'),
        awardTitle:
          formData.awardTitle.trim() ||
          (formData.scopeType === 'church'
            ? 'Innovative Worker of the Month'
            : formData.scopeType === 'workforce'
            ? 'Worker of the Month (All Departments)'
            : 'Worker of the Month'),
        roleOrTitle: formData.roleOrTitle.trim() || undefined,
        citation: formData.citation.trim() || undefined,
        votesCount: formData.votesCount ? Number(formData.votesCount) : undefined
      };

      const displayName = payload.jointWinnerName ? `${payload.name} & ${payload.jointWinnerName}` : payload.name;
      const displayDepts = [payload.departmentName, payload.secondaryDepartmentName].filter(Boolean).join(' & ') || '—';
      const categoryLabel =
        payload.scopeType === 'church'
          ? 'Church Hall of Fame'
          : payload.scopeType === 'workforce'
          ? 'Workforce Hall of Fame'
          : payload.scopeType === 'organisation'
          ? 'Organisation Hall of Fame'
          : payload.scopeType === 'unit'
          ? `Unit Hall of Fame (${payload.unitName || 'Unit'})`
          : `Department Hall of Fame (${displayDepts})`;

      if (editingRecord) {
        await updateLegacyWinner(editingRecord.id, payload, actor);
        notifyAction({
          type: 'update',
          title: 'Hall of Fame Winner Updated',
          details: `${displayName}'s record has been updated in the Hall of Fame archive.`,
          resourceName: displayName,
          actorName: actor.name,
          data: {
            'Winner Name': displayName,
            'Award Category / Scope': categoryLabel,
            'Award Title': payload.awardTitle,
            'Period': `${payload.month} ${payload.year}`,
            'Department(s)': displayDepts,
            'Organisation': payload.organisationName || '—',
            ...(payload.isJointWinner ? { 'Status': 'Joint Honorees (2 Departments)' } : {})
          }
        });
      } else {
        await createLegacyWinner(payload, actor);
        notifyAction({
          type: 'create',
          title: 'Past Winner Added',
          details: `${displayName} has been added to the Hall of Fame archive.`,
          resourceName: displayName,
          actorName: actor.name,
          data: {
            'Winner Name': displayName,
            'Award Category / Scope': categoryLabel,
            'Award Title': payload.awardTitle,
            'Period': `${payload.month} ${payload.year}`,
            'Department(s)': displayDepts,
            'Organisation': payload.organisationName || '—',
            ...(payload.isJointWinner ? { 'Status': 'Joint Honorees (2 Departments)' } : {})
          }
        });
      }

      setIsModalOpen(false);
      await loadAll(true);
    } catch (err: any) {
      console.error('Error saving legacy winner:', err);
      notifyAction({
        type: 'error',
        title: 'Save Failed',
        details: err?.message || 'Failed to save historical winner.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewRecord = (rec: LegacyWinnerRecord) => {
    const displayName = rec.jointWinnerName ? `${rec.name} & ${rec.jointWinnerName}` : rec.name;
    const displayDepts = [rec.departmentName, rec.secondaryDepartmentName].filter(Boolean).join(' & ');
    const categoryLabel =
      rec.awardCategory === 'innovative' || rec.awardTitle?.toLowerCase().includes('innovative')
        ? 'Innovative Worker of the Month (Entire Church)'
        : rec.awardCategory === 'workforce_wide' ||
          rec.awardTitle?.toLowerCase().includes('workforce') ||
          rec.awardTitle?.toLowerCase().includes('all departments')
        ? 'Worker of the Month across Entire Workforce (All Departments)'
        : 'Worker of the Month (Departmental)';

    notifyAction({
      type: 'read',
      title: 'Hall of Fame Winner Record (Read Access)',
      details: `Inspecting historical winner certificate, citations, and recognition details for ${displayName}.`,
      resourceName: displayName,
      data: {
        'Winner Full Name': rec.jointWinnerName ? `${rec.name} & ${rec.jointWinnerName} (Joint Winners)` : rec.name,
        'Award Category / Tier': categoryLabel,
        'Award Title': rec.awardTitle || 'Worker of the Month',
        'Honour Period': `${rec.month} ${rec.year}`,
        'Department(s)': displayDepts || 'All Departments / Church-wide',
        ...(rec.secondaryDepartmentName ? { 'Primary Department': rec.departmentName || '—', 'Secondary Department': rec.secondaryDepartmentName } : {}),
        'Organisation': rec.organisationName || 'The Reinvention House',
        'Votes Recorded': rec.votesCount ? `${rec.votesCount} verified votes` : 'Honorary Induction',
        'Citation': rec.citation || 'No citation text recorded.'
      }
    });
  };

  const handleDelete = (rec: LegacyWinnerRecord) => {
    if (!isSuperAdmin) {
      alert('Unauthorized: Only the Super Administrator can permanently delete Hall of Fame winner records.');
      return;
    }

    confirmAction(
      'Delete Historical Winner Record',
      `Are you sure you want to delete ${rec.name} (${rec.month} ${rec.year}) from the Hall of Fame Archive? This record will be permanently removed from public view.`,
      async () => {
        try {
          const actor = {
            id: userProfile?.uid || adminUser?.id || 'admin',
            name: userProfile?.displayName || adminUser?.fullName || 'Administrator',
            email: userProfile?.email || adminUser?.email,
            role: adminUser?.role || (isSuperAdmin ? 'super_admin' : 'admin')
          };

          // Optimistically remove immediately from local view
          setRecords(prev => prev.filter(r => r.id !== rec.id));

          await deleteLegacyWinner(rec.id, actor);
          notifyAction({
            type: 'delete',
            title: 'Winner Record Purged',
            details: `${rec.name} (${rec.month} ${rec.year}) was permanently removed from the Hall of Fame Archive.`,
            resourceName: rec.name,
            actorName: actor.name
          });
          await loadAll(true);
        } catch (e: any) {
          notifyAction({
            type: 'error',
            title: 'Delete Failed',
            details: e?.message || 'Could not delete winner record.'
          });
          loadAll(true);
        }
      }
    );
  };

  const handleSeedSampleData = async () => {
    confirmAction(
      'Load Sample Historical Winners',
      'This will populate your Hall of Fame with sample winners from past months covering Departmental, Workforce-Wide (All Departments), and Church Innovative Worker categories. Proceed?',
      async () => {
        try {
          const actor = {
            id: userProfile?.uid || 'admin',
            name: userProfile?.displayName || 'Administrator',
            email: userProfile?.email
          };

          const samples = [
            {
              name: 'Sister Blessing Adeleke',
              photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
              organisationName: organisations[0]?.name || 'The Reinvention House',
              organisationId: organisations[0]?.id || '',
              departmentName: departments[0]?.name || 'Media & Audio Ministry',
              departmentId: departments[0]?.id || '',
              month: 'November',
              year: 2024,
              awardCategory: 'departmental',
              awardScope: 'Departmental',
              awardTitle: 'Worker of the Month',
              roleOrTitle: 'Live Stream Sound Engineer',
              citation: 'Faithful and unwavering dedication to sanctuary broadcast operations and Sunday sound reinforcement within Media & Audio.',
              votesCount: 48
            },
            {
              name: 'Brother Samuel Adeyemi',
              photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
              organisationName: organisations[0]?.name || 'The Reinvention House',
              organisationId: organisations[0]?.id || '',
              departmentName: 'All Departments / Workforce',
              departmentId: '',
              month: 'December',
              year: 2024,
              awardCategory: 'workforce_wide',
              awardScope: 'All Departments / Entire Workforce',
              awardTitle: 'Worker of the Month (All Departments)',
              roleOrTitle: 'Facilities Operations Director',
              citation: 'Distinguished overall worker recognized across the entire church workforce for remarkable coordination, excellence, and servant leadership.',
              votesCount: 112
            },
            {
              name: 'Deaconess Kemi Balogun',
              photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
              organisationName: organisations[0]?.name || 'The Reinvention House',
              organisationId: organisations[0]?.id || '',
              departmentName: 'Church-wide Innovation Unit',
              departmentId: '',
              month: 'January',
              year: 2025,
              awardCategory: 'innovative',
              awardScope: 'Entire Church (Innovation)',
              awardTitle: 'Innovative Worker of the Month',
              roleOrTitle: 'Digital Systems & Visitor Automation Lead',
              citation: 'Pioneered digital QR-checkin kiosks and seamless first-timer automated discipleship follow-up, transforming church guest retention.',
              votesCount: 89
            },
            {
              name: 'Sister Mary Johnson',
              photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
              organisationName: organisations[0]?.name || 'The Reinvention House',
              organisationId: organisations[0]?.id || '',
              departmentName: departments[0]?.name || 'Sanctuary Care',
              departmentId: departments[0]?.id || '',
              isJointWinner: true,
              secondaryDepartmentName: departments[1]?.name || 'Music & Worship Ministry',
              secondaryDepartmentId: departments[1]?.id || '',
              jointWinnerName: 'Brother Timothy Adeleke',
              jointWinnerRole: 'Choir Technical Lead',
              jointWinnerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
              month: 'December',
              year: 2024,
              awardCategory: 'departmental',
              awardScope: 'Cross-Departmental Joint Honorees',
              awardTitle: 'Worker of the Month (Joint Honorees)',
              roleOrTitle: 'Sanctuary Sanitation Lead',
              citation: 'Commended jointly for exceptional multi-departmental teamwork, joyful humility, and tireless devotion to God’s house.',
              votesCount: 65
            }
          ];

          for (const s of samples) {
            await createLegacyWinner(s, actor);
          }

          notifyAction('Sample Data Loaded', 'Added historical winners spanning Departmental, Workforce-wide, and Innovative Worker awards.', 'success');
          loadAll();
        } catch (e: any) {
          notifyAction('Seed Failed', e?.message || 'Could not load sample winners.', 'error');
        }
      }
    );
  };

  // Compute years list for filter
  const existingYears = Array.from(new Set(records.map((r) => String(r.year)))).sort(
    (a, b) => Number(b) - Number(a)
  );

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (selectedYear !== 'all' && String(r.year) !== selectedYear) return false;
    if (selectedOrg !== 'all' && r.organisationId !== selectedOrg && r.organisationName !== selectedOrg) {
      return false;
    }
    if (selectedCategory !== 'all') {
      const isInnov = r.awardCategory === 'innovative' || r.awardTitle?.toLowerCase().includes('innovative');
      const isWorkforce =
        r.awardCategory === 'workforce_wide' ||
        r.awardTitle?.toLowerCase().includes('workforce') ||
        r.awardTitle?.toLowerCase().includes('all departments');

      if (selectedCategory === 'innovative' && !isInnov) return false;
      if (selectedCategory === 'workforce_wide' && !isWorkforce) return false;
      if (selectedCategory === 'departmental' && (isInnov || isWorkforce)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchJointName = (r.jointWinnerName || '').toLowerCase().includes(q);
      const matchAward = (r.awardTitle || '').toLowerCase().includes(q);
      const matchDept = (r.departmentName || '').toLowerCase().includes(q);
      const matchSecDept = (r.secondaryDepartmentName || '').toLowerCase().includes(q);
      const matchOrg = r.organisationName.toLowerCase().includes(q);
      const matchMonth = r.month.toLowerCase().includes(q);
      if (!matchName && !matchJointName && !matchAward && !matchDept && !matchSecDept && !matchOrg && !matchMonth) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-[#251464] via-[#1E293B] to-[#0F172A] rounded-2xl border border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FF8A00] text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-[#F8FAFC]">
                Hall of Fame Archive (Previous Web App Winners)
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Record and manage past award winners from previous cycles or offline recognitions so they reflect in the public Hall of Fame.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {records.length === 0 && (
            <button
              onClick={handleSeedSampleData}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#334155] hover:bg-slate-700 text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-[#FF8A00]" />
              <span>Load Sample Archive</span>
            </button>
          )}

          {onNavigateToPublicHallOfFame && (
            <button
              onClick={onNavigateToPublicHallOfFame}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#251464] hover:bg-[#251464]/90 text-[#FF8A00] border border-[#FF8A00]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View Public Hall of Fame</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            id="btn-add-legacy-winner"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:from-[#FF9E2C] hover:to-[#FF8A00] text-slate-950 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Previous Winner</span>
          </button>
        </div>
      </div>

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Archived Winners</span>
          <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-1">{records.length}</div>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Recorded Years</span>
          <div className="text-2xl font-bold font-display text-[#FF8A00] mt-1">
            {existingYears.length || (records.length > 0 ? 1 : 0)}
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Organisations</span>
          <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-1">
            {new Set(records.map((r) => r.organisationName)).size}
          </div>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Status in App</span>
          <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced to Public View</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by winner name, award, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <Filter className="w-3.5 h-3.5" />
            <span>Year:</span>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Years</option>
            {existingYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] ml-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Org:</span>
          </div>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] max-w-[180px] truncate"
          >
            <option value="all">All Organisations</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] ml-2">
            <Trophy className="w-3.5 h-3.5 text-[#FF8A00]" />
            <span>Award Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Recognition Types</option>
            <option value="departmental">Departmental Winners</option>
            <option value="workforce_wide">Workforce-Wide (All Depts)</option>
            <option value="innovative">Innovative Worker (Entire Church)</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#94A3B8] bg-[#1E293B] rounded-2xl border border-slate-800">
          Loading previous winners archive...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-[#1E293B] rounded-2xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#251464] border border-[#FF8A00]/30 text-[#FF8A00] flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold font-display text-[#F8FAFC]">No Previous Winners Found</h3>
            <p className="text-xs text-[#94A3B8]">
              {searchQuery || selectedYear !== 'all' || selectedOrg !== 'all'
                ? 'No past winners match your active filter criteria.'
                : 'You have not added any past winners from your previous web app yet.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Add First Winner
            </button>
            <button
              onClick={handleSeedSampleData}
              className="px-4 py-2 bg-[#334155] hover:bg-slate-700 text-[#F8FAFC] font-semibold rounded-xl text-xs transition-colors"
            >
              Load Sample Records
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-gradient-to-b from-[#1A2234] via-[#111827] to-[#0A0E17] rounded-3xl border border-slate-800/90 overflow-hidden shadow-xl hover:shadow-[0_20px_45px_rgba(255,138,0,0.18)] hover:border-[#FF8A00]/60 transition-all duration-300 flex flex-col justify-between group"
            >
              {/* TOP PROMINENT WINNER PORTRAIT HERO STAGE */}
              <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-gradient-to-b from-[#251464]/60 via-slate-900 to-[#0F172A] flex items-center justify-center">
                {rec.photoUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={rec.photoUrl}
                      alt={rec.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108 group-hover:brightness-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none" />
                  </div>
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                    <div className="w-48 h-48 rounded-full border border-amber-500/20 absolute animate-ray-rotate opacity-30" />
                    <div className="relative z-10 w-24 h-24 rounded-full p-1 bg-gradient-to-b from-amber-400 via-[#FF8A00] to-orange-700 shadow-2xl flex items-center justify-center animate-gold-pulse">
                      <div className="w-full h-full rounded-full bg-[#0F172A] flex flex-col items-center justify-center border-2 border-amber-300/40">
                        <Crown className="w-5 h-5 text-amber-400 mb-0.5" />
                        <span className="font-display font-black text-3xl text-amber-100">
                          {rec.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <span className="relative z-10 text-[10px] font-bold tracking-widest uppercase text-amber-400/90 mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Archive Honoree</span>
                    </span>
                  </div>
                )}

                {/* Top gradient for badges */}
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Bottom gradient blending into card body */}
                <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#111827] via-[#111827]/80 to-transparent pointer-events-none" />

                {/* Floating Top Badges */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/75 border border-[#FF8A00]/40 text-[#FF8A00] text-xs font-bold backdrop-blur-md shadow-lg">
                    <Trophy className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                    <span className="truncate max-w-[140px]">{rec.awardTitle || 'Worker of the Month'}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/75 text-amber-200 text-xs font-semibold border border-slate-700 backdrop-blur-md shadow-md">
                    <Calendar className="w-3 h-3 text-[#FF8A00]" />
                    <span>
                      {rec.month} {rec.year}
                    </span>
                  </span>
                </div>

                {/* 3D Gold Crown Medallion on Bottom-Right */}
                <div className="absolute bottom-3 right-4 z-10">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A00] to-orange-600 text-slate-950 flex items-center justify-center shadow-[0_4px_20px_rgba(255,138,0,0.5)] border border-amber-200/50 group-hover:scale-110 transition-transform">
                    <Crown className="w-5 h-5 fill-slate-950" />
                  </div>
                </div>
              </div>

              {/* CARD DETAILS */}
              <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div>
                    {/* Category Distinction Pill */}
                    <div className="mb-2">
                      {(() => {
                        const isInnov =
                          rec.awardCategory === 'innovative' ||
                          rec.awardTitle?.toLowerCase().includes('innovative');
                        const isWorkforce =
                          rec.awardCategory === 'workforce_wide' ||
                          rec.awardTitle?.toLowerCase().includes('workforce') ||
                          rec.awardTitle?.toLowerCase().includes('all departments');
                        if (isInnov) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Innovative Worker • Entire Church</span>
                            </span>
                          );
                        }
                        if (isWorkforce) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 text-[11px] font-bold">
                              <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>Workforce-Wide • All Departments</span>
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/35 text-blue-300 text-[11px] font-bold">
                            <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>Departmental Winner</span>
                          </span>
                        );
                      })()}
                    </div>

                    <h4 className="text-lg font-bold text-[#F8FAFC] font-display group-hover:text-[#FF8A00] transition-colors leading-snug">
                      {rec.name}
                      {rec.jointWinnerName && (
                        <span className="text-amber-400"> &amp; {rec.jointWinnerName}</span>
                      )}
                    </h4>
                    {(rec.isJointWinner || rec.secondaryDepartmentName || rec.jointWinnerName) && (
                      <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        <Users className="w-3 h-3 text-[#FF8A00]" />
                        <span>Joint Winners ({rec.secondaryDepartmentName ? '2 Departments' : 'Co-Honorees'})</span>
                      </div>
                    )}
                    {rec.roleOrTitle ? (
                      <p className="text-xs text-[#94A3B8] truncate mt-0.5">{rec.roleOrTitle}</p>
                    ) : (
                      <p className="text-xs text-[#94A3B8] truncate mt-0.5">Recognized Recipient</p>
                    )}
                  </div>

                  {/* Church context */}
                  <div className="space-y-1.5 text-xs text-[#94A3B8] bg-[#0F172A]/70 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                      <span className="text-[#F8FAFC] font-medium truncate">{rec.organisationName}</span>
                    </div>
                    {rec.departmentName && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{rec.departmentName}</span>
                        {rec.secondaryDepartmentName && (
                          <span className="text-[10px] text-indigo-400/80 font-bold uppercase">(Dept 1)</span>
                        )}
                      </div>
                    )}
                    {rec.secondaryDepartmentName && (
                      <div className="flex items-center gap-1.5 truncate text-amber-300">
                        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate font-medium">{rec.secondaryDepartmentName}</span>
                        <span className="text-[10px] text-amber-400/80 font-bold uppercase">(Dept 2)</span>
                      </div>
                    )}
                    {rec.votesCount !== undefined && rec.votesCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] pt-1 border-t border-slate-800">
                        <span>Historical Tally:</span>
                        <strong className="text-[#FF8A00]">{rec.votesCount} ballots</strong>
                      </div>
                    )}
                  </div>

                  {/* Citation if present */}
                  {rec.citation && (
                    <p className="text-[11px] text-[#94A3B8] italic line-clamp-2 bg-[#251464]/20 p-2.5 rounded-lg border border-[#251464]">
                      &ldquo;{rec.citation}&rdquo;
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] px-2.5 py-0.5 rounded-full bg-[#0F172A] border border-slate-800">
                    Archive Entry
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleViewRecord(rec)}
                      title="View Certificate / Details (Read Access)"
                      className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(rec)}
                      title="Edit Record"
                      className="p-2 text-[#94A3B8] hover:text-[#FF8A00] hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(rec)}
                        title="Delete Record (Super Admin Only)"
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl border border-slate-800 w-full max-w-xl shadow-2xl overflow-hidden animate-scaleIn my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#251464] to-[#1E293B] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF8A00] text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-[#F8FAFC]">
                    {editingRecord ? 'Edit Previous Winner' : 'Add Previous Winner (Web App Archive)'}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    This record will automatically reflect in the public Hall of Fame.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm p-1 rounded-lg hover:bg-[#334155]"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 text-xs flex-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Winner Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sister Grace Johnson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              {/* Photo URL & Instant Preview */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#F8FAFC]">Image Link / Photo URL</label>
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                    />
                  </div>
                  {/* Preview Thumbnail */}
                  <div className="w-11 h-11 rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-[#94A3B8] font-bold">Preview</span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  Paste a direct link to the winner's picture (hosted on Unsplash, Cloud storage, Imgur, or website).
                </p>
              </div>

              {/* Month and Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Month Won *</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    {MONTH_NAMES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Year Won *</label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2040}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              {/* Organisation and Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Organisation *</label>
                  <select
                    value={formData.organisationId}
                    onChange={(e) => handleOrgChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">-- Choose Organisation --</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Primary Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">-- None / General Workforce --</option>
                    {departments
                      .filter((d) => !formData.organisationId || d.organisationId === formData.organisationId)
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Joint Winner / Cross-Department Recognition Toggle & Fields */}
              <div className="p-3.5 bg-[#0F172A]/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#FF8A00]">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Joint Winner / Co-Honoree Recognition</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Select two different departments or record co-winners for this vote cycle.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.isJointWinner}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          isJointWinner: checked,
                          secondaryDepartmentId: checked ? prev.secondaryDepartmentId : '',
                          secondaryDepartmentName: checked ? prev.secondaryDepartmentName : '',
                          jointWinnerName: checked ? prev.jointWinnerName : ''
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF8A00]"></div>
                  </label>
                </div>

                {formData.isJointWinner && (
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F8FAFC]">
                          Secondary Department *
                        </label>
                        <select
                          value={formData.secondaryDepartmentId}
                          onChange={(e) => handleSecondaryDeptChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[#1E293B] border border-amber-500/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                        >
                          <option value="">-- Choose Second Department --</option>
                          {departments
                            .filter((d) => !formData.organisationId || d.organisationId === formData.organisationId)
                            .map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} {dept.id === formData.departmentId ? '(Same as Dept 1)' : ''}
                              </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-amber-400/80">
                          Honoree represents or shares honors across this second department.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F8FAFC]">
                          Co-Winner Full Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Bro. David Adeleke"
                          value={formData.jointWinnerName}
                          onChange={(e) => setFormData({ ...formData, jointWinnerName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                        >
                        </input>
                        <p className="text-[10px] text-[#94A3B8]">
                          Leave blank if single honoree served across two departments.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F8FAFC]">
                          Co-Winner Role / Title (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Choir Director / Altar Lead"
                          value={formData.jointWinnerRole}
                          onChange={(e) => setFormData({ ...formData, jointWinnerRole: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                        />
                      </div>

                      {/* Co-Winner Photo URL & Live Preview */}
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F8FAFC]">
                          Co-Winner Photo URL (Optional)
                        </label>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                            <input
                              type="url"
                              placeholder="https://images.unsplash.com/... or image link"
                              value={formData.jointWinnerPhotoUrl}
                              onChange={(e) => setFormData({ ...formData, jointWinnerPhotoUrl: e.target.value })}
                              className="w-full pl-9 pr-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                            />
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-[#0F172A] border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {formData.jointWinnerPhotoUrl ? (
                              <img
                                src={formData.jointWinnerPhotoUrl}
                                alt="Co-Winner Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-[9px] text-[#94A3B8]">Co-Pic</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Award Recognition Level / Scope Selection */}
              <div className="space-y-3 p-3.5 bg-[#0F172A]/90 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#F8FAFC]">
                    Voting Exercise Scope &amp; Hall of Fame Level *
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    {formData.scopeType === 'church'
                      ? 'Church Hall of Fame'
                      : formData.scopeType === 'workforce'
                      ? 'Workforce Hall of Fame'
                      : formData.scopeType === 'organisation'
                      ? 'Organisation Hall of Fame'
                      : formData.scopeType === 'unit'
                      ? 'Unit Hall of Fame'
                      : 'Department Hall of Fame'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  Select the exact scope of this voting exercise. Certificates and awards dynamically format their Hall of Fame titles based on this scope.
                </p>

                {/* 5 Scopes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {/* Option 1: Church-wide */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scopeType: 'church',
                        awardCategory: 'innovative',
                        awardScope: 'Church-wide',
                        awardTitle: prev.awardTitle === 'Worker of the Month' ? 'Innovative Worker of the Month' : prev.awardTitle
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.scopeType === 'church'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/60 border-slate-800 hover:border-slate-700 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-bold text-xs text-[#F8FAFC]">Church</span>
                    </div>
                    <div className="text-[10px] text-amber-300 font-medium leading-tight">
                      Church Hall of Fame
                    </div>
                  </button>

                  {/* Option 2: Workforce-wide */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scopeType: 'workforce',
                        awardCategory: 'workforce_wide',
                        awardScope: 'Workforce-wide',
                        awardTitle: prev.awardTitle === 'Worker of the Month' ? 'Worker of the Month (All Departments)' : prev.awardTitle
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.scopeType === 'workforce'
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/60 border-slate-800 hover:border-slate-700 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-bold text-xs text-[#F8FAFC]">Workforce</span>
                    </div>
                    <div className="text-[10px] text-indigo-300 font-medium leading-tight">
                      Workforce Hall of Fame
                    </div>
                  </button>

                  {/* Option 3: Organisation-wide */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scopeType: 'organisation',
                        awardCategory: 'organisation',
                        awardScope: 'Organisation-wide',
                        awardTitle: prev.awardTitle
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.scopeType === 'organisation'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/60 border-slate-800 hover:border-slate-700 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-bold text-xs text-[#F8FAFC]">Organisation</span>
                    </div>
                    <div className="text-[10px] text-purple-300 font-medium leading-tight">
                      Organisation Hall of Fame
                    </div>
                  </button>

                  {/* Option 4: Department */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scopeType: 'department',
                        awardCategory: 'departmental',
                        awardScope: 'Departmental',
                        awardTitle: prev.awardTitle === 'Worker of the Month (All Departments)' ? 'Worker of the Month' : prev.awardTitle
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.scopeType === 'department'
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/60 border-slate-800 hover:border-slate-700 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-bold text-xs text-[#F8FAFC]">Department</span>
                    </div>
                    <div className="text-[10px] text-blue-300 font-medium leading-tight">
                      Department Hall of Fame
                    </div>
                  </button>

                  {/* Option 5: Unit */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scopeType: 'unit',
                        awardCategory: 'unit',
                        awardScope: 'Unit',
                        awardTitle: prev.awardTitle
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.scopeType === 'unit'
                        ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50 text-[#F8FAFC]'
                        : 'bg-[#1E293B]/60 border-slate-800 hover:border-slate-700 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-bold text-xs text-[#F8FAFC]">Unit</span>
                    </div>
                    <div className="text-[10px] text-emerald-300 font-medium leading-tight">
                      Unit Hall of Fame
                    </div>
                  </button>
                </div>

                {/* Optional Unit Name Input if Unit Scope Selected */}
                {formData.scopeType === 'unit' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">
                      Unit Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Protocol Unit, Ushering Unit, Sound Unit"
                      value={formData.unitName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, unitName: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#1E293B] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Scope-based Title Preview */}
                <div className="mt-2 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-semibold text-[#F8FAFC]">Certificate Title:</span>
                    <span className="text-amber-400 font-bold">
                      {formData.scopeType === 'church'
                        ? 'Church Hall of Fame'
                        : formData.scopeType === 'workforce'
                        ? 'Workforce Hall of Fame'
                        : formData.scopeType === 'organisation'
                        ? 'Organisation Hall of Fame'
                        : formData.scopeType === 'unit'
                        ? 'Unit Hall of Fame'
                        : 'Department Hall of Fame'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-semibold text-[#F8FAFC]">Award Title:</span>
                    <span className="text-amber-400 font-bold">
                      {formData.scopeType === 'church'
                        ? 'Church Hall of Fame'
                        : formData.scopeType === 'workforce'
                        ? 'Workforce Hall of Fame'
                        : formData.scopeType === 'organisation'
                        ? 'Organisation Hall of Fame'
                        : formData.scopeType === 'unit'
                        ? `Unit Hall of Fame (${formData.unitName || 'Unit Name'})`
                        : `Department Hall of Fame (${[formData.departmentName, formData.isJointWinner && formData.secondaryDepartmentName].filter(Boolean).join(' & ') || 'Department Name'})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Award Title / Preset & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Award Title *</label>
                  <div className="space-y-1.5">
                    <select
                      value={
                        formData.awardTitle === 'Worker of the Month' ||
                        formData.awardTitle === 'Worker of the Month (All Departments)' ||
                        formData.awardTitle === 'Innovative Worker of the Month' ||
                        formData.awardTitle === 'Worker of the Month (Joint Honorees)'
                          ? formData.awardTitle
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            awardTitle: val,
                            awardCategory:
                              val === 'Innovative Worker of the Month'
                                ? 'innovative'
                                : val === 'Worker of the Month (All Departments)'
                                ? 'workforce_wide'
                                : 'departmental',
                            awardScope:
                              val === 'Innovative Worker of the Month'
                                ? 'Entire Church (Innovation)'
                                : val === 'Worker of the Month (All Departments)'
                                ? 'All Departments / Entire Workforce'
                                : 'Departmental'
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="Worker of the Month">Worker of the Month (Department)</option>
                      <option value="Worker of the Month (All Departments)">Worker of the Month (All Departments / Entire Workforce)</option>
                      <option value="Innovative Worker of the Month">Innovative Worker of the Month (Entire Church)</option>
                      <option value="Worker of the Month (Joint Honorees)">Worker of the Month (Joint Honorees)</option>
                      <option value="custom">-- Custom Award Title --</option>
                    </select>

                    <input
                      type="text"
                      placeholder="e.g. Worker of the Month"
                      value={formData.awardTitle}
                      onChange={(e) => setFormData({ ...formData, awardTitle: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#F8FAFC]">Role / Ministry Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Sound Engineer"
                    value={formData.roleOrTitle}
                    onChange={(e) => setFormData({ ...formData, roleOrTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                  <p className="text-[10px] text-[#94A3B8]">
                    The winner's title or service role within the church.
                  </p>
                </div>
              </div>

              {/* Citation & Notes */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Citation / Commendation Notes</label>
                <div className="relative">
                  <Quote className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
                  <textarea
                    rows={2}
                    placeholder="Brief remark on why they were recognized or their dedication..."
                    value={formData.citation}
                    onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
              </div>

              {/* Past Votes Count (Optional) */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#F8FAFC]">Previous Ballots Won (Optional)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 45"
                  value={formData.votesCount}
                  onChange={(e) => setFormData({ ...formData, votesCount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-6 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-[#1E293B] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#334155] hover:bg-slate-700 text-[#F8FAFC] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save to Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
