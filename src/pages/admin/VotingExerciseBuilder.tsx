import React, { useState, useEffect, useMemo } from 'react';
import {
  Organisation,
  Department,
  Unit,
  Person,
  ExerciseStatus,
  VotingScopeType,
  VoterSelectionMode,
  NomineeSelectionMode
} from '../../types';
import {
  getOrganisations,
  getDepartments,
  getUnits,
  getPeople,
  createVotingExercise,
  assignEligibilityBatch
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  FolderTree,
  Award,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Users,
  Shield,
  Clock,
  AlertCircle,
  Globe,
  Briefcase,
  Sliders,
  Check,
  Search,
  Eye,
  Lock,
  Vote,
  GripVertical
} from 'lucide-react';

interface VotingExerciseBuilderProps {
  onSuccess: (exerciseId: string) => void;
  onCancel: () => void;
}

export const VotingExerciseBuilder: React.FC<VotingExerciseBuilderProps> = ({
  onSuccess,
  onCancel
}) => {
  const { userProfile, adminUser, isSuperAdmin } = useAuth();
  const { notifyAction } = useActionModal();

  const userRole = adminUser?.role || 'admin';
  const isSuperAdminRole = Boolean(isSuperAdmin || userRole === 'super_admin' || adminUser?.email === 'yinkopet@gmail.com');
  const isChurchAdminRole = Boolean(isSuperAdminRole || userRole === 'admin');
  const isOrgAdminRole = userRole === 'organisation_admin';
  const isDeptAdminRole = userRole === 'department_admin';

  const [step, setStep] = useState(1);

  // Reference Data
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // STEP 1: Basic Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('Excellence & Recognition');

  // STEP 2: Voting Scope
  const initialScope: VotingScopeType = isDeptAdminRole ? 'department' : isOrgAdminRole ? 'organisation' : 'workforce';
  const [scopeType, setScopeType] = useState<VotingScopeType>(initialScope);
  const [organisationId, setOrganisationId] = useState(adminUser?.organisationId || '');
  const [departmentId, setDepartmentId] = useState(adminUser?.departmentId || '');
  const [unitId, setUnitId] = useState('');

  // STEP 3: Eligible Voters
  const [voterSelectionMode, setVoterSelectionMode] = useState<VoterSelectionMode>(
    isOrgAdminRole || isDeptAdminRole ? 'scope_members' : 'all_workforce'
  );
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [voterSearchQuery, setVoterSearchQuery] = useState('');

  // STEP 4: Nominees
  const [nomineeSelectionMode, setNomineeSelectionMode] = useState<NomineeSelectionMode>('manual_selection');
  const [nominees, setNominees] = useState<
    Array<{
      id: string;
      displayName: string;
      roleOrTitle: string;
      department: string;
      organisationName: string;
      photoUrl: string;
      bio: string;
      personId?: string;
    }>
  >([]);
  const [nomineeSearchQuery, setNomineeSearchQuery] = useState('');
  const [selectedNomineePersonId, setSelectedNomineePersonId] = useState('');
  const [customNomineeName, setCustomNomineeName] = useState('');
  const [customNomineeRole, setCustomNomineeRole] = useState('');
  const [customNomineeDept, setCustomNomineeDept] = useState('');
  const [customNomineeOrg, setCustomNomineeOrg] = useState('');
  const [customNomineePhoto, setCustomNomineePhoto] = useState('');
  const [customNomineeBio, setCustomNomineeBio] = useState('');
  const [nomineeFormMode, setNomineeFormMode] = useState<'from_database' | 'custom_entry'>('from_database');

  // STEP 5: Voting Criteria
  const [criteria, setCriteria] = useState<Array<{ id: string; title: string; description: string; active: boolean }>>([
    { id: '1', title: 'Consistency and Commitment', description: 'Faithful presence and steadfast devotion to assigned service responsibilities.', active: true },
    { id: '2', title: 'Attendance and Punctuality', description: 'Consistently arrives early and prepared for all church activities and team duties.', active: true },
    { id: '3', title: 'Excellence in Service', description: 'High quality of execution, diligence, and reverence in the house of God.', active: true },
    { id: '4', title: 'Leadership and Initiative', description: 'Proactively identifies needs, inspires others, and solves problems gracefully.', active: true },
    { id: '5', title: 'Teamwork and Collaboration', description: 'Humble, uplifting, and cooperative spirit with fellow workers and leadership.', active: true },
    { id: '6', title: 'Overall Kingdom Impact', description: 'Significant contribution to the growth, order, and spiritual atmosphere of the church.', active: true }
  ]);
  const [newCritTitle, setNewCritTitle] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');

  // STEP 6: Voting Rules
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [maxVotesPerPerson, setMaxVotesPerPerson] = useState(1);

  // STEP 7: Schedule
  const now = new Date();
  const defaultStart = now.toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 86400000 * 7).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [initialStatus, setInitialStatus] = useState<ExerciseStatus>('open');

  // STEP 8: Results Settings
  const [resultsVisibilityMode, setResultsVisibilityMode] = useState<'admin_only' | 'publish_after_close' | 'manual_publish'>('admin_only');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingRefs(true);
      try {
        const [orgs, depts, unitList, peeps] = await Promise.all([
          getOrganisations(false),
          getDepartments(undefined, false),
          getUnits(undefined, undefined, false),
          getPeople()
        ]);

        let filteredOrgs = orgs;
        let filteredDepts = depts;
        let filteredUnits = unitList;
        let filteredPeeps = peeps;

        if (isOrgAdminRole && adminUser?.organisationId) {
          filteredOrgs = orgs.filter((o) => o.id === adminUser.organisationId);
          filteredDepts = depts.filter((d) => d.organisationId === adminUser.organisationId);
          filteredUnits = unitList.filter((u) => u.organisationId === adminUser.organisationId);
          filteredPeeps = peeps.filter((p) =>
            p.organisationId === adminUser.organisationId ||
            (p.organisationName && adminUser.organisationName && p.organisationName.trim().toLowerCase() === adminUser.organisationName.trim().toLowerCase()) ||
            (p.memberships && p.memberships.some((m) => m.organisationId === adminUser.organisationId))
          );
          setOrganisationId(adminUser.organisationId);
          setScopeType('organisation');
          setVoterSelectionMode('scope_members');
        } else if (isDeptAdminRole && adminUser?.departmentId) {
          if (adminUser.organisationId) {
            filteredOrgs = orgs.filter((o) => o.id === adminUser.organisationId);
            setOrganisationId(adminUser.organisationId);
          }
          filteredDepts = depts.filter((d) => d.id === adminUser.departmentId);
          filteredUnits = unitList.filter((u) => u.departmentId === adminUser.departmentId);
          filteredPeeps = peeps.filter((p) =>
            p.departmentId === adminUser.departmentId ||
            (p.departmentName && adminUser.departmentName && p.departmentName.trim().toLowerCase() === adminUser.departmentName.trim().toLowerCase()) ||
            (p.memberships && p.memberships.some((m) => m.departmentId === adminUser.departmentId))
          );
          setDepartmentId(adminUser.departmentId);
          setScopeType('department');
          setVoterSelectionMode('scope_members');
        } else if (orgs.length > 0) {
          setOrganisationId(orgs[0].id);
        }

        setOrganisations(filteredOrgs);
        setDepartments(filteredDepts);
        setUnits(filteredUnits);
        setPeople(filteredPeeps);
      } catch (e) {
        console.error('Error loading builder references:', e);
      } finally {
        setLoadingRefs(false);
      }
    };
    load();
  }, [isOrgAdminRole, isDeptAdminRole, adminUser?.organisationId, adminUser?.departmentId]);

  // Update voterSelectionMode defaults when scopeType changes
  const handleScopeChange = (newScope: VotingScopeType) => {
    // Role boundary guard
    if (isOrgAdminRole && (newScope === 'church' || newScope === 'workforce')) {
      return;
    }
    if (isDeptAdminRole && (newScope === 'church' || newScope === 'workforce' || newScope === 'organisation')) {
      return;
    }

    setScopeType(newScope);
    if (newScope === 'church') {
      setVoterSelectionMode('all_church');
      setNomineeSelectionMode('manual_selection');
    } else if (newScope === 'workforce') {
      setVoterSelectionMode('all_workforce');
      setNomineeSelectionMode('manual_selection');
    } else if (newScope === 'organisation') {
      setVoterSelectionMode('scope_members');
      setNomineeSelectionMode('manual_selection');
      if (adminUser?.organisationId) {
        setOrganisationId(adminUser.organisationId);
      } else if (organisations.length > 0 && !organisationId) {
        setOrganisationId(organisations[0].id);
      }
    } else if (newScope === 'department') {
      setVoterSelectionMode('scope_members');
      setNomineeSelectionMode('manual_selection');
      const targetOrg = isOrgAdminRole && adminUser?.organisationId
        ? adminUser.organisationId
        : organisationId || (organisations.length > 0 ? organisations[0].id : '');
      if (targetOrg && !organisationId) {
        setOrganisationId(targetOrg);
      }
      if (isDeptAdminRole && adminUser?.departmentId) {
        setDepartmentId(adminUser.departmentId);
      } else if (targetOrg) {
        const deptsForOrg = departments.filter((d) => d.organisationId === targetOrg);
        if (deptsForOrg.length > 0 && !departmentId) {
          setDepartmentId(deptsForOrg[0].id);
        }
      }
    } else if (newScope === 'unit') {
      setVoterSelectionMode('scope_members');
      setNomineeSelectionMode('manual_selection');
      if (isOrgAdminRole && adminUser?.organisationId) {
        setOrganisationId(adminUser.organisationId);
      } else if (organisations.length > 0 && !organisationId) {
        setOrganisationId(organisations[0].id);
      }
      if (isDeptAdminRole && adminUser?.departmentId) {
        setDepartmentId(adminUser.departmentId);
      }
    } else if (newScope === 'custom') {
      setVoterSelectionMode('custom');
      setNomineeSelectionMode('custom');
    }
  };

  // Filtered depts for chosen org
  const availableDepts = departments.filter((d) => d.organisationId === organisationId);
  const availableUnits = units.filter((u) => u.departmentId === departmentId);

  // Selected Scope Entities
  const selectedOrg = organisations.find((o) => o.id === organisationId);
  const selectedDept = departments.find((d) => d.id === departmentId);
  const selectedUnit = units.find((u) => u.id === unitId);

  // Scoped People: Strictly matching the chosen Department/Unit/Organisation
  const scopedPeople = useMemo(() => {
    if (scopeType === 'department') {
      const targetDeptName = selectedDept?.name?.trim().toLowerCase();
      return people.filter((p) => {
        if (departmentId && p.departmentId === departmentId) return true;
        if (targetDeptName && p.departmentName && p.departmentName.trim().toLowerCase() === targetDeptName) return true;
        if (p.memberships && p.memberships.some((m) =>
          ((departmentId && m.departmentId === departmentId) || (targetDeptName && m.departmentName && m.departmentName.trim().toLowerCase() === targetDeptName)) &&
          m.status === 'active'
        )) return true;
        return false;
      });
    }
    if (scopeType === 'unit') {
      const targetUnitName = selectedUnit?.name?.trim().toLowerCase();
      return people.filter((p) => {
        if (unitId && p.unitId === unitId) return true;
        if (targetUnitName && p.unitName && p.unitName.trim().toLowerCase() === targetUnitName) return true;
        if (p.memberships && p.memberships.some((m) =>
          ((unitId && m.unitId === unitId) || (targetUnitName && m.unitName && m.unitName.trim().toLowerCase() === targetUnitName)) &&
          m.status === 'active'
        )) return true;
        return false;
      });
    }
    if (scopeType === 'organisation') {
      const targetOrgName = selectedOrg?.name?.trim().toLowerCase();
      return people.filter((p) => {
        if (organisationId && p.organisationId === organisationId) return true;
        if (targetOrgName && p.organisationName && p.organisationName.trim().toLowerCase() === targetOrgName) return true;
        if (p.memberships && p.memberships.some((m) =>
          ((organisationId && m.organisationId === organisationId) || (targetOrgName && m.organisationName && m.organisationName.trim().toLowerCase() === targetOrgName)) &&
          m.status === 'active'
        )) return true;
        return false;
      });
    }
    if (scopeType === 'workforce') {
      return people.filter((p) => p.workforceMember !== false);
    }
    return people;
  }, [scopeType, departmentId, selectedDept, unitId, selectedUnit, organisationId, selectedOrg, people]);

  // Nominee candidate pool: strictly restricted to scopedPeople when scopeType is department or unit
  const nomineeCandidatePool = useMemo(() => {
    if (scopeType === 'department' || scopeType === 'unit') {
      return scopedPeople;
    }
    if (scopeType === 'organisation') {
      return scopedPeople;
    }
    return people;
  }, [scopeType, scopedPeople, people]);

  // Criteria Helpers
  const handleAddCriterion = () => {
    if (!newCritTitle.trim()) return;
    setCriteria([
      ...criteria,
      {
        id: String(Date.now()),
        title: newCritTitle.trim(),
        description: newCritDesc.trim(),
        active: true
      }
    ]);
    setNewCritTitle('');
    setNewCritDesc('');
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleToggleCriterionActive = (id: string) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  // Nominee Helpers
  const handleAddNominee = () => {
    if (nomineeFormMode === 'from_database') {
      const person = nomineeCandidatePool.find((p) => p.id === selectedNomineePersonId) || people.find((p) => p.id === selectedNomineePersonId);
      if (!person) return;

      if (nominees.some((n) => n.personId === person.id)) {
        alert('This person is already in the nominees list.');
        return;
      }

      setNominees([
        ...nominees,
        {
          id: String(Date.now()),
          displayName: person.fullName,
          roleOrTitle: person.roleTitle || 'Workforce Member',
          department: person.departmentName || (selectedDept ? selectedDept.name : ''),
          organisationName: person.organisationName || (selectedOrg ? selectedOrg.name : ''),
          photoUrl: person.photoUrl || person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          bio: `Nominated for distinguished contribution and service.`,
          personId: person.id
        }
      ]);
      setSelectedNomineePersonId('');
    } else {
      if (!customNomineeName.trim()) return;
      setNominees([
        ...nominees,
        {
          id: String(Date.now()),
          displayName: customNomineeName.trim(),
          roleOrTitle: customNomineeRole.trim() || 'Church Leader / Worker',
          department: customNomineeDept.trim() || (selectedDept ? selectedDept.name : ''),
          organisationName: customNomineeOrg.trim() || (selectedOrg ? selectedOrg.name : ''),
          photoUrl: customNomineePhoto.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          bio: customNomineeBio.trim() || 'Nominated for outstanding excellence and commitment.'
        }
      ]);
      setCustomNomineeName('');
      setCustomNomineeRole('');
      setCustomNomineeDept('');
      setCustomNomineeOrg('');
      setCustomNomineePhoto('');
      setCustomNomineeBio('');
    }
  };

  // 1-Click Nominate All Scoped Members (e.g. all department members)
  const handleNominateAllScoped = () => {
    if (nomineeCandidatePool.length === 0) {
      alert(`No registered workers found in ${selectedDept?.name || 'this department'}.`);
      return;
    }
    const existingPersonIds = new Set(nominees.map((n) => n.personId).filter(Boolean));
    const newItems = nomineeCandidatePool
      .filter((p) => !existingPersonIds.has(p.id))
      .map((p, idx) => ({
        id: String(Date.now() + idx),
        displayName: p.fullName,
        roleOrTitle: p.roleTitle || 'Workforce Member',
        department: p.departmentName || (selectedDept ? selectedDept.name : ''),
        organisationName: p.organisationName || (selectedOrg ? selectedOrg.name : ''),
        photoUrl: p.photoUrl || p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: `Nominated for distinguished contribution and service.`,
        personId: p.id
      }));

    if (newItems.length === 0) {
      alert(`All members of ${selectedDept?.name || 'this department'} are already added to nominees.`);
      return;
    }
    setNominees([...nominees, ...newItems]);
  };

  const handleRemoveNominee = (id: string) => {
    setNominees(nominees.filter((n) => n.id !== id));
  };

  // Voter selection helper
  const handleToggleVoterSelection = (personId: string) => {
    if (selectedVoterIds.includes(personId)) {
      setSelectedVoterIds(selectedVoterIds.filter((id) => id !== personId));
    } else {
      setSelectedVoterIds([...selectedVoterIds, personId]);
    }
  };

  const handleSelectAllFilteredVoters = (filteredList: Person[]) => {
    const ids = filteredList.map((p) => p.id);
    const newSelected = Array.from(new Set([...selectedVoterIds, ...ids]));
    setSelectedVoterIds(newSelected);
  };

  const handleClearSelectedVoters = () => {
    setSelectedVoterIds([]);
  };

  // Step Validation
  const validateCurrentStep = () => {
    setFormError('');
    if (step === 1) {
      if (!title.trim()) {
        setFormError('Please provide a title for the voting exercise.');
        return false;
      }
    }
    if (step === 2) {
      if (scopeType === 'organisation' && !organisationId) {
        setFormError('Please select an organisation for Organisation scope.');
        return false;
      }
      if (scopeType === 'department' && (!organisationId || !departmentId)) {
        setFormError('Please select both organisation and department for Department scope.');
        return false;
      }
      if (scopeType === 'unit' && (!organisationId || !departmentId || !unitId)) {
        setFormError('Please select organisation, department, and unit for Unit scope.');
        return false;
      }
    }
    if (step === 3) {
      if (voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom') {
        if (selectedVoterIds.length === 0) {
          setFormError('Please select at least one eligible voter for manual selection mode.');
          return false;
        }
      }
    }
    if (step === 4) {
      if (nominees.length < 1) {
        setFormError('Please add at least 1 nominee to the voting exercise.');
        return false;
      }
    }
    if (step === 5) {
      const activeCrits = criteria.filter((c) => c.active);
      if (activeCrits.length < 1) {
        setFormError('Please enable at least 1 evaluation criterion.');
        return false;
      }
    }
    if (step === 7) {
      if (!startTime || !endTime) {
        setFormError('Please provide both start and end voting dates.');
        return false;
      }
      if (new Date(endTime) <= new Date(startTime)) {
        setFormError('End time must be after the start time.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, 9));
    }
  };

  const handleBack = () => {
    setFormError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Submission
  const handleCreateExercise = async (statusOverride?: ExerciseStatus) => {
    setSubmitting(true);
    setFormError('');
    try {
      const actor = {
        id: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'Church Administrator',
        email: userProfile?.email
      };

      const selectedOrg = organisations.find((o) => o.id === organisationId);
      const selectedDept = departments.find((d) => d.id === departmentId);
      const selectedUnit = units.find((u) => u.id === unitId);

      const exerciseOrgName =
        scopeType === 'church'
          ? 'Entire Church'
          : scopeType === 'workforce'
          ? 'Entire Workforce'
          : scopeType === 'custom'
          ? 'Custom Voting Group'
          : selectedOrg?.name || 'All Church';

      // Compute Voters To Assign strictly according to scope & selection mode
      let votersToAssign: Person[] = [];
      if (scopeType === 'department' || scopeType === 'unit' || scopeType === 'organisation') {
        if (voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom') {
          votersToAssign = scopedPeople.filter((p) => selectedVoterIds.includes(p.id));
          if (votersToAssign.length === 0) {
            votersToAssign = people.filter((p) => selectedVoterIds.includes(p.id));
          }
        } else {
          votersToAssign = scopedPeople;
        }
      } else if (voterSelectionMode === 'all_church') {
        votersToAssign = people;
      } else if (voterSelectionMode === 'all_workforce') {
        votersToAssign = people.filter((p) => p.workforceMember !== false);
      } else if (voterSelectionMode === 'scope_members') {
        votersToAssign = scopedPeople;
      } else if (voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom') {
        votersToAssign = people.filter((p) => selectedVoterIds.includes(p.id));
      } else {
        votersToAssign = scopedPeople.length > 0 ? scopedPeople : people;
      }

      const createdExercise = await createVotingExercise(
        {
          title: title.trim(),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
          description: description.trim(),
          scopeType,
          organisationId: scopeType === 'organisation' || scopeType === 'department' || scopeType === 'unit' ? organisationId : undefined,
          organisationName: exerciseOrgName,
          departmentId: scopeType === 'department' || scopeType === 'unit' ? departmentId : undefined,
          departmentName: scopeType === 'department' || scopeType === 'unit' ? selectedDept?.name : undefined,
          unitId: scopeType === 'unit' ? unitId : undefined,
          unitName: scopeType === 'unit' ? selectedUnit?.name : undefined,
          categoryName,
          status: statusOverride || initialStatus,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          resultsPublished: false,
          resultsVisibilityMode,
          allowSelfVote,
          maxVotesPerPerson,
          votingMode: 'single_choice',
          voterSelectionMode,
          nomineeSelectionMode,
          eligibleVotersCount: votersToAssign.length,
          criteria: criteria.filter((c) => c.active).map((c, idx) => ({
            title: c.title,
            description: c.description,
            order: idx + 1
          })),
          nominees: nominees.map((n, idx) => ({
            displayName: n.displayName,
            roleOrTitle: n.roleOrTitle,
            department: n.department || (selectedDept ? selectedDept.name : ''),
            organisationName: n.organisationName || exerciseOrgName,
            photoUrl: n.photoUrl,
            bio: n.bio,
            personId: n.personId,
            order: idx + 1
          }))
        },
        actor
      );

      if (votersToAssign.length > 0) {
        await assignEligibilityBatch(createdExercise.id, votersToAssign, actor);
      }

      notifyAction({
        type: 'create',
        title: 'Voting Exercise Published',
        details: `Voting exercise "${title.trim()}" has been configured and saved with ${nominees.length} nominee(s) and ${votersToAssign.length} eligible elector(s).`,
        resourceName: title.trim(),
        actorName: actor.name,
        data: {
          'Exercise Title': title.trim(),
          'Category': categoryName,
          'Scope Type': scopeType,
          'Nominees Registered': `${nominees.length} candidates`,
          'Eligible Electors': `${votersToAssign.length} electors`,
          'Status': statusOverride || initialStatus
        }
      });

      onSuccess(createdExercise.id);
    } catch (err: any) {
      console.error('Error creating voting exercise:', err);
      setFormError(err.message || 'Failed to save voting exercise. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Voting Scope' },
    { num: 3, label: 'Eligible Voters' },
    { num: 4, label: 'Nominees' },
    { num: 5, label: 'Criteria' },
    { num: 6, label: 'Rules' },
    { num: 7, label: 'Schedule' },
    { num: 8, label: 'Results' },
    { num: 9, label: 'Review' }
  ];

  const filteredVotersList = useMemo(() => {
    const baseList = (scopeType === 'department' || scopeType === 'unit' || scopeType === 'organisation')
      ? scopedPeople
      : people;

    const q = voterSearchQuery.toLowerCase().trim();
    if (!q) return baseList;
    return baseList.filter((p) => {
      return (
        p.fullName.toLowerCase().includes(q) ||
        (p.roleTitle && p.roleTitle.toLowerCase().includes(q)) ||
        (p.departmentName && p.departmentName.toLowerCase().includes(q)) ||
        (p.organisationName && p.organisationName.toLowerCase().includes(q)) ||
        p.voterCode.toLowerCase().includes(q)
      );
    });
  }, [people, scopedPeople, scopeType, voterSearchQuery]);

  return (
    <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-5xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF8A00] tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            Universal Church Voting CMS
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create Voting Exercise
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure dynamic scope, cross-organisation nominees, criteria, and schedule with zero code changes.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="self-start sm:self-auto px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700"
        >
          Cancel Builder
        </button>
      </div>

      {/* 9-Step Visual Stepper */}
      <div className="py-6 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[750px]">
          {stepsList.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer transition ${
                    isCurrent
                      ? 'text-[#FF8A00]'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-[#FF8A00] text-slate-950 ring-4 ring-[#FF8A00]/20 shadow-lg shadow-[#FF8A00]/20'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                  </div>
                  <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                    {s.label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-2 transition ${
                      step > idx + 1 ? 'bg-emerald-500/50' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {formError && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{formError}</span>
        </div>
      )}

      {/* Stepper Body */}
      <div className="py-6 min-h-[380px]">
        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 1 — Basic Information</h3>
              <p className="text-xs text-slate-400">Give your voting exercise an official title and recognition description.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Voting Exercise Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Most Outstanding Worker of the Year — 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Examples: "Most Outstanding Worker of the Year", "Best Performing Department", "Leader of the Year", "People’s Choice Award".
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Award / Recognition Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Excellence Awards, Monthly Recognition"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                  Initial Status
                </label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as ExerciseStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                >
                  <option value="open">Open (Active & ready for voting)</option>
                  <option value="scheduled">Scheduled (Opens automatically at start time)</option>
                  <option value="draft">Draft (Private admin review)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Description / Context for Voters
              </label>
              <textarea
                rows={3}
                placeholder="Describe the purpose, inspiration, and significance of this recognition..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Voting Scope */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 2 — Select Voting Scope</h3>
              <p className="text-xs text-slate-400">
                Define the institutional boundary of this voting exercise. Voting exercises are central entities and not rigidly locked.
              </p>
            </div>

            {/* Scope Restriction Banners for Scoped Roles */}
            {isOrgAdminRole && (
              <div className="p-3.5 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center gap-3 text-xs text-purple-200">
                <Shield className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <span className="font-semibold text-purple-100">Organisation Admin Scope:</span>
                  <span className="ml-1 text-purple-300">
                    You are strictly confined to creating voting exercises within your assigned organisation (<strong className="text-white">{adminUser?.organisationName || 'Your Organisation'}</strong>). Church-wide and workforce-wide voting cycles are restricted.
                  </span>
                </div>
              </div>
            )}
            {isDeptAdminRole && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-center gap-3 text-xs text-blue-200">
                <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-blue-100">Department Admin Scope:</span>
                  <span className="ml-1 text-blue-300">
                    You are strictly confined to creating voting exercises within your assigned department (<strong className="text-white">{adminUser?.departmentName || 'Your Department'}</strong>). Higher-level voting cycles are restricted.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Church Scope */}
              <div
                onClick={() => (!isOrgAdminRole && !isDeptAdminRole) && handleScopeChange('church')}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isOrgAdminRole || isDeptAdminRole
                    ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                    : scopeType === 'church'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20 cursor-pointer'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Globe className={`w-5 h-5 ${scopeType === 'church' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'church' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />
                    ) : (isOrgAdminRole || isDeptAdminRole) ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : null}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Entire Church</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Applies to the whole church congregation. e.g. "Church Member of the Year", "People's Choice".
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">
                  {isOrgAdminRole || isDeptAdminRole ? 'Restricted to Church Admin' : 'Scope: church'}
                </div>
              </div>

              {/* Workforce Scope */}
              <div
                onClick={() => (!isOrgAdminRole && !isDeptAdminRole) && handleScopeChange('workforce')}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isOrgAdminRole || isDeptAdminRole
                    ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                    : scopeType === 'workforce'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20 cursor-pointer'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Briefcase className={`w-5 h-5 ${scopeType === 'workforce' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'workforce' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />
                    ) : (isOrgAdminRole || isDeptAdminRole) ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : null}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Entire Workforce</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Applies church-wide across all organisations and departments. Nominees can come from any wing.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">
                  {isOrgAdminRole || isDeptAdminRole ? 'Restricted to Church Admin' : 'Scope: workforce'}
                </div>
              </div>

              {/* Organisation Scope */}
              <div
                onClick={() => !isDeptAdminRole && handleScopeChange('organisation')}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isDeptAdminRole
                    ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                    : scopeType === 'organisation'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20 cursor-pointer'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className={`w-5 h-5 ${scopeType === 'organisation' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'organisation' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />
                    ) : isDeptAdminRole ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : null}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Specific Organisation</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Confined to an organisation. e.g. "Most Outstanding Sanctuary Worker", "Media Worker of the Month".
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">
                  {isDeptAdminRole ? 'Restricted to Org/Church Admin' : 'Scope: organisation'}
                </div>
              </div>

              {/* Department Scope */}
              <div
                onClick={() => handleScopeChange('department')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  scopeType === 'department'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Layers className={`w-5 h-5 ${scopeType === 'department' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'department' && <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Specific Department</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Confined to a department within an organisation. e.g. "Most Outstanding Choir Member".
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">Scope: department</div>
              </div>

              {/* Unit Scope */}
              <div
                onClick={() => handleScopeChange('unit')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  scopeType === 'unit'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FolderTree className={`w-5 h-5 ${scopeType === 'unit' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'unit' && <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Specific Unit (Under Dept)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Confined to a specific unit under a department. e.g. "Lead Sound Engineer", "Soprano Section Leader".
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">Scope: unit</div>
              </div>

              {/* Custom Scope */}
              <div
                onClick={() => (!isOrgAdminRole && !isDeptAdminRole) && handleScopeChange('custom')}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  isOrgAdminRole || isDeptAdminRole
                    ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
                    : scopeType === 'custom'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20 cursor-pointer'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-600 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Sliders className={`w-5 h-5 ${scopeType === 'custom' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {scopeType === 'custom' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />
                    ) : (isOrgAdminRole || isDeptAdminRole) ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : null}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Custom Group</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Completely custom electorate and nominees without organisation/department dependencies.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">
                  {isOrgAdminRole || isDeptAdminRole ? 'Restricted to Church Admin' : 'Scope: custom'}
                </div>
              </div>
            </div>

            {/* Conditional Cascading Selectors */}
            {scopeType === 'organisation' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-4">
                <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider">
                  Select Organisation *
                </label>
                {isOrgAdminRole ? (
                  <div className="p-3 bg-slate-800/90 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white">{adminUser?.organisationName || selectedOrg?.name}</span>
                    </div>
                    <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
                      Scoped Boundary
                    </span>
                  </div>
                ) : (
                  <select
                    value={organisationId}
                    onChange={(e) => setOrganisationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                  >
                    <option value="">-- Choose Organisation --</option>
                    {organisations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {scopeType === 'department' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-2">
                    1. Parent Organisation *
                  </label>
                  {isOrgAdminRole || isDeptAdminRole ? (
                    <div className="p-3 bg-slate-800/90 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-center justify-between">
                      <span className="font-bold text-white">{adminUser?.organisationName || selectedOrg?.name}</span>
                      <span className="text-[10px] text-purple-300">Locked</span>
                    </div>
                  ) : (
                    <select
                      value={organisationId}
                      onChange={(e) => {
                        setOrganisationId(e.target.value);
                        setDepartmentId('');
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="">-- Choose Organisation --</option>
                      {organisations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-2">
                    2. Select Department *
                  </label>
                  {isDeptAdminRole ? (
                    <div className="p-3 bg-slate-800/90 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center justify-between">
                      <span className="font-bold text-white">{adminUser?.departmentName || selectedDept?.name}</span>
                      <span className="text-[10px] text-blue-300">Locked</span>
                    </div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={!organisationId}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00] disabled:opacity-50"
                    >
                      <option value="">-- Choose Department --</option>
                      {availableDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {scopeType === 'unit' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-2">
                    1. Organisation *
                  </label>
                  {isOrgAdminRole || isDeptAdminRole ? (
                    <div className="p-3 bg-slate-800/90 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-center justify-between">
                      <span className="font-bold text-white">{adminUser?.organisationName || selectedOrg?.name}</span>
                      <span className="text-[10px] text-purple-300">Locked</span>
                    </div>
                  ) : (
                    <select
                      value={organisationId}
                      onChange={(e) => {
                        setOrganisationId(e.target.value);
                        setDepartmentId('');
                        setUnitId('');
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="">-- Choose Organisation --</option>
                      {organisations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-2">
                    2. Department *
                  </label>
                  {isDeptAdminRole ? (
                    <div className="p-3 bg-slate-800/90 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center justify-between">
                      <span className="font-bold text-white">{adminUser?.departmentName || selectedDept?.name}</span>
                      <span className="text-[10px] text-blue-300">Locked</span>
                    </div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={(e) => {
                        setDepartmentId(e.target.value);
                        setUnitId('');
                      }}
                      disabled={!organisationId}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00] disabled:opacity-50"
                    >
                      <option value="">-- Choose Department --</option>
                      {availableDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#FF8A00] uppercase tracking-wider mb-2">
                    3. Select Specific Unit *
                  </label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    disabled={!departmentId}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00] disabled:opacity-50"
                  >
                    <option value="">-- All Units in Dept (or choose one) --</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(scopeType === 'church' || scopeType === 'workforce' || scopeType === 'custom') && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  No organisation or department lock required. Nominees and voters can be drawn freely across the church.
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Select Eligible Voters */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 3 — Select Eligible Voters</h3>
              <p className="text-xs text-slate-400">
                {scopeType === 'department'
                  ? `Specific Department Scope Active: Voters are restricted to verified workforce members of ${selectedDept?.name || 'the selected department'}.`
                  : scopeType === 'unit'
                  ? `Specific Unit Scope Active: Voters are restricted to verified workforce members of ${selectedUnit?.name || 'the selected unit'}.`
                  : scopeType === 'organisation'
                  ? `Organisation Scope Active: Voters are restricted to members of ${selectedOrg?.name || 'the selected organisation'}.`
                  : 'Specify who holds the right to vote in this exercise.'}
              </p>
            </div>

            {/* Department Scope Notice */}
            {scopeType === 'department' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#FF8A00] shrink-0" />
                  <span>
                    Department Scope Active: Only workers in <strong>{selectedDept?.name || 'selected department'}</strong> are eligible to vote.
                  </span>
                </div>
                <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-full text-[11px] border border-slate-700 shrink-0">
                  {scopedPeople.length} Elector(s) Found
                </span>
              </div>
            )}

            {/* Voter Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {!isOrgAdminRole && !isDeptAdminRole && (
                <>
                  <div
                    onClick={() => setVoterSelectionMode('all_workforce')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      voterSelectionMode === 'all_workforce'
                        ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">All Workforce Members</div>
                    <div className="text-[11px] text-slate-400 mt-1">Every active church worker across all units</div>
                  </div>

                  <div
                    onClick={() => setVoterSelectionMode('all_church')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      voterSelectionMode === 'all_church'
                        ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">All Church Members</div>
                    <div className="text-[11px] text-slate-400 mt-1">The entire verified church congregation</div>
                  </div>
                </>
              )}

              <div
                onClick={() => setVoterSelectionMode('scope_members')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  voterSelectionMode === 'scope_members'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold text-white">
                  {scopeType === 'department'
                    ? 'Department Members Only'
                    : scopeType === 'organisation'
                    ? 'Organisation Members Only'
                    : 'Scope Members Only'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {scopeType === 'department'
                    ? `Only verified workers in ${selectedDept?.name || 'this department'} (${scopedPeople.length})`
                    : scopeType === 'organisation'
                    ? `Only verified workers in ${selectedOrg?.name || 'this organisation'} (${scopedPeople.length})`
                    : 'Only workers inside selected Org / Dept'}
                </div>
              </div>

              <div
                onClick={() => setVoterSelectionMode('manual_selection')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold text-white">Manually Select Voters</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {isOrgAdminRole || isDeptAdminRole
                    ? 'Pick specific members from your scoped directory'
                    : 'Custom handpicked committee or voters'}
                </div>
              </div>
            </div>

            {/* Manual Selection Table */}
            {(voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom') && (
              <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder={scopeType === 'department' ? `Search ${selectedDept?.name || 'department'} workers...` : "Search people by name, role, unit..."}
                      value={voterSearchQuery}
                      onChange={(e) => setVoterSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <span className="text-slate-400">
                      Selected: <strong className="text-[#FF8A00]">{selectedVoterIds.length}</strong> of {filteredVotersList.length}
                    </span>
                    <button
                      onClick={() => handleSelectAllFilteredVoters(filteredVotersList)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 cursor-pointer"
                    >
                      Select Filtered
                    </button>
                    <button
                      onClick={handleClearSelectedVoters}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800">
                  {filteredVotersList.map((p) => {
                    const isSelected = selectedVoterIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleVoterSelection(p.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                          isSelected ? 'bg-slate-800 border border-[#FF8A00]/40' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-[#FF8A00] focus:ring-0"
                          />
                          <div>
                            <div className="text-xs font-medium text-white">{p.fullName}</div>
                            <div className="text-[11px] text-slate-400">
                              {p.roleTitle || 'Worker'} • {p.organisationName || 'Church Wide'} • {p.departmentName || 'General'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{p.voterCode}</span>
                      </div>
                    );
                  })}
                  {filteredVotersList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {scopeType === 'department'
                        ? `No workers in ${selectedDept?.name || 'this department'} match the search query.`
                        : 'No people match your search query.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {voterSelectionMode !== 'manual_selection' && voterSelectionMode !== 'custom' && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>Estimated eligible voters from registry:</span>
                <span className="text-base font-bold text-[#FF8A00]">
                  {scopeType === 'department'
                    ? `${scopedPeople.length} Verified Department Workers (${selectedDept?.name || 'Department'})`
                    : scopeType === 'unit'
                    ? `${scopedPeople.length} Verified Unit Workers (${selectedUnit?.name || 'Unit'})`
                    : scopeType === 'organisation'
                    ? `${scopedPeople.length} Verified Organisation Workers (${selectedOrg?.name || 'Organisation'})`
                    : `${people.length} Verified Church Workers`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Define Nominees */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">Step 4 — Define Eligible Nominees</h3>
                <p className="text-xs text-slate-400">
                  {scopeType === 'department'
                    ? `Department Scope Active: Eligible nominees are restricted to members of ${selectedDept?.name || 'the selected department'}.`
                    : scopeType === 'unit'
                    ? `Unit Scope Active: Eligible nominees are restricted to members of ${selectedUnit?.name || 'the selected unit'}.`
                    : scopeType === 'organisation'
                    ? `Organisation Scope Active: Eligible nominees are restricted to members of ${selectedOrg?.name || 'the selected organisation'}.`
                    : 'Add eligible candidates who can be voted for in this exercise.'}
                </p>
              </div>
              <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300">
                Current Nominees: <strong className="text-[#FF8A00]">{nominees.length}</strong>
              </div>
            </div>

            {/* Department Scope Nominee Banner */}
            {scopeType === 'department' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF8A00] shrink-0" />
                  <span>
                    <strong>Department Scope:</strong> Nominees must belong to <strong>{selectedDept?.name || 'the selected department'}</strong> ({nomineeCandidatePool.length} candidate(s) available in directory).
                  </span>
                </div>
                {nomineeCandidatePool.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNominateAllScoped}
                    className="px-3 py-1.5 bg-[#FF8A00] hover:bg-[#e67c00] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nominate All {nomineeCandidatePool.length} Department Members</span>
                  </button>
                )}
              </div>
            )}

            {/* Nominee Entry Mode */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setNomineeFormMode('from_database')}
                  className={`text-xs font-semibold pb-1 border-b-2 transition ${
                    nomineeFormMode === 'from_database'
                      ? 'border-[#FF8A00] text-[#FF8A00]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {scopeType === 'department'
                    ? `Select from ${selectedDept?.name || 'Department'} Members`
                    : 'Select from Church People Database'}
                </button>
                <button
                  onClick={() => {
                    setNomineeFormMode('custom_entry');
                    if (selectedDept && !customNomineeDept) {
                      setCustomNomineeDept(selectedDept.name);
                    }
                    if (selectedOrg && !customNomineeOrg) {
                      setCustomNomineeOrg(selectedOrg.name);
                    }
                  }}
                  className={`text-xs font-semibold pb-1 border-b-2 transition ${
                    nomineeFormMode === 'custom_entry'
                      ? 'border-[#FF8A00] text-[#FF8A00]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Enter Custom / External Nominee
                </button>
              </div>

              {nomineeFormMode === 'from_database' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {scopeType === 'department'
                        ? `Choose ${selectedDept?.name || 'Department'} Member to Nominate`
                        : 'Choose Person to Nominate'}
                    </label>
                    <select
                      value={selectedNomineePersonId}
                      onChange={(e) => setSelectedNomineePersonId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    >
                      <option value="">
                        {nomineeCandidatePool.length === 0
                          ? `-- No workers found in ${selectedDept?.name || 'this department'} --`
                          : `-- Select ${scopeType === 'department' ? (selectedDept?.name || 'Department') + ' Member' : 'Person'} --`}
                      </option>
                      {nomineeCandidatePool.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.roleTitle || 'Worker'} • {p.departmentName || (selectedDept?.name || 'Dept')})
                        </option>
                      ))}
                    </select>
                    {selectedNomineePersonId && (() => {
                      const p = nomineeCandidatePool.find((x) => x.id === selectedNomineePersonId) || people.find((x) => x.id === selectedNomineePersonId);
                      if (!p) return null;
                      return (
                        <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-700/80 flex items-center gap-2.5 text-xs">
                          {p.photoUrl || p.avatarUrl ? (
                            <img
                              src={p.photoUrl || p.avatarUrl}
                              alt={p.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-[#FF8A00]/40 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#251464] border border-[#FF8A00]/30 text-[#FF8A00] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {p.fullName.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 truncate">
                            <span className="font-semibold text-white">{p.fullName}</span>
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              • {p.photoUrl ? 'Photo loaded from Member Profile' : 'No photo on member profile (uses fallback)'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {nomineeCandidatePool.length === 0 && scopeType === 'department' && (
                      <div className="text-[11px] text-amber-400/90 mt-1.5">
                        No members currently registered under {selectedDept?.name} in the church directory. You can use &ldquo;Enter Custom / External Nominee&rdquo; above to add candidates.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddNominee}
                    disabled={!selectedNomineePersonId}
                    className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E85B00] disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add to Nominees
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nominee Full Name *"
                      value={customNomineeName}
                      onChange={(e) => setCustomNomineeName(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    />
                    <input
                      type="text"
                      placeholder="Role / Title (e.g. Lead Keyboardist)"
                      value={customNomineeRole}
                      onChange={(e) => setCustomNomineeRole(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    />
                    <input
                      type="text"
                      placeholder="Organisation (e.g. Music Organisation)"
                      value={customNomineeOrg || (selectedOrg ? selectedOrg.name : '')}
                      onChange={(e) => setCustomNomineeOrg(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    />
                    <input
                      type="text"
                      placeholder="Department (e.g. Choir)"
                      value={customNomineeDept || (selectedDept ? selectedDept.name : '')}
                      onChange={(e) => setCustomNomineeDept(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Photo URL (Optional image link)"
                        value={customNomineePhoto}
                        onChange={(e) => setCustomNomineePhoto(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                      />
                    </div>
                    <button
                      onClick={handleAddNominee}
                      disabled={!customNomineeName.trim()}
                      className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E85B00] disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Custom Nominee
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nominees List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Current Nominees ({nominees.length})
              </div>
              {nominees.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  {scopeType === 'department'
                    ? `No nominees added yet. Select members from ${selectedDept?.name || 'the department'} above.`
                    : 'No nominees added yet. Add candidates from the church database or custom entries above.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nominees.map((n, idx) => (
                    <div
                      key={n.id}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3 relative group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={n.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={n.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">{n.displayName}</div>
                          <div className="text-[11px] text-slate-400">{n.roleOrTitle}</div>
                          <div className="text-[10px] text-[#FF8A00]">{n.organisationName || n.department || 'All Church'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveNominee(n.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Remove Nominee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Create Voting Criteria */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 5 — Create Dynamic Voting Criteria</h3>
              <p className="text-xs text-slate-400">
                Evaluation criteria are completely dynamic. Add, edit, or toggle criteria for voters to consider.
              </p>
            </div>

            {/* Add New Criterion Form */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
              <div className="text-xs font-semibold text-[#FF8A00] uppercase tracking-wider">
                + Add Custom Criterion
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <input
                    type="text"
                    placeholder="Criterion Title (e.g. Leadership & Initiative)"
                    value={newCritTitle}
                    onChange={(e) => setNewCritTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Brief description / guidance for voters"
                    value={newCritDesc}
                    onChange={(e) => setNewCritDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8A00]"
                  />
                </div>
                <button
                  onClick={handleAddCriterion}
                  disabled={!newCritTitle.trim()}
                  className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E85B00] disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Criterion
                </button>
              </div>
            </div>

            {/* Criteria List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Criteria ({criteria.filter((c) => c.active).length} of {criteria.length})
              </div>
              <div className="space-y-2">
                {criteria.map((c, idx) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      c.active ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{c.title}</div>
                        {c.description && <div className="text-[11px] text-slate-400 mt-0.5">{c.description}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCriterionActive(c.id)}
                        className={`text-[11px] px-2.5 py-1 rounded border transition ${
                          c.active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {c.active ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleRemoveCriterion(c.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Voting Rules */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 6 — Voting Rules</h3>
              <p className="text-xs text-slate-400">Configure voting integrity constraints and self-voting rules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allow Self-Voting */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-5 h-5 text-[#FF8A00]" />
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        allowSelfVote
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {allowSelfVote ? 'Self-Voting Allowed' : 'Self-Voting Blocked'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Allow Self-Voting?</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    When disabled, nominees cannot vote for themselves. The system matches person IDs during vote submission.
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setAllowSelfVote(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      !allowSelfVote
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    No (Recommended)
                  </button>
                  <button
                    onClick={() => setAllowSelfVote(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      allowSelfVote
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Maximum Votes Per Person */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Vote className="w-5 h-5 text-[#FF8A00]" />
                    <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full text-slate-300 font-mono font-bold">
                      1 Person = 1 Vote
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Maximum Votes Per Person</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Each voter can cast exactly one ballot per voting exercise. Enforced server-side via Firestore transactions.
                  </p>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                  Enforced via atomic database transaction and double-vote validation.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Voting Schedule */}
        {step === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 7 — Voting Schedule</h3>
              <p className="text-xs text-slate-400">
                Configure start and end voting periods. Backend validation uses authoritative server time (Africa/Lagos reference).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#FF8A00]" /> Voting Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FF8A00]" /> Voting End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF8A00]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Administrative Display Timezone:</span>
              <span className="font-mono text-[#FF8A00] font-semibold">Africa/Lagos (WAT, UTC+1)</span>
            </div>
          </div>
        )}

        {/* STEP 8: Results Settings */}
        {step === 8 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 8 — Results Settings</h3>
              <p className="text-xs text-slate-400">Control when and how election results become visible to church members.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setResultsVisibilityMode('admin_only')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  resultsVisibilityMode === 'admin_only'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Lock className={`w-5 h-5 ${resultsVisibilityMode === 'admin_only' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {resultsVisibilityMode === 'admin_only' && <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Admin Only</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Results remain completely hidden from normal voters until an administrator explicitly publishes.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">Visibility: admin_only</div>
              </div>

              <div
                onClick={() => setResultsVisibilityMode('publish_after_close')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  resultsVisibilityMode === 'publish_after_close'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Clock className={`w-5 h-5 ${resultsVisibilityMode === 'publish_after_close' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {resultsVisibilityMode === 'publish_after_close' && <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Publish After Close</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Results automatically become visible in the public results hall once voting time expires.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">Visibility: publish_after_close</div>
              </div>

              <div
                onClick={() => setResultsVisibilityMode('manual_publish')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  resultsVisibilityMode === 'manual_publish'
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00] ring-2 ring-[#FF8A00]/20'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Eye className={`w-5 h-5 ${resultsVisibilityMode === 'manual_publish' ? 'text-[#FF8A00]' : 'text-slate-400'}`} />
                    {resultsVisibilityMode === 'manual_publish' && <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" />}
                  </div>
                  <h4 className="text-sm font-semibold text-white">Manual Publish</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Allows leadership review, tie verification, and ceremonial announcement before unveiling.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-[#FF8A00]">Visibility: manual_publish</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 9: Review & Create */}
        {step === 9 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Step 9 — Review and Launch</h3>
              <p className="text-xs text-slate-400">Review complete configuration summary before creating the voting exercise.</p>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#FF8A00] uppercase tracking-wider">
                    {categoryName} • Scope: {scopeType.toUpperCase()}
                  </span>
                  <h4 className="text-xl font-bold text-white mt-0.5">{title}</h4>
                  {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
                </div>
                <span className="self-start sm:self-auto px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 uppercase">
                  {initialStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">Voting Scope</div>
                  <div className="font-semibold text-white capitalize">
                    {scopeType === 'department'
                      ? `Dept: ${selectedDept?.name || 'Selected'}`
                      : scopeType === 'unit'
                      ? `Unit: ${selectedUnit?.name || 'Selected'}`
                      : scopeType === 'organisation'
                      ? `Org: ${selectedOrg?.name || 'Selected'}`
                      : scopeType}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Eligible Voters</div>
                  <div className="font-semibold text-white">
                    {voterSelectionMode === 'manual_selection' || voterSelectionMode === 'custom'
                      ? `${selectedVoterIds.length} Selected Electors`
                      : scopeType === 'department'
                      ? `${scopedPeople.length} Department Members`
                      : scopeType === 'unit'
                      ? `${scopedPeople.length} Unit Members`
                      : scopeType === 'organisation'
                      ? `${scopedPeople.length} Organisation Members`
                      : `${people.length} Church Members`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Nominees Count</div>
                  <div className="font-semibold text-white">{nominees.length} Nominees</div>
                </div>
                <div>
                  <div className="text-slate-500">Active Criteria</div>
                  <div className="font-semibold text-white">{criteria.filter((c) => c.active).length} Criteria</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-slate-800 pt-4">
                <div>
                  <div className="text-slate-500">Voting Timeline</div>
                  <div className="text-slate-300 mt-0.5">
                    Start: {new Date(startTime).toLocaleString()}
                    <br />
                    End: {new Date(endTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Rules & Results</div>
                  <div className="text-slate-300 mt-0.5">
                    Self-Voting: {allowSelfVote ? 'Allowed' : 'Disallowed'}
                    <br />
                    Results: {resultsVisibilityMode.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition"
          >
            Cancel
          </button>
        )}

        <div className="flex items-center gap-2">
          {step < 9 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#FF8A00] hover:bg-[#E85B00] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#FF8A00]/20 transition"
            >
              Continue to Step {step + 1} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCreateExercise('draft')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleCreateExercise()}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:opacity-90 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#FF8A00]/20 transition disabled:opacity-50"
              >
                {submitting ? 'Creating Exercise...' : 'Launch Voting Exercise'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
